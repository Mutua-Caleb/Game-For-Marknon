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
      min_time_required INTEGER DEFAULT 1800,
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
  `)

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

function getDefaultSequences() {
  return [
    {
      id: 'seq_hb_001',
      subject: 'Science',
      topic: 'Human Body',
      title: 'Blood Circulation Through the Heart',
      description: 'Arrange the steps of blood circulation through the heart in the correct order, from deoxygenated blood returning to the heart to oxygenated blood being pumped out to the body.',
      image: null,
      steps: [
        { step_number: 1, step_text: 'Deoxygenated blood from the body enters the RIGHT ATRIUM through the superior and inferior vena cava' },
        { step_number: 2, step_text: 'Blood flows from the right atrium through the TRICUSPID VALVE into the RIGHT VENTRICLE' },
        { step_number: 3, step_text: 'The right ventricle pumps blood through the PULMONARY VALVE into the PULMONARY ARTERIES' },
        { step_number: 4, step_text: 'Blood travels to the LUNGS where it picks up oxygen and releases carbon dioxide (gas exchange)' },
        { step_number: 5, step_text: 'Oxygenated blood returns to the LEFT ATRIUM through the PULMONARY VEINS' },
        { step_number: 6, step_text: 'Blood flows from the left atrium through the MITRAL (BICUSPID) VALVE into the LEFT VENTRICLE' },
        { step_number: 7, step_text: 'The left ventricle pumps blood through the AORTIC VALVE into the AORTA' },
        { step_number: 8, step_text: 'Oxygenated blood is distributed to the entire body through the aorta and its branches' },
      ]
    }
  ]
}

function getDefaultQuestions() {
  return [
    // SCIENCE - Human Body
    { id: 'sci_hb_001', subject: 'Science', topic: 'Human Body', question: 'What organ pumps blood throughout your body?', answer: 'heart', type: 'text', options: null, hint: 'It beats about 100,000 times a day', image: null },
    { id: 'sci_hb_002', subject: 'Science', topic: 'Human Body', question: 'What is the largest organ in the human body?', answer: 'skin', type: 'text', options: null, hint: 'It covers your entire body', image: null },
    { id: 'sci_hb_003', subject: 'Science', topic: 'Human Body', question: 'How many bones does an adult human have?', answer: '206', type: 'multiple', options: ['106', '206', '306', '406'], hint: 'More than 200 but less than 250', image: null },
    { id: 'sci_hb_004', subject: 'Science', topic: 'Human Body', question: 'What part of the body helps you breathe?', answer: 'lungs', type: 'text', options: null, hint: 'You have two of them in your chest', image: null },
    { id: 'sci_hb_005', subject: 'Science', topic: 'Human Body', question: 'What is the control center of the body?', answer: 'brain', type: 'multiple', options: ['Heart', 'Brain', 'Liver', 'Stomach'], hint: "It's inside your skull", image: null },
    { id: 'sci_hb_006', subject: 'Science', topic: 'Human Body', question: 'What carries blood away from the heart?', answer: 'arteries', type: 'text', options: null, hint: 'Starts with "A"', image: null },
    { id: 'sci_hb_007', subject: 'Science', topic: 'Human Body', question: 'What type of blood cells fight infection?', answer: 'white', type: 'multiple', options: ['Red', 'White', 'Blue', 'Green'], hint: 'The color of snow', image: null },

    // SCIENCE - Physics
    { id: 'sci_ph_001', subject: 'Science', topic: 'Physics', question: 'What force keeps us on the ground?', answer: 'gravity', type: 'text', options: null, hint: 'Isaac Newton discovered it when an apple fell', image: null },
    { id: 'sci_ph_002', subject: 'Science', topic: 'Physics', question: 'What is the speed of light approximately?', answer: '300000', type: 'multiple', options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '100,000 km/s'], hint: 'About 300 thousand kilometers per second', image: null },
    { id: 'sci_ph_003', subject: 'Science', topic: 'Physics', question: 'What type of energy is stored in a battery?', answer: 'chemical', type: 'text', options: null, hint: 'Related to chemistry', image: null },
    { id: 'sci_ph_004', subject: 'Science', topic: 'Physics', question: 'What do we call the bending of light?', answer: 'refraction', type: 'text', options: null, hint: 'It makes a straw look bent in water', image: null },
    { id: 'sci_ph_005', subject: 'Science', topic: 'Physics', question: 'What force opposes motion between surfaces?', answer: 'friction', type: 'multiple', options: ['Gravity', 'Friction', 'Magnetism', 'Tension'], hint: 'It makes things slow down', image: null },
    { id: 'sci_ph_006', subject: 'Science', topic: 'Physics', question: 'Look at the circuit diagram. What component controls whether the bulb lights up?', answer: 'switch', type: 'multiple', options: ['Battery', 'Switch', 'Resistor', 'Wire'], hint: 'It can open or close the circuit', image: '/images/circuit-diagram.svg' },

    // SCIENCE - Chemistry
    { id: 'sci_ch_001', subject: 'Science', topic: 'Chemistry', question: 'What is the chemical symbol for water?', answer: 'H2O', type: 'text', options: null, hint: 'Two hydrogen and one oxygen', image: null },
    { id: 'sci_ch_002', subject: 'Science', topic: 'Chemistry', question: 'What gas do we breathe in?', answer: 'oxygen', type: 'text', options: null, hint: 'Plants produce this gas', image: null },
    { id: 'sci_ch_003', subject: 'Science', topic: 'Chemistry', question: 'What is the chemical symbol for gold?', answer: 'Au', type: 'multiple', options: ['Au', 'Ag', 'Go', 'Gd'], hint: 'From the Latin word "Aurum"', image: null },
    { id: 'sci_ch_004', subject: 'Science', topic: 'Chemistry', question: "What gas makes up most of Earth's atmosphere?", answer: 'nitrogen', type: 'text', options: null, hint: 'About 78% of the air', image: null },
    { id: 'sci_ch_005', subject: 'Science', topic: 'Chemistry', question: 'What is the pH of pure water?', answer: '7', type: 'multiple', options: ['5', '7', '9', '14'], hint: "It's neutral - not acidic or basic", image: null },

    // SCIENCE - Earth Science
    { id: 'sci_es_001', subject: 'Science', topic: 'Earth Science', question: 'What is the hottest layer of the Earth?', answer: 'core', type: 'text', options: null, hint: "It's at the center", image: null },
    { id: 'sci_es_002', subject: 'Science', topic: 'Earth Science', question: 'What causes the seasons on Earth?', answer: 'tilt', type: 'multiple', options: ['Distance from Sun', "Earth's Tilt", "Moon's gravity", 'Solar flares'], hint: "Earth's axis is at an angle", image: null },
    { id: 'sci_es_003', subject: 'Science', topic: 'Earth Science', question: 'What type of rock is formed from cooled lava?', answer: 'igneous', type: 'text', options: null, hint: 'From the Latin word for fire', image: null },
    { id: 'sci_es_004', subject: 'Science', topic: 'Earth Science', question: 'What is the largest ocean on Earth?', answer: 'pacific', type: 'text', options: null, hint: 'It touches Asia and America', image: null },
    { id: 'sci_es_005', subject: 'Science', topic: 'Earth Science', question: 'What layer of atmosphere protects us from UV rays?', answer: 'ozone', type: 'multiple', options: ['Troposphere', 'Ozone', 'Mesosphere', 'Exosphere'], hint: 'It has three oxygen atoms', image: null },

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
  ]
}

export default getPool
