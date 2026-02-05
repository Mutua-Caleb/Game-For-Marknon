import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { initializeDatabase } from './db.js'
import authRoutes from './routes/auth.js'
import questionRoutes from './routes/questions.js'
import uploadRoutes from './routes/upload.js'
import statsRoutes from './routes/stats.js'
import sequenceRoutes from './routes/sequences.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve uploaded images
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/sequences', sequenceRoutes)

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))

  // SPA fallback - serve index.html for all non-API routes
  app.get('{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Maximum size is 5MB for images, 10MB for Excel files.' })
  }

  if (err.message && err.message.includes('Only')) {
    return res.status(400).json({ error: err.message })
  }

  res.status(500).json({ error: 'Internal server error.' })
})

// Initialize DB and start server
async function start() {
  try {
    await initializeDatabase()
    console.log('Database initialized successfully.')
  } catch (err) {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`Word Blaster server running on port ${PORT}`)
    console.log(`API available at http://localhost:${PORT}/api`)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Frontend dev server expected at http://localhost:5173`)
    }
  })
}

start()

export default app
