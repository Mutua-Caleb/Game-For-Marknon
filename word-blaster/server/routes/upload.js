import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import * as XLSX from 'xlsx'
import { getDb } from '../db.js'
import { authenticateToken } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${uuidv4()}${ext}`
    cb(null, name)
  }
})

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed.'), false)
  }
}

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

// Configure multer for Excel uploads (in memory)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    const allowedExts = ['.xlsx', '.xls', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed.'), false)
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// POST /api/upload/image - Upload an image
router.post('/image', authenticateToken, imageUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' })
    }

    const imageUrl = `/api/uploads/${req.file.filename}`

    res.json({
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    })
  } catch (err) {
    console.error('Image upload error:', err)
    res.status(500).json({ error: 'Failed to upload image.' })
  }
})

// POST /api/upload/excel - Import questions from Excel
router.post('/excel', authenticateToken, excelUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file provided.' })
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty or has no data rows.' })
    }

    // Map Excel columns to question fields
    // Expected columns: Subject, Topic, Question, Answer, Type, Option1, Option2, Option3, Option4, Hint, Image
    const questions = []
    const errors = []

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNum = i + 2 // +2 for header row and 1-based indexing

      // Try to find columns case-insensitively
      const getValue = (keys) => {
        for (const key of keys) {
          for (const col of Object.keys(row)) {
            if (col.toLowerCase().trim() === key.toLowerCase()) {
              return String(row[col]).trim()
            }
          }
        }
        return ''
      }

      const subject = getValue(['subject', 'Subject'])
      const topic = getValue(['topic', 'Topic'])
      const question = getValue(['question', 'Question'])
      const answer = getValue(['answer', 'Answer'])
      const type = getValue(['type', 'Type']).toLowerCase() || 'text'
      const hint = getValue(['hint', 'Hint'])
      const image = getValue(['image', 'Image', 'image_url', 'Image URL'])

      // Get options
      const opt1 = getValue(['option1', 'Option1', 'option 1', 'Option 1'])
      const opt2 = getValue(['option2', 'Option2', 'option 2', 'Option 2'])
      const opt3 = getValue(['option3', 'Option3', 'option 3', 'Option 3'])
      const opt4 = getValue(['option4', 'Option4', 'option 4', 'Option 4'])
      const optionsCol = getValue(['options', 'Options'])

      if (!subject || !topic || !question || !answer) {
        errors.push({ row: rowNum, error: 'Missing required fields (Subject, Topic, Question, Answer)' })
        continue
      }

      let options = null
      if (type === 'multiple') {
        if (optionsCol) {
          // Try to parse comma-separated options
          options = optionsCol.split(',').map(o => o.trim()).filter(o => o)
        } else if (opt1 || opt2) {
          options = [opt1, opt2, opt3, opt4].filter(o => o)
        }

        if (!options || options.length < 2) {
          errors.push({ row: rowNum, error: 'Multiple choice questions need at least 2 options' })
          continue
        }
      }

      questions.push({
        id: uuidv4(),
        subject,
        topic,
        question,
        answer,
        type: type === 'multiple' ? 'multiple' : 'text',
        options,
        hint: hint || null,
        image: image || null
      })
    }

    // Insert valid questions into DB
    if (questions.length > 0) {
      const db = getDb()
      const insert = db.prepare(`
        INSERT INTO questions (id, subject, topic, question, answer, type, options, hint, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertStats = db.prepare('INSERT INTO question_stats (question_id, correct, wrong) VALUES (?, 0, 0)')

      const insertMany = db.transaction((questions) => {
        for (const q of questions) {
          insert.run(q.id, q.subject, q.topic, q.question, q.answer, q.type, q.options ? JSON.stringify(q.options) : null, q.hint, q.image)
          insertStats.run(q.id)
        }
      })

      insertMany(questions)
    }

    res.json({
      imported: questions.length,
      errors,
      total: rawData.length,
      message: `Successfully imported ${questions.length} of ${rawData.length} questions.`
    })
  } catch (err) {
    console.error('Excel import error:', err)
    res.status(500).json({ error: 'Failed to parse Excel file. Please check the format.' })
  }
})

// DELETE /api/upload/image/:filename - Delete an uploaded image
router.delete('/image/:filename', authenticateToken, (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'uploads', req.params.filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found.' })
    }

    fs.unlinkSync(filePath)
    res.json({ message: 'Image deleted successfully.' })
  } catch (err) {
    console.error('Delete image error:', err)
    res.status(500).json({ error: 'Failed to delete image.' })
  }
})

// GET /api/upload/template - Download Excel template
router.get('/template', (req, res) => {
  const templateData = [
    { Subject: 'Science', Topic: 'Physics', Question: 'What force keeps us on the ground?', Answer: 'gravity', Type: 'text', Option1: '', Option2: '', Option3: '', Option4: '', Hint: 'Newton discovered it', Image: '' },
    { Subject: 'English', Topic: 'Vocabulary', Question: 'What word means "very big"?', Answer: 'huge', Type: 'multiple', Option1: 'Tiny', Option2: 'Huge', Option3: 'Small', Option4: 'Little', Hint: 'Like an elephant', Image: '' }
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(templateData)

  // Set column widths
  worksheet['!cols'] = [
    { width: 12 }, // Subject
    { width: 15 }, // Topic
    { width: 50 }, // Question
    { width: 20 }, // Answer
    { width: 10 }, // Type
    { width: 15 }, // Option1
    { width: 15 }, // Option2
    { width: 15 }, // Option3
    { width: 15 }, // Option4
    { width: 30 }, // Hint
    { width: 30 }  // Image
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=word-blaster-template.xlsx')
  res.send(Buffer.from(buffer))
})

export default router
