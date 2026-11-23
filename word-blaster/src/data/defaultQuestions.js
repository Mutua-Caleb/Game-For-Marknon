import { ACTIVE_SUBJECTS, ACTIVE_TOPICS } from './curriculum'

/**
 * Year 6 / Year 7 British Prep starter question bank across all 4 active realms:
 * - English (11+/KS3 Vocabulary, Reading, Inference & Analysis, Grammar)
 * - CAT4 (Verbal Reasoning, Quantitative Reasoning, Non-Verbal Reasoning, Spatial Ability)
 * - Maths (Year 7 Algebra, Fractions & Percentages, Ratio & Proportion, Geometry & Angles)
 * - French (Year 7 Core Vocabulary, Verbs & Tenses, Grammar & Gender, Everyday Phrases)
 */
export const defaultQuestions = [
  // ==========================================
  // ENGLISH — Vocabulary (11+ / KS2-KS3 Tier 2)
  // ==========================================
  {
    id: 'eng_voc_y7_001',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'Which word is the closest synonym for "meticulous"?',
    answer: 'thorough',
    type: 'multiple',
    options: ['Careless', 'Thorough', 'Hasty', 'Generous'],
    hint: 'Think of someone who checks every single detail carefully.',
    image: null
  },
  {
    id: 'eng_voc_y7_002',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What is the best antonym for "scarce"?',
    answer: 'abundant',
    type: 'multiple',
    options: ['Abundant', 'Fragile', 'Rare', 'Hollow'],
    hint: 'Scarce means in very short supply.',
    image: null
  },
  {
    id: 'eng_voc_y7_003',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'If a speech is "concise", how is it delivered?',
    answer: 'brief and clear',
    type: 'multiple',
    options: ['Long and rambling', 'Brief and clear', 'Loud and angry', 'Vague and confusing'],
    hint: 'Uses few words without losing meaning.',
    image: null
  },
  {
    id: 'eng_voc_y7_004',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'Choose the word that means "to make a bad situation worse":',
    answer: 'exacerbate',
    type: 'multiple',
    options: ['Alleviate', 'Exacerbate', 'Illuminate', 'Negotiate'],
    hint: 'Starts with ex- and often describes worsening a problem.',
    image: null
  },
  {
    id: 'eng_voc_y7_005',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'A person who recovers quickly from setbacks is described as ___:',
    answer: 'resilient',
    type: 'text',
    options: null,
    hint: 'Starts with "resil-" and means bouncing back.',
    image: null
  },
  {
    id: 'eng_voc_y7_006',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What does the word "ambiguous" mean?',
    answer: 'open to more than one meaning',
    type: 'multiple',
    options: ['Extremely ambitious', 'Open to more than one meaning', 'Impossible to read', 'Completely certain'],
    hint: 'The prefix ambi- means "both".',
    image: null
  },

  // ==========================================
  // ENGLISH — Reading & Inference & Analysis
  // ==========================================
  {
    id: 'eng_inf_y7_001',
    subject: 'English',
    topic: 'Inference & Analysis',
    question: '"The iron sky pressed down upon the silent valley." Which technique is used in "iron sky"?',
    answer: 'metaphor',
    type: 'multiple',
    options: ['Simile', 'Metaphor', 'Alliteration', 'Onomatopoeia'],
    hint: 'It directly calls the sky iron without using "like" or "as".',
    image: null
  },
  {
    id: 'eng_inf_y7_002',
    subject: 'English',
    topic: 'Inference & Analysis',
    question: '"He folded the letter twice, tucked it deep into his coat, and stared out at the empty lane." What can we infer?',
    answer: 'he is troubled or reflective',
    type: 'multiple',
    options: ['He is rushing to a party', 'He is troubled or reflective', 'He cannot read the letter', 'He is delighted by the news'],
    hint: 'Look at the slow, deliberate actions and the "empty lane".',
    image: null
  },
  {
    id: 'eng_inf_y7_003',
    subject: 'English',
    topic: 'Inference & Analysis',
    question: 'When weather mirrors a character’s inner emotions (e.g. a storm during an argument), what is this called?',
    answer: 'pathetic fallacy',
    type: 'multiple',
    options: ['Pathetic fallacy', 'Oxymoron', 'Hyperbole', 'Rhetorical question'],
    hint: 'A classic British KS3/GCSE literary analysis term.',
    image: null
  },
  {
    id: 'eng_inf_y7_004',
    subject: 'English',
    topic: 'Inference & Analysis',
    question: '"The wind whispered secrets through the skeletal branches." Which two techniques appear here?',
    answer: 'personification and metaphor',
    type: 'multiple',
    options: ['Personification and metaphor', 'Simile and rhyme', 'Pun and hyperbole', 'Irony and repetition'],
    hint: 'Wind "whispering" gives human traits; "skeletal" compares branches to bones.',
    image: null
  },
  {
    id: 'eng_rd_y7_001',
    subject: 'English',
    topic: 'Reading',
    question: 'What is the term for a narrator who knows the thoughts and feelings of every character?',
    answer: 'omniscient',
    type: 'multiple',
    options: ['First-person', 'Unreliable', 'Omniscient', 'Limited'],
    hint: 'Omni- means "all" and scient means "knowing".',
    image: null
  },
  {
    id: 'eng_rd_y7_002',
    subject: 'English',
    topic: 'Reading',
    question: 'Why might an author use very short sentences during a chase scene?',
    answer: 'to increase pace and tension',
    type: 'multiple',
    options: ['To slow the reader down', 'To increase pace and tension', 'To show the character is bored', 'To explain historical context'],
    hint: 'Short syntax mimics a racing heartbeat.',
    image: null
  },

  // ==========================================
  // ENGLISH — Grammar & SPaG
  // ==========================================
  {
    id: 'eng_gr_y7_001',
    subject: 'English',
    topic: 'Grammar',
    question: 'Which punctuation mark correctly joins two closely related independent clauses without a conjunction?',
    answer: 'semicolon',
    type: 'multiple',
    options: ['Comma', 'Semicolon', 'Hyphen', 'Apostrophe'],
    hint: 'Example: "The bell rang; the corridor emptied immediately."',
    image: null
  },
  {
    id: 'eng_gr_y7_002',
    subject: 'English',
    topic: 'Grammar',
    question: 'In "Although it was raining, the match continued", what is "Although it was raining"?',
    answer: 'subordinate clause',
    type: 'multiple',
    options: ['Main clause', 'Subordinate clause', 'Noun phrase', 'Relative pronoun'],
    hint: 'It cannot stand alone as a complete sentence.',
    image: null
  },
  {
    id: 'eng_gr_y7_003',
    subject: 'English',
    topic: 'Grammar',
    question: 'Identify the passive voice sentence:',
    answer: 'the manuscript was discovered by the archivist',
    type: 'multiple',
    options: [
      'The archivist discovered the manuscript.',
      'The manuscript was discovered by the archivist.',
      'The archivist carefully read the manuscript.',
      'Did the archivist find the manuscript?'
    ],
    hint: 'In passive voice, the subject receives the action.',
    image: null
  },
  {
    id: 'eng_gr_y7_004',
    subject: 'English',
    topic: 'Grammar',
    question: 'Which sentence uses the apostrophe correctly for plural possession?',
    answer: 'the students\' essays were impressive',
    type: 'multiple',
    options: [
      'The student\'s essays were all graded by five teachers.',
      'The students\' essays were impressive.',
      'The students essay\'s were impressive.',
      'The studentes\' essays were impressive.'
    ],
    hint: 'When a plural noun already ends in s, place the apostrophe after the s.',
    image: null
  },

  // ==========================================
  // CAT4 — Verbal Reasoning
  // ==========================================
  {
    id: 'cat4_vr_001',
    subject: 'CAT4',
    topic: 'Verbal Reasoning',
    question: 'Architect is to Blueprint as Composer is to ___:',
    answer: 'score',
    type: 'multiple',
    options: ['Orchestra', 'Score', 'Violin', 'Concert'],
    hint: 'An architect creates a blueprint; a composer writes a musical ___.',
    image: null
  },
  {
    id: 'cat4_vr_002',
    subject: 'CAT4',
    topic: 'Verbal Reasoning',
    question: 'Which word belongs in the same group as: Oak, Birch, Willow?',
    answer: 'sycamore',
    type: 'multiple',
    options: ['Fern', 'Sycamore', 'Moss', 'Ivy'],
    hint: 'All three are deciduous trees.',
    image: null
  },
  {
    id: 'cat4_vr_003',
    subject: 'CAT4',
    topic: 'Verbal Reasoning',
    question: 'Telescope is to Distant as Microscope is to ___:',
    answer: 'minute',
    type: 'multiple',
    options: ['Laboratory', 'Minute', 'Glass', 'Bright'],
    hint: 'Minute (my-NYOOT) means extremely tiny.',
    image: null
  },
  {
    id: 'cat4_vr_004',
    subject: 'CAT4',
    topic: 'Verbal Reasoning',
    question: 'Which word is the odd one out: Compass, Protractor, Ruler, Essay?',
    answer: 'essay',
    type: 'multiple',
    options: ['Compass', 'Protractor', 'Ruler', 'Essay'],
    hint: 'Three are geometric measuring instruments.',
    image: null
  },
  {
    id: 'cat4_vr_005',
    subject: 'CAT4',
    topic: 'Verbal Reasoning',
    question: 'Drought is to Rain as Famine is to ___:',
    answer: 'food',
    type: 'text',
    options: null,
    hint: 'A drought is an extreme lack of rain.',
    image: null
  },

  // ==========================================
  // CAT4 — Quantitative Reasoning
  // ==========================================
  {
    id: 'cat4_qr_001',
    subject: 'CAT4',
    topic: 'Quantitative Reasoning',
    question: 'Find the next number in the series: 3, 7, 15, 31, ___',
    answer: '63',
    type: 'text',
    options: null,
    hint: 'Look at how each term doubles and adds 1 (or check the differences: +4, +8, +16).',
    image: null
  },
  {
    id: 'cat4_qr_002',
    subject: 'CAT4',
    topic: 'Quantitative Reasoning',
    question: 'Number Analogy: [4 → 12], [7 → 21], [9 → ?]',
    answer: '27',
    type: 'text',
    options: null,
    hint: 'Find the single rule linking the first number to the second.',
    image: null
  },
  {
    id: 'cat4_qr_003',
    subject: 'CAT4',
    topic: 'Quantitative Reasoning',
    question: 'Find the next number in the series: 2, 6, 12, 20, 30, ___',
    answer: '42',
    type: 'multiple',
    options: ['38', '40', '42', '44'],
    hint: 'Differences increase by 2 each step: +4, +6, +8, +10...',
    image: null
  },
  {
    id: 'cat4_qr_004',
    subject: 'CAT4',
    topic: 'Quantitative Reasoning',
    question: 'Number Analogy: [5 → 26], [3 → 10], [6 → ?]',
    answer: '37',
    type: 'multiple',
    options: ['35', '36', '37', '42'],
    hint: 'Square the number, then add 1.',
    image: null
  },

  // ==========================================
  // CAT4 — Non-Verbal & Spatial Logic
  // ==========================================
  {
    id: 'cat4_nvr_001',
    subject: 'CAT4',
    topic: 'Non-Verbal Reasoning',
    question: 'A sequence of polygons goes: Triangle (3), Square (4), Pentagon (5), Hexagon (6). How many sides does the 6th shape have?',
    answer: '8',
    type: 'text',
    options: null,
    hint: '5th is heptagon (7), 6th is octagon.',
    image: null
  },
  {
    id: 'cat4_nvr_002',
    subject: 'CAT4',
    topic: 'Non-Verbal Reasoning',
    question: 'A clock hand points North and rotates 90° clockwise each step. Where does it point after 3 steps?',
    answer: 'west',
    type: 'multiple',
    options: ['North', 'East', 'South', 'West'],
    hint: 'N → E → S → W.',
    image: null
  },
  {
    id: 'cat4_sp_001',
    subject: 'CAT4',
    topic: 'Spatial Ability',
    question: 'A square sheet of paper is folded in half vertically, then folded in half horizontally, and 1 hole is punched in the centre. How many holes appear when unfolded?',
    answer: '4',
    type: 'multiple',
    options: ['1', '2', '4', '8'],
    hint: 'Two folds create 2 × 2 = 4 layers of paper.',
    image: null
  },
  {
    id: 'cat4_sp_002',
    subject: 'CAT4',
    topic: 'Spatial Ability',
    question: 'If you view a 3D cylinder directly from above (plan view), what 2D shape do you see?',
    answer: 'circle',
    type: 'multiple',
    options: ['Rectangle', 'Circle', 'Triangle', 'Oval'],
    hint: 'Imagine looking straight down at a tin can.',
    image: null
  },

  // ==========================================
  // MATHS — Year 7 British Curriculum
  // ==========================================
  {
    id: 'mth_alg_001',
    subject: 'Maths',
    topic: 'Algebra & Equations',
    question: 'Solve for x: 3x + 7 = 28',
    answer: '7',
    type: 'text',
    options: null,
    hint: 'Subtract 7 from both sides, then divide by 3.',
    image: null
  },
  {
    id: 'mth_alg_002',
    subject: 'Maths',
    topic: 'Algebra & Equations',
    question: 'Expand and simplify: 4(2a + 3) − 5a',
    answer: '3a + 12',
    type: 'multiple',
    options: ['3a + 12', '3a + 3', '13a + 12', '8a + 7'],
    hint: 'First multiply 4 by both terms inside the bracket: 8a + 12.',
    image: null
  },
  {
    id: 'mth_alg_003',
    subject: 'Maths',
    topic: 'Algebra & Equations',
    question: 'If n = −3, what is the value of 2n² + 5?',
    answer: '23',
    type: 'multiple',
    options: ['-13', '11', '23', '41'],
    hint: 'Remember (−3)² = +9, then multiply by 2 and add 5.',
    image: null
  },
  {
    id: 'mth_fdp_001',
    subject: 'Maths',
    topic: 'Fractions & Percentages',
    question: 'A coat costing £80 is reduced by 15% in a sale. What is the sale price in £?',
    answer: '68',
    type: 'text',
    options: null,
    hint: '10% of 80 is 8, and 5% is 4, so 15% is 12.',
    image: null
  },
  {
    id: 'mth_fdp_002',
    subject: 'Maths',
    topic: 'Fractions & Percentages',
    question: 'Calculate: 3/4 + 2/5 (give your answer as an improper fraction or mixed number)',
    answer: '23/20',
    type: 'multiple',
    options: ['5/9', '19/20', '23/20', '21/20'],
    hint: 'Use a common denominator of 20: 15/20 + 8/20.',
    image: null
  },
  {
    id: 'mth_rat_001',
    subject: 'Maths',
    topic: 'Ratio & Proportion',
    question: 'Share £72 in the ratio 5 : 4. What is the larger share in £?',
    answer: '40',
    type: 'text',
    options: null,
    hint: 'Total parts = 5 + 4 = 9. One part = 72 ÷ 9 = 8.',
    image: null
  },
  {
    id: 'mth_rat_002',
    subject: 'Maths',
    topic: 'Ratio & Proportion',
    question: 'Simplify the ratio 24 : 36 completely:',
    answer: '2:3',
    type: 'multiple',
    options: ['4:6', '2:3', '3:4', '6:9'],
    hint: 'Divide both sides by their highest common factor (12).',
    image: null
  },
  {
    id: 'mth_geo_001',
    subject: 'Maths',
    topic: 'Geometry & Angles',
    question: 'Two angles in a triangle measure 48° and 67°. What is the third angle in degrees?',
    answer: '65',
    type: 'text',
    options: null,
    hint: 'Angles in any triangle add up to 180°.',
    image: null
  },
  {
    id: 'mth_geo_002',
    subject: 'Maths',
    topic: 'Geometry & Angles',
    question: 'What is the sum of interior angles of a regular pentagon?',
    answer: '540',
    type: 'multiple',
    options: ['360', '450', '540', '720'],
    hint: 'Use (n − 2) × 180° where n = 5.',
    image: null
  },

  // ==========================================
  // FRENCH — Year 6 & Year 7 Immersion
  // ==========================================
  {
    id: 'fr_voc_001',
    subject: 'French',
    topic: 'Core Vocabulary',
    question: 'What does "la bibliothèque" mean in English?',
    answer: 'the library',
    type: 'multiple',
    options: ['The bookshop', 'The library', 'The classroom', 'The museum'],
    hint: 'Careful — it’s a famous false friend for "bookshop" (la librairie)!',
    image: null
  },
  {
    id: 'fr_voc_002',
    subject: 'French',
    topic: 'Core Vocabulary',
    question: 'How do you say "always" in French?',
    answer: 'toujours',
    type: 'multiple',
    options: ['Jamais', 'Parfois', 'Toujours', 'Souvent'],
    hint: 'Literally "all days" (tous + jours).',
    image: null
  },
  {
    id: 'fr_voc_003',
    subject: 'French',
    topic: 'Core Vocabulary',
    question: 'Translate into English: "le petit-déjeuner"',
    answer: 'breakfast',
    type: 'text',
    options: null,
    hint: 'The first meal of the day.',
    image: null
  },
  {
    id: 'fr_vrb_001',
    subject: 'French',
    topic: 'Verbs & Tenses',
    question: 'Complete the sentence: "Nous ___ au collège à huit heures." (aller)',
    answer: 'allons',
    type: 'multiple',
    options: ['vais', 'allez', 'allons', 'vont'],
    hint: 'Present tense of aller for "nous".',
    image: null
  },
  {
    id: 'fr_vrb_002',
    subject: 'French',
    topic: 'Verbs & Tenses',
    question: 'Complete with avoir: "J’___ douze ans."',
    answer: 'ai',
    type: 'text',
    options: null,
    hint: 'In French you "have" an age: j’___.',
    image: null
  },
  {
    id: 'fr_vrb_003',
    subject: 'French',
    topic: 'Verbs & Tenses',
    question: 'Choose the correct present tense form: "Elles ___ leurs devoirs." (faire)',
    answer: 'font',
    type: 'multiple',
    options: ['fais', 'faites', 'faisons', 'font'],
    hint: 'Plural third-person form of faire.',
    image: null
  },
  {
    id: 'fr_gr_001',
    subject: 'French',
    topic: 'Grammar & Gender',
    question: 'Choose the correct article: "___ maison est grande."',
    answer: 'la',
    type: 'multiple',
    options: ['Le', 'La', 'Les', 'Un'],
    hint: 'Maison is feminine singular.',
    image: null
  },
  {
    id: 'fr_gr_002',
    subject: 'French',
    topic: 'Grammar & Gender',
    question: 'Make this sentence negative: "J’aime les épinards."',
    answer: 'Je n\'aime pas les épinards.',
    type: 'multiple',
    options: [
      'Je ne aime pas les épinards.',
      'Je n\'aime pas les épinards.',
      'Je pas aime les épinards.',
      'Je n\'aime les pas épinards.'
    ],
    hint: 'Wrap ne...pas around the verb; ne becomes n’ before a vowel.',
    image: null
  },
  {
    id: 'fr_phr_001',
    subject: 'French',
    topic: 'Everyday Phrases',
    question: 'What does "Je voudrais un croissant, s’il vous plaît" mean?',
    answer: 'I would like a croissant, please',
    type: 'multiple',
    options: [
      'I ate a croissant yesterday',
      'I would like a croissant, please',
      'Where is the bakery, please?',
      'Do you have a croissant?'
    ],
    hint: '"Je voudrais" is the polite way to order.',
    image: null
  },
  {
    id: 'fr_phr_002',
    subject: 'French',
    topic: 'Everyday Phrases',
    question: 'How do you ask "What time is it?" in French?',
    answer: 'Quelle heure est-il ?',
    type: 'multiple',
    options: [
      'Quel âge as-tu ?',
      'Quelle heure est-il ?',
      'Où habites-tu ?',
      'Comment t’appelles-tu ?'
    ],
    hint: 'Uses the feminine word "heure" (hour).',
    image: null
  }
]

export const subjects = ACTIVE_SUBJECTS

export const topics = ACTIVE_TOPICS
