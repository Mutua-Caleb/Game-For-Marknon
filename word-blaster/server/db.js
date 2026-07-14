import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg

let pool

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      console.error('DATABASE_URL environment variable is required.')
      console.error('Set it to your PostgreSQL connection string, e.g.:')
      console.error('  postgresql://user:password@localhost:5432/wordblaster')
      process.exit(1)
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err)
    })
  }
  return pool
}

export async function initializeDatabase() {
  const p = getPool()

  await p.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      hint TEXT,
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS question_stats (
      question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
      correct INTEGER DEFAULT 0,
      wrong INTEGER DEFAULT 0,
      last_attempted TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id SERIAL PRIMARY KEY,
      player_name TEXT DEFAULT 'Anonymous',
      subject TEXT,
      topics TEXT,
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      played_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sequence_questions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sequence_steps (
      id SERIAL PRIMARY KEY,
      sequence_id TEXT NOT NULL REFERENCES sequence_questions(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      step_text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id SERIAL PRIMARY KEY,
      player_name TEXT DEFAULT 'Anonymous',
      subject TEXT,
      topics TEXT,
      game_mode TEXT DEFAULT 'quiz',
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      tab_switches INTEGER DEFAULT 0,
      min_time_required INTEGER DEFAULT 900,
      duration_seconds INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      completed BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS quiz_session_answers (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      question_id TEXT,
      question_text TEXT,
      correct_answer TEXT,
      given_answer TEXT,
      is_correct BOOLEAN,
      time_taken_ms INTEGER,
      answered_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_tab_events (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS diagram_questions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS diagram_labels (
      id SERIAL PRIMARY KEY,
      diagram_id TEXT NOT NULL REFERENCES diagram_questions(id) ON DELETE CASCADE,
      label_key TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      hint TEXT
    );

    -- Learner Accounts: Simple login with name + PIN
    CREATE TABLE IF NOT EXISTS learner_accounts (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      pin TEXT NOT NULL,
      daily_required_minutes INTEGER DEFAULT 30,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Daily Quiz Time: Track minutes spent per day per learner
    CREATE TABLE IF NOT EXISTS daily_quiz_time (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      quiz_date DATE NOT NULL DEFAULT CURRENT_DATE,
      minutes_completed REAL DEFAULT 0,
      sessions_count INTEGER DEFAULT 0,
      last_updated TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(learner_id, quiz_date)
    );

    -- Spaced Repetition: Track per-learner question performance
    CREATE TABLE IF NOT EXISTS learner_progress (
      id SERIAL PRIMARY KEY,
      learner_id TEXT NOT NULL,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review TIMESTAMPTZ DEFAULT NOW(),
      last_reviewed TIMESTAMPTZ,
      consecutive_correct INTEGER DEFAULT 0,
      total_attempts INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      UNIQUE(learner_id, question_id)
    );

    -- Topic Mastery: Track mastery percentage per topic per learner
    CREATE TABLE IF NOT EXISTS topic_mastery (
      id SERIAL PRIMARY KEY,
      learner_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      questions_attempted INTEGER DEFAULT 0,
      questions_mastered INTEGER DEFAULT 0,
      mastery_percentage REAL DEFAULT 0,
      last_practiced TIMESTAMPTZ,
      unlocked BOOLEAN DEFAULT FALSE,
      UNIQUE(learner_id, subject, topic)
    );

    -- Learner Earnings: Track money earned from verified focus blocks
    CREATE TABLE IF NOT EXISTS learner_earnings (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
      amount_ksh REAL DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      quiz_correct_answers INTEGER DEFAULT 0,
      chemistry_correct_answers INTEGER DEFAULT 0,
      focus_minutes REAL DEFAULT 0,
      focus_blocks INTEGER DEFAULT 0,
      paid BOOLEAN DEFAULT FALSE,
      paid_at TIMESTAMPTZ,
      last_updated TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(learner_id, earning_date)
    );

    CREATE TABLE IF NOT EXISTS learner_focus_daily (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      focus_date DATE NOT NULL DEFAULT CURRENT_DATE,
      subject TEXT NOT NULL,
      client_active_ms BIGINT DEFAULT 0,
      verified_active_ms BIGINT DEFAULT 0,
      rewarded_blocks INTEGER DEFAULT 0,
      last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
      last_updated TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(learner_id, focus_date, subject)
    );

    CREATE TABLE IF NOT EXISTS chemistry_progress (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      best_score REAL DEFAULT 0,
      passed BOOLEAN DEFAULT FALSE,
      attempts_count INTEGER DEFAULT 0,
      last_attempted TIMESTAMPTZ,
      UNIQUE(learner_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS chemistry_attempts (
      id UUID PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      questions_json JSONB NOT NULL,
      quiz_session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE SET NULL,
      score_percent REAL DEFAULT 0,
      passed BOOLEAN DEFAULT FALSE,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS chemistry_attempt_answers (
      id SERIAL PRIMARY KEY,
      attempt_id UUID NOT NULL REFERENCES chemistry_attempts(id) ON DELETE CASCADE,
      question_index INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      learner_answer TEXT NOT NULL,
      expected_answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      mark_score REAL DEFAULT 0,
      feedback TEXT,
      missing_points JSONB DEFAULT '[]'::jsonb,
      mark_source TEXT DEFAULT 'rubric',
      time_taken_ms INTEGER DEFAULT 0,
      reward_ksh REAL DEFAULT 0,
      answered_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(attempt_id, question_index)
    );

    CREATE TABLE IF NOT EXISTS chemistry_card_progress (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      fact_id TEXT NOT NULL,
      repetitions INTEGER DEFAULT 0,
      interval_days INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_wrong INTEGER DEFAULT 0,
      next_review TIMESTAMPTZ DEFAULT NOW(),
      last_reviewed TIMESTAMPTZ,
      UNIQUE(learner_id, lesson_id, fact_id)
    );

    -- Topic Prerequisites: Define which topics must be mastered before others
    CREATE TABLE IF NOT EXISTS topic_prerequisites (
      id SERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      prerequisite_topic TEXT NOT NULL,
      required_mastery REAL DEFAULT 80,
      UNIQUE(subject, topic, prerequisite_topic)
    );

    -- Reading Passages: Long text passages with comprehension questions
    CREATE TABLE IF NOT EXISTS passages (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS passage_questions (
      id SERIAL PRIMARY KEY,
      passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      hint TEXT
    );

    -- Writing Prompts: Questions/tasks for handwriting practice
    CREATE TABLE IF NOT EXISTS writing_prompts (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      guide_lines BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Writing Submissions: Stores stroke data from canvas
    CREATE TABLE IF NOT EXISTS writing_submissions (
      id SERIAL PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES writing_prompts(id) ON DELETE CASCADE,
      learner_id INTEGER NOT NULL REFERENCES learner_accounts(id) ON DELETE CASCADE,
      strokes_data JSONB NOT NULL,
      thumbnail TEXT,
      admin_rating INTEGER,
      admin_feedback TEXT,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Create indexes if they don't exist
  await p.query(`
    CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
    CREATE INDEX IF NOT EXISTS idx_question_stats_wrong ON question_stats(wrong DESC);
    CREATE INDEX IF NOT EXISTS idx_sequence_questions_subject ON sequence_questions(subject);
    CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_sessions_started ON quiz_sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_quiz_session_answers_session ON quiz_session_answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_tab_events_session ON quiz_tab_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_diagram_questions_subject ON diagram_questions(subject);
    CREATE INDEX IF NOT EXISTS idx_diagram_labels_diagram ON diagram_labels(diagram_id);
    CREATE INDEX IF NOT EXISTS idx_learner_accounts_name ON learner_accounts(name);
    CREATE INDEX IF NOT EXISTS idx_daily_quiz_time_learner ON daily_quiz_time(learner_id);
    CREATE INDEX IF NOT EXISTS idx_daily_quiz_time_date ON daily_quiz_time(quiz_date);
    CREATE INDEX IF NOT EXISTS idx_learner_progress_learner ON learner_progress(learner_id);
    CREATE INDEX IF NOT EXISTS idx_learner_progress_next_review ON learner_progress(next_review);
    CREATE INDEX IF NOT EXISTS idx_topic_mastery_learner ON topic_mastery(learner_id);
    CREATE INDEX IF NOT EXISTS idx_topic_prerequisites_topic ON topic_prerequisites(subject, topic);
    CREATE INDEX IF NOT EXISTS idx_learner_earnings_learner ON learner_earnings(learner_id);
    CREATE INDEX IF NOT EXISTS idx_learner_earnings_date ON learner_earnings(earning_date);
    CREATE INDEX IF NOT EXISTS idx_learner_earnings_unpaid ON learner_earnings(learner_id, paid);
    CREATE INDEX IF NOT EXISTS idx_learner_focus_daily_learner ON learner_focus_daily(learner_id, focus_date);
    CREATE INDEX IF NOT EXISTS idx_chemistry_progress_learner ON chemistry_progress(learner_id);
    CREATE INDEX IF NOT EXISTS idx_chemistry_attempts_learner ON chemistry_attempts(learner_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chemistry_answers_attempt ON chemistry_attempt_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_chemistry_card_due ON chemistry_card_progress(learner_id, next_review);
    CREATE INDEX IF NOT EXISTS idx_passages_subject ON passages(subject);
    CREATE INDEX IF NOT EXISTS idx_passage_questions_passage ON passage_questions(passage_id);
    CREATE INDEX IF NOT EXISTS idx_writing_prompts_subject ON writing_prompts(subject);
    CREATE INDEX IF NOT EXISTS idx_writing_submissions_prompt ON writing_submissions(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_writing_submissions_learner ON writing_submissions(learner_id);
  `)

  await p.query('ALTER TABLE learner_earnings ADD COLUMN IF NOT EXISTS quiz_correct_answers INTEGER DEFAULT 0')
  await p.query('ALTER TABLE learner_earnings ADD COLUMN IF NOT EXISTS chemistry_correct_answers INTEGER DEFAULT 0')
  await p.query('ALTER TABLE learner_earnings ADD COLUMN IF NOT EXISTS focus_minutes REAL DEFAULT 0')
  await p.query('ALTER TABLE learner_earnings ADD COLUMN IF NOT EXISTS focus_blocks INTEGER DEFAULT 0')
  await p.query(`
    UPDATE learner_earnings
    SET quiz_correct_answers = correct_answers
    WHERE quiz_correct_answers = 0 AND chemistry_correct_answers = 0 AND correct_answers > 0
  `)

  // The Chemistry Academy replaces every legacy general-Science activity.
  await p.query("DELETE FROM writing_prompts WHERE subject = 'Science'")
  await p.query("DELETE FROM passages WHERE subject = 'Science'")
  await p.query("DELETE FROM diagram_questions WHERE subject = 'Science'")
  await p.query("DELETE FROM sequence_questions WHERE subject = 'Science'")
  await p.query("DELETE FROM topic_mastery WHERE subject = 'Science'")
  await p.query("DELETE FROM topic_prerequisites WHERE subject = 'Science'")
  await p.query("DELETE FROM questions WHERE subject = 'Science'")

  // Seed default admin if none exists
  const adminResult = await p.query('SELECT COUNT(*) as count FROM admin_users')
  if (parseInt(adminResult.rows[0].count) === 0) {
    const hash = bcrypt.hashSync('TeacherAdmin2024!', 10)
    await p.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', ['admin', hash])
  }

  // Seed default questions if none exist
  const questionResult = await p.query('SELECT COUNT(*) as count FROM questions')
  if (parseInt(questionResult.rows[0].count) === 0) {
    await seedDefaultQuestions(p)
  }

  // Seed default sequences if none exist
  const seqResult = await p.query('SELECT COUNT(*) as count FROM sequence_questions')
  if (parseInt(seqResult.rows[0].count) === 0) {
    await seedDefaultSequences(p)
  }

  // Seed default diagrams if none exist
  const diagResult = await p.query('SELECT COUNT(*) as count FROM diagram_questions')
  if (parseInt(diagResult.rows[0].count) === 0) {
    await seedDefaultDiagrams(p)
  }

  // Seed default topic prerequisites if none exist
  const prereqResult = await p.query('SELECT COUNT(*) as count FROM topic_prerequisites')
  if (parseInt(prereqResult.rows[0].count) === 0) {
    await seedDefaultPrerequisites(p)
  }

  // Seed default writing prompts if none exist
  const writingResult = await p.query('SELECT COUNT(*) as count FROM writing_prompts')
  if (parseInt(writingResult.rows[0].count) === 0) {
    await seedDefaultWritingPrompts(p)
  }

  // Drop coordinate columns (labels are now pre-drawn on images)
  await p.query("ALTER TABLE diagram_labels DROP COLUMN IF EXISTS x_percent").catch(() => {})
  await p.query("ALTER TABLE diagram_labels DROP COLUMN IF EXISTS y_percent").catch(() => {})
  await p.query("ALTER TABLE diagram_labels DROP COLUMN IF EXISTS pointer_x").catch(() => {})
  await p.query("ALTER TABLE diagram_labels DROP COLUMN IF EXISTS pointer_y").catch(() => {})
}

async function seedDefaultPrerequisites(p) {
  // Define topic learning paths
  // English: Vocabulary is foundational, then Spelling, then Grammar, then Reading
  const prerequisites = [
    // English path - Spelling requires Vocabulary
    { subject: 'English', topic: 'Spelling', prerequisite_topic: 'Vocabulary', required_mastery: 60 },
    // Grammar requires Spelling
    { subject: 'English', topic: 'Grammar', prerequisite_topic: 'Spelling', required_mastery: 60 },
    // Reading requires Grammar
    { subject: 'English', topic: 'Reading', prerequisite_topic: 'Grammar', required_mastery: 60 },

    // CRE path - New Testament after Old Testament
    { subject: 'Christian Religious Education', topic: 'New Testament', prerequisite_topic: 'Old Testament', required_mastery: 60 },
    { subject: 'Christian Religious Education', topic: 'Christian Living', prerequisite_topic: 'New Testament', required_mastery: 60 },
    { subject: 'Christian Religious Education', topic: 'The Church', prerequisite_topic: 'Christian Living', required_mastery: 60 },

    // Creative Arts path
    { subject: 'Creative Arts', topic: 'Music', prerequisite_topic: 'Drawing & Painting', required_mastery: 60 },
    { subject: 'Creative Arts', topic: 'Drama', prerequisite_topic: 'Music', required_mastery: 60 },
    { subject: 'Creative Arts', topic: 'Crafts', prerequisite_topic: 'Drawing & Painting', required_mastery: 60 },

    // Agriculture path
    { subject: 'Agriculture', topic: 'Animal Husbandry', prerequisite_topic: 'Crop Farming', required_mastery: 60 },
    { subject: 'Agriculture', topic: 'Soil Science', prerequisite_topic: 'Crop Farming', required_mastery: 60 },
    { subject: 'Agriculture', topic: 'Farm Tools', prerequisite_topic: 'Soil Science', required_mastery: 60 },

    // Social Studies path
    { subject: 'Social Studies', topic: 'History', prerequisite_topic: 'Geography', required_mastery: 60 },
    { subject: 'Social Studies', topic: 'Civics', prerequisite_topic: 'History', required_mastery: 60 },
    { subject: 'Social Studies', topic: 'Culture', prerequisite_topic: 'Geography', required_mastery: 60 },
  ]

  for (const prereq of prerequisites) {
    await p.query(
      `INSERT INTO topic_prerequisites (subject, topic, prerequisite_topic, required_mastery)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (subject, topic, prerequisite_topic) DO NOTHING`,
      [prereq.subject, prereq.topic, prereq.prerequisite_topic, prereq.required_mastery]
    )
  }
}

async function seedDefaultQuestions(p) {
  const questions = getDefaultQuestions()

  // Use a single transaction for bulk insert
  const client = await p.connect()
  try {
    await client.query('BEGIN')

    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (id, subject, topic, question, answer, type, options, hint, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [q.id, q.subject, q.topic, q.question, q.answer, q.type, q.options ? JSON.stringify(q.options) : null, q.hint, q.image]
      )
      await client.query(
        'INSERT INTO question_stats (question_id, correct, wrong) VALUES ($1, 0, 0)',
        [q.id]
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function seedDefaultSequences(p) {
  const sequences = getDefaultSequences()

  const client = await p.connect()
  try {
    await client.query('BEGIN')

    for (const seq of sequences) {
      await client.query(
        `INSERT INTO sequence_questions (id, subject, topic, title, description, image)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [seq.id, seq.subject, seq.topic, seq.title, seq.description, seq.image]
      )

      for (const step of seq.steps) {
        await client.query(
          `INSERT INTO sequence_steps (sequence_id, step_number, step_text)
           VALUES ($1, $2, $3)`,
          [seq.id, step.step_number, step.step_text]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function seedDefaultDiagrams(p) {
  const diagrams = getDefaultDiagrams()

  const client = await p.connect()
  try {
    await client.query('BEGIN')

    for (const diag of diagrams) {
      await client.query(
        `INSERT INTO diagram_questions (id, subject, topic, title, description, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [diag.id, diag.subject, diag.topic, diag.title, diag.description, diag.image_url]
      )

      for (const label of diag.labels) {
        await client.query(
          `INSERT INTO diagram_labels (diagram_id, label_key, correct_answer, hint)
           VALUES ($1, $2, $3, $4)`,
          [diag.id, label.label_key, label.correct_answer, label.hint || null]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function seedDefaultWritingPrompts(p) {
  const prompts = [
    { id: 'wp_eng_001', subject: 'English', topic: 'Handwriting', title: 'Write the Alphabet', prompt_text: 'Write all 26 letters of the alphabet in uppercase (A-Z), then write them again in lowercase (a-z). Try to keep your letters neat and on the lines.' },
    { id: 'wp_eng_002', subject: 'English', topic: 'Handwriting', title: 'My Favorite Animal', prompt_text: 'Write 3-5 sentences about your favorite animal. What does it look like? Where does it live? Why do you like it?' },
    { id: 'wp_eng_003', subject: 'English', topic: 'Handwriting', title: 'Copy This Sentence', prompt_text: 'Copy the following sentence in your best handwriting: "The quick brown fox jumps over the lazy dog." This sentence uses every letter of the alphabet!' },
    { id: 'wp_eng_004', subject: 'English', topic: 'Spelling', title: 'Spelling Practice', prompt_text: 'Write each of these words three times: because, beautiful, different, friend, together, through, people, another.' },
    { id: 'wp_eng_005', subject: 'English', topic: 'Creative Writing', title: 'Story Starter', prompt_text: 'Continue this story: "One morning, I woke up and discovered I could fly. The first thing I did was..." Write at least 5 sentences.' },
    { id: 'wp_cre_001', subject: 'Christian Religious Education', topic: 'Old Testament', title: 'The Ten Commandments', prompt_text: 'Write down as many of the Ten Commandments as you can remember. Number each one.' },
    { id: 'wp_cre_002', subject: 'Christian Religious Education', topic: 'New Testament', title: 'The Beatitudes', prompt_text: 'Write the Beatitudes from the Sermon on the Mount (Matthew 5:3-12). If you cannot remember them all, write the ones you know.' },
    { id: 'wp_ss_001', subject: 'Social Studies', topic: 'Geography', title: 'My Country', prompt_text: 'Write 5 sentences about Kenya. Include facts about its capital, languages, wildlife, and one thing that makes it special.' },
    { id: 'wp_agr_001', subject: 'Agriculture', topic: 'Crop Farming', title: 'Steps of Planting', prompt_text: 'Write down the steps for planting maize from start to harvest. Number each step and use complete sentences.' },
  ]

  const client = await p.connect()
  try {
    await client.query('BEGIN')
    for (const wp of prompts) {
      await client.query(
        `INSERT INTO writing_prompts (id, subject, topic, title, prompt_text)
         VALUES ($1, $2, $3, $4, $5)`,
        [wp.id, wp.subject, wp.topic, wp.title, wp.prompt_text]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

function getDefaultDiagrams() {
  return []
}

function getDefaultSequences() {
  return []
}

function getDefaultQuestions() {
  return [
    // ENGLISH - Vocabulary
    { id: 'eng_voc_001', subject: 'English', topic: 'Vocabulary', question: 'What is the opposite of "happy"?', answer: 'sad', type: 'text', options: null, hint: 'How you feel when something bad happens', image: null },
    { id: 'eng_voc_002', subject: 'English', topic: 'Vocabulary', question: 'What word means "very big"?', answer: 'huge', type: 'multiple', options: ['Tiny', 'Huge', 'Small', 'Little'], hint: 'Like an elephant', image: null },
    { id: 'eng_voc_003', subject: 'English', topic: 'Vocabulary', question: 'What is another word for "fast"?', answer: 'quick', type: 'text', options: null, hint: 'Like a cheetah', image: null },
    { id: 'eng_voc_004', subject: 'English', topic: 'Vocabulary', question: 'What is the opposite of "noisy"?', answer: 'quiet', type: 'text', options: null, hint: 'A library should be this', image: null },
    { id: 'eng_voc_005', subject: 'English', topic: 'Vocabulary', question: 'What word means "to talk very quietly"?', answer: 'whisper', type: 'multiple', options: ['Shout', 'Whisper', 'Yell', 'Scream'], hint: 'You do this when telling a secret', image: null },

    // ENGLISH - Grammar
    { id: 'eng_gr_001', subject: 'English', topic: 'Grammar', question: 'What type of word is "quickly"?', answer: 'adverb', type: 'text', options: null, hint: 'It describes how an action is done', image: null },
    { id: 'eng_gr_002', subject: 'English', topic: 'Grammar', question: 'What type of word is "beautiful"?', answer: 'adjective', type: 'multiple', options: ['Noun', 'Verb', 'Adjective', 'Adverb'], hint: 'It describes a noun', image: null },
    { id: 'eng_gr_003', subject: 'English', topic: 'Grammar', question: 'What punctuation ends a question?', answer: '?', type: 'text', options: null, hint: 'A curved line with a dot', image: null },
    { id: 'eng_gr_004', subject: 'English', topic: 'Grammar', question: 'What is the plural of "child"?', answer: 'children', type: 'text', options: null, hint: "It's an irregular plural", image: null },
    { id: 'eng_gr_005', subject: 'English', topic: 'Grammar', question: 'What type of word is "running" in "The running water"?', answer: 'adjective', type: 'multiple', options: ['Verb', 'Noun', 'Adjective', 'Adverb'], hint: 'It describes the water', image: null },

    // ENGLISH - Spelling
    { id: 'eng_sp_001', subject: 'English', topic: 'Spelling', question: 'How do you spell the number 8?', answer: 'eight', type: 'text', options: null, hint: 'E-I-G-H-T', image: null },
    { id: 'eng_sp_002', subject: 'English', topic: 'Spelling', question: 'Which spelling is correct?', answer: 'because', type: 'multiple', options: ['Becuase', 'Because', 'Becouse', 'Beacause'], hint: 'B-E-C-A-U-S-E', image: null },
    { id: 'eng_sp_003', subject: 'English', topic: 'Spelling', question: 'How do you spell the opposite of false?', answer: 'true', type: 'text', options: null, hint: 'T-R-U-E', image: null },
    { id: 'eng_sp_004', subject: 'English', topic: 'Spelling', question: 'Which spelling is correct for the color?', answer: 'purple', type: 'multiple', options: ['Purpel', 'Purple', 'Purpal', 'Perpul'], hint: 'P-U-R-P-L-E', image: null },
    { id: 'eng_sp_005', subject: 'English', topic: 'Spelling', question: 'How do you spell the day after Monday?', answer: 'tuesday', type: 'text', options: null, hint: 'T-U-E-S-D-A-Y', image: null },

    // ENGLISH - Reading
    { id: 'eng_rc_001', subject: 'English', topic: 'Reading', question: 'If a character is "trembling", they are probably feeling what?', answer: 'scared', type: 'multiple', options: ['Happy', 'Scared', 'Excited', 'Bored'], hint: 'Trembling is shaking with fear', image: null },
    { id: 'eng_rc_002', subject: 'English', topic: 'Reading', question: 'What is the main character in a story called?', answer: 'protagonist', type: 'text', options: null, hint: 'Pro- means first or main', image: null },
    { id: 'eng_rc_003', subject: 'English', topic: 'Reading', question: 'What do we call the problem in a story?', answer: 'conflict', type: 'text', options: null, hint: 'It creates tension in the plot', image: null },

    // CHRISTIAN RELIGIOUS EDUCATION - Old Testament
    { id: 'cre_ot_001', subject: 'Christian Religious Education', topic: 'Old Testament', question: 'Who built the ark to survive the great flood?', answer: 'noah', type: 'text', options: null, hint: 'God told him to build it', image: null },
    { id: 'cre_ot_002', subject: 'Christian Religious Education', topic: 'Old Testament', question: 'Who was given the Ten Commandments on Mount Sinai?', answer: 'moses', type: 'multiple', options: ['Abraham', 'Moses', 'David', 'Elijah'], hint: 'He led the Israelites out of Egypt', image: null },
    { id: 'cre_ot_003', subject: 'Christian Religious Education', topic: 'Old Testament', question: 'Who killed Goliath with a sling and a stone?', answer: 'david', type: 'text', options: null, hint: 'He later became king of Israel', image: null },
    { id: 'cre_ot_004', subject: 'Christian Religious Education', topic: 'Old Testament', question: 'How many days did God take to create the world?', answer: '6', type: 'multiple', options: ['5', '6', '7', '10'], hint: 'He rested on the seventh day', image: null },
    { id: 'cre_ot_005', subject: 'Christian Religious Education', topic: 'Old Testament', question: 'Who was swallowed by a big fish?', answer: 'jonah', type: 'text', options: null, hint: 'God told him to go to Nineveh', image: null },

    // CHRISTIAN RELIGIOUS EDUCATION - New Testament
    { id: 'cre_nt_001', subject: 'Christian Religious Education', topic: 'New Testament', question: 'In what town was Jesus born?', answer: 'bethlehem', type: 'text', options: null, hint: 'Mary and Joseph traveled there for a census', image: null },
    { id: 'cre_nt_002', subject: 'Christian Religious Education', topic: 'New Testament', question: 'How many disciples did Jesus choose?', answer: '12', type: 'multiple', options: ['7', '10', '12', '15'], hint: 'A dozen', image: null },
    { id: 'cre_nt_003', subject: 'Christian Religious Education', topic: 'New Testament', question: 'Who baptized Jesus in the River Jordan?', answer: 'john', type: 'text', options: null, hint: 'John the ___', image: null },
    { id: 'cre_nt_004', subject: 'Christian Religious Education', topic: 'New Testament', question: 'What was the first miracle Jesus performed?', answer: 'water into wine', type: 'multiple', options: ['Healing the blind', 'Water into wine', 'Walking on water', 'Feeding 5000'], hint: 'It happened at a wedding in Cana', image: null },
    { id: 'cre_nt_005', subject: 'Christian Religious Education', topic: 'New Testament', question: 'What did Jesus ride into Jerusalem on Palm Sunday?', answer: 'donkey', type: 'text', options: null, hint: 'A small animal related to a horse', image: null },

    // CHRISTIAN RELIGIOUS EDUCATION - Christian Living
    { id: 'cre_cl_001', subject: 'Christian Religious Education', topic: 'Christian Living', question: 'What prayer did Jesus teach his followers?', answer: "lord's prayer", type: 'text', options: null, hint: 'Our Father who art in heaven...', image: null },
    { id: 'cre_cl_002', subject: 'Christian Religious Education', topic: 'Christian Living', question: 'Which commandment says "Love your neighbor as yourself"?', answer: 'second', type: 'multiple', options: ['First', 'Second', 'Fifth', 'Tenth'], hint: 'The greatest commandments are two', image: null },
    { id: 'cre_cl_003', subject: 'Christian Religious Education', topic: 'Christian Living', question: 'What is the Golden Rule?', answer: 'treat others as you want to be treated', type: 'multiple', options: ['Be first in everything', 'Treat others as you want to be treated', 'Always follow rules', 'Never tell lies'], hint: 'Do unto others...', image: null },

    // CHRISTIAN RELIGIOUS EDUCATION - The Church
    { id: 'cre_ch_001', subject: 'Christian Religious Education', topic: 'The Church', question: 'What event is celebrated on Easter Sunday?', answer: 'resurrection', type: 'text', options: null, hint: 'Jesus rose from the dead', image: null },
    { id: 'cre_ch_002', subject: 'Christian Religious Education', topic: 'The Church', question: 'What season of the church calendar comes before Easter?', answer: 'lent', type: 'multiple', options: ['Advent', 'Lent', 'Pentecost', 'Ordinary Time'], hint: '40 days of fasting and prayer', image: null },

    // CREATIVE ARTS - Drawing & Painting
    { id: 'ca_dp_001', subject: 'Creative Arts', topic: 'Drawing & Painting', question: 'What are the three primary colors?', answer: 'red yellow blue', type: 'multiple', options: ['Red, Yellow, Blue', 'Red, Green, Blue', 'Orange, Green, Purple', 'Black, White, Gray'], hint: 'These colors cannot be made by mixing other colors', image: null },
    { id: 'ca_dp_002', subject: 'Creative Arts', topic: 'Drawing & Painting', question: 'What color do you get when you mix red and blue?', answer: 'purple', type: 'text', options: null, hint: 'The color of grapes', image: null },
    { id: 'ca_dp_003', subject: 'Creative Arts', topic: 'Drawing & Painting', question: 'What color do you get when you mix red and yellow?', answer: 'orange', type: 'text', options: null, hint: 'Named after a fruit', image: null },
    { id: 'ca_dp_004', subject: 'Creative Arts', topic: 'Drawing & Painting', question: 'What is the technique of shading with small dots called?', answer: 'stippling', type: 'multiple', options: ['Hatching', 'Stippling', 'Blending', 'Smudging'], hint: 'Think of tiny dots', image: null },
    { id: 'ca_dp_005', subject: 'Creative Arts', topic: 'Drawing & Painting', question: 'What do warm colors (red, orange, yellow) usually represent?', answer: 'energy', type: 'multiple', options: ['Sadness', 'Energy', 'Coldness', 'Silence'], hint: 'Think of fire and the sun', image: null },

    // CREATIVE ARTS - Music
    { id: 'ca_mu_001', subject: 'Creative Arts', topic: 'Music', question: 'How many notes are in a musical scale (do, re, mi...)?', answer: '8', type: 'multiple', options: ['5', '7', '8', '12'], hint: 'Do Re Mi Fa Sol La Ti Do', image: null },
    { id: 'ca_mu_002', subject: 'Creative Arts', topic: 'Music', question: 'What instrument has black and white keys?', answer: 'piano', type: 'text', options: null, hint: 'A large keyboard instrument', image: null },
    { id: 'ca_mu_003', subject: 'Creative Arts', topic: 'Music', question: 'What do you call a group of singers performing together?', answer: 'choir', type: 'text', options: null, hint: 'Often found in churches', image: null },

    // CREATIVE ARTS - Drama
    { id: 'ca_dr_001', subject: 'Creative Arts', topic: 'Drama', question: 'What is the area where actors perform called?', answer: 'stage', type: 'text', options: null, hint: 'The raised platform in a theater', image: null },
    { id: 'ca_dr_002', subject: 'Creative Arts', topic: 'Drama', question: 'What do you call the words actors speak in a play?', answer: 'dialogue', type: 'multiple', options: ['Script', 'Dialogue', 'Monologue', 'Lyrics'], hint: 'A conversation between characters', image: null },

    // CREATIVE ARTS - Crafts
    { id: 'ca_cr_001', subject: 'Creative Arts', topic: 'Crafts', question: 'What craft involves folding paper into shapes?', answer: 'origami', type: 'text', options: null, hint: 'A Japanese paper art', image: null },
    { id: 'ca_cr_002', subject: 'Creative Arts', topic: 'Crafts', question: 'What tool is used for cutting fabric or paper?', answer: 'scissors', type: 'text', options: null, hint: 'Has two sharp blades', image: null },

    // AGRICULTURE - Crop Farming
    { id: 'agr_cf_001', subject: 'Agriculture', topic: 'Crop Farming', question: 'What do plants need to make food through photosynthesis?', answer: 'sunlight', type: 'multiple', options: ['Sunlight', 'Darkness', 'Salt', 'Sand'], hint: 'It comes from the sky during the day', image: null },
    { id: 'agr_cf_002', subject: 'Agriculture', topic: 'Crop Farming', question: 'What is the process of putting seeds in the soil called?', answer: 'planting', type: 'text', options: null, hint: 'Also called sowing', image: null },
    { id: 'agr_cf_003', subject: 'Agriculture', topic: 'Crop Farming', question: 'What is the practice of growing crops without chemicals called?', answer: 'organic farming', type: 'multiple', options: ['Organic farming', 'Industrial farming', 'Mono-cropping', 'Irrigation'], hint: 'Natural and chemical-free', image: null },
    { id: 'agr_cf_004', subject: 'Agriculture', topic: 'Crop Farming', question: 'What staple crop is grown in paddy fields?', answer: 'rice', type: 'text', options: null, hint: 'A grain commonly eaten in Asia and East Africa', image: null },
    { id: 'agr_cf_005', subject: 'Agriculture', topic: 'Crop Farming', question: 'What is removing unwanted plants from a garden called?', answer: 'weeding', type: 'text', options: null, hint: 'Getting rid of plants that compete with crops', image: null },

    // AGRICULTURE - Animal Husbandry
    { id: 'agr_ah_001', subject: 'Agriculture', topic: 'Animal Husbandry', question: 'What is a young cow called?', answer: 'calf', type: 'text', options: null, hint: 'Baby cattle', image: null },
    { id: 'agr_ah_002', subject: 'Agriculture', topic: 'Animal Husbandry', question: 'What product do we get from dairy cows?', answer: 'milk', type: 'multiple', options: ['Wool', 'Milk', 'Eggs', 'Honey'], hint: 'A white liquid', image: null },
    { id: 'agr_ah_003', subject: 'Agriculture', topic: 'Animal Husbandry', question: 'What is a place where bees are kept called?', answer: 'apiary', type: 'text', options: null, hint: 'Also called a bee yard', image: null },
    { id: 'agr_ah_004', subject: 'Agriculture', topic: 'Animal Husbandry', question: 'What animal gives us wool?', answer: 'sheep', type: 'text', options: null, hint: 'It says "baa"', image: null },

    // AGRICULTURE - Soil Science
    { id: 'agr_ss_001', subject: 'Agriculture', topic: 'Soil Science', question: 'What are the three main types of soil?', answer: 'sand silt clay', type: 'multiple', options: ['Sand, Silt, Clay', 'Rock, Mud, Dirt', 'Gravel, Peat, Chalk', 'Sand, Rock, Mud'], hint: 'Classified by particle size', image: null },
    { id: 'agr_ss_002', subject: 'Agriculture', topic: 'Soil Science', question: 'What is the dark, nutrient-rich top layer of soil called?', answer: 'humus', type: 'text', options: null, hint: 'Formed from decomposed organic matter', image: null },
    { id: 'agr_ss_003', subject: 'Agriculture', topic: 'Soil Science', question: 'What type of soil holds the most water?', answer: 'clay', type: 'multiple', options: ['Sandy', 'Clay', 'Loam', 'Gravel'], hint: 'Has the smallest particles', image: null },

    // AGRICULTURE - Farm Tools
    { id: 'agr_ft_001', subject: 'Agriculture', topic: 'Farm Tools', question: 'What tool is used for digging soil?', answer: 'hoe', type: 'text', options: null, hint: 'A simple hand tool with a flat blade', image: null },
    { id: 'agr_ft_002', subject: 'Agriculture', topic: 'Farm Tools', question: 'What tool is used for cutting grass or crops?', answer: 'panga', type: 'multiple', options: ['Rake', 'Panga', 'Spade', 'Fork'], hint: 'A large cutting tool, also called a machete', image: null },

    // SOCIAL STUDIES - Geography
    { id: 'ss_geo_001', subject: 'Social Studies', topic: 'Geography', question: 'What is the longest river in Africa?', answer: 'nile', type: 'text', options: null, hint: 'It flows through Egypt', image: null },
    { id: 'ss_geo_002', subject: 'Social Studies', topic: 'Geography', question: 'What is the largest continent?', answer: 'asia', type: 'multiple', options: ['Africa', 'Asia', 'Europe', 'North America'], hint: 'China and India are on this continent', image: null },
    { id: 'ss_geo_003', subject: 'Social Studies', topic: 'Geography', question: 'What is the tallest mountain in Africa?', answer: 'kilimanjaro', type: 'text', options: null, hint: 'Located in Tanzania', image: null },
    { id: 'ss_geo_004', subject: 'Social Studies', topic: 'Geography', question: 'What ocean borders East Africa?', answer: 'indian', type: 'multiple', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], hint: 'Named after a large Asian country', image: null },
    { id: 'ss_geo_005', subject: 'Social Studies', topic: 'Geography', question: 'What is the largest lake in Africa?', answer: 'victoria', type: 'text', options: null, hint: 'Shared by Kenya, Uganda, and Tanzania', image: null },

    // SOCIAL STUDIES - History
    { id: 'ss_his_001', subject: 'Social Studies', topic: 'History', question: 'Which country was the first to gain independence in East Africa?', answer: 'tanzania', type: 'multiple', options: ['Kenya', 'Tanzania', 'Uganda', 'Rwanda'], hint: 'It gained independence in 1961', image: null },
    { id: 'ss_his_002', subject: 'Social Studies', topic: 'History', question: 'What year did Kenya gain independence?', answer: '1963', type: 'text', options: null, hint: 'In the 1960s', image: null },
    { id: 'ss_his_003', subject: 'Social Studies', topic: 'History', question: 'Who was the first president of Kenya?', answer: 'jomo kenyatta', type: 'text', options: null, hint: 'The Nairobi airport is named after him', image: null },

    // SOCIAL STUDIES - Civics
    { id: 'ss_civ_001', subject: 'Social Studies', topic: 'Civics', question: 'What is the supreme law of a country called?', answer: 'constitution', type: 'text', options: null, hint: 'It outlines the rules for how a country is governed', image: null },
    { id: 'ss_civ_002', subject: 'Social Studies', topic: 'Civics', question: 'What are the three branches of government?', answer: 'executive legislature judiciary', type: 'multiple', options: ['Executive, Legislature, Judiciary', 'President, Senate, Army', 'Police, Courts, Parliament', 'Mayor, Governor, President'], hint: 'They provide checks and balances', image: null },
    { id: 'ss_civ_003', subject: 'Social Studies', topic: 'Civics', question: 'What is the right to vote called?', answer: 'suffrage', type: 'text', options: null, hint: 'A democratic right for citizens', image: null },

    // SOCIAL STUDIES - Culture
    { id: 'ss_cul_001', subject: 'Social Studies', topic: 'Culture', question: 'What is a language spoken widely in East Africa alongside English?', answer: 'swahili', type: 'text', options: null, hint: 'Jambo! Habari?', image: null },
    { id: 'ss_cul_002', subject: 'Social Studies', topic: 'Culture', question: 'What is the traditional Maasai home called?', answer: 'manyatta', type: 'multiple', options: ['Igloo', 'Manyatta', 'Tepee', 'Hut'], hint: 'Made from mud, sticks, and cow dung', image: null },
  ]
}

export default getPool
