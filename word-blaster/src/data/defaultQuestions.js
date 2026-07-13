export const defaultQuestions = [
  // ENGLISH - Vocabulary
  {
    id: 'eng_voc_001',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What is the opposite of "happy"?',
    answer: 'sad',
    type: 'text',
    options: null,
    hint: 'How you feel when something bad happens',
    image: null
  },
  {
    id: 'eng_voc_002',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What word means "very big"?',
    answer: 'huge',
    type: 'multiple',
    options: ['Tiny', 'Huge', 'Small', 'Little'],
    hint: 'Like an elephant',
    image: null
  },
  {
    id: 'eng_voc_003',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What is another word for "fast"?',
    answer: 'quick',
    type: 'text',
    options: null,
    hint: 'Like a cheetah',
    image: null
  },
  {
    id: 'eng_voc_004',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What is the opposite of "noisy"?',
    answer: 'quiet',
    type: 'text',
    options: null,
    hint: 'A library should be this',
    image: null
  },
  {
    id: 'eng_voc_005',
    subject: 'English',
    topic: 'Vocabulary',
    question: 'What word means "to talk very quietly"?',
    answer: 'whisper',
    type: 'multiple',
    options: ['Shout', 'Whisper', 'Yell', 'Scream'],
    hint: 'You do this when telling a secret',
    image: null
  },

  // ENGLISH - Grammar
  {
    id: 'eng_gr_001',
    subject: 'English',
    topic: 'Grammar',
    question: 'What type of word is "quickly"?',
    answer: 'adverb',
    type: 'text',
    options: null,
    hint: 'It describes how an action is done',
    image: null
  },
  {
    id: 'eng_gr_002',
    subject: 'English',
    topic: 'Grammar',
    question: 'What type of word is "beautiful"?',
    answer: 'adjective',
    type: 'multiple',
    options: ['Noun', 'Verb', 'Adjective', 'Adverb'],
    hint: 'It describes a noun',
    image: null
  },
  {
    id: 'eng_gr_003',
    subject: 'English',
    topic: 'Grammar',
    question: 'What punctuation ends a question?',
    answer: '?',
    type: 'text',
    options: null,
    hint: 'A curved line with a dot',
    image: null
  },
  {
    id: 'eng_gr_004',
    subject: 'English',
    topic: 'Grammar',
    question: 'What is the plural of "child"?',
    answer: 'children',
    type: 'text',
    options: null,
    hint: 'It\'s an irregular plural',
    image: null
  },
  {
    id: 'eng_gr_005',
    subject: 'English',
    topic: 'Grammar',
    question: 'What type of word is "running" in "The running water"?',
    answer: 'adjective',
    type: 'multiple',
    options: ['Verb', 'Noun', 'Adjective', 'Adverb'],
    hint: 'It describes the water',
    image: null
  },

  // ENGLISH - Spelling
  {
    id: 'eng_sp_001',
    subject: 'English',
    topic: 'Spelling',
    question: 'How do you spell the number 8?',
    answer: 'eight',
    type: 'text',
    options: null,
    hint: 'E-I-G-H-T',
    image: null
  },
  {
    id: 'eng_sp_002',
    subject: 'English',
    topic: 'Spelling',
    question: 'Which spelling is correct?',
    answer: 'because',
    type: 'multiple',
    options: ['Becuase', 'Because', 'Becouse', 'Beacause'],
    hint: 'B-E-C-A-U-S-E',
    image: null
  },
  {
    id: 'eng_sp_003',
    subject: 'English',
    topic: 'Spelling',
    question: 'How do you spell the opposite of false?',
    answer: 'true',
    type: 'text',
    options: null,
    hint: 'T-R-U-E',
    image: null
  },
  {
    id: 'eng_sp_004',
    subject: 'English',
    topic: 'Spelling',
    question: 'Which spelling is correct for the color?',
    answer: 'purple',
    type: 'multiple',
    options: ['Purpel', 'Purple', 'Purpal', 'Perpul'],
    hint: 'P-U-R-P-L-E',
    image: null
  },
  {
    id: 'eng_sp_005',
    subject: 'English',
    topic: 'Spelling',
    question: 'How do you spell the day after Monday?',
    answer: 'tuesday',
    type: 'text',
    options: null,
    hint: 'T-U-E-S-D-A-Y',
    image: null
  },

  // ENGLISH - Reading Comprehension
  {
    id: 'eng_rc_001',
    subject: 'English',
    topic: 'Reading',
    question: 'If a character is "trembling", they are probably feeling what?',
    answer: 'scared',
    type: 'multiple',
    options: ['Happy', 'Scared', 'Excited', 'Bored'],
    hint: 'Trembling is shaking with fear',
    image: null
  },
  {
    id: 'eng_rc_002',
    subject: 'English',
    topic: 'Reading',
    question: 'What is the main character in a story called?',
    answer: 'protagonist',
    type: 'text',
    options: null,
    hint: 'Pro- means first or main',
    image: null
  },
  {
    id: 'eng_rc_003',
    subject: 'English',
    topic: 'Reading',
    question: 'What do we call the problem in a story?',
    answer: 'conflict',
    type: 'text',
    options: null,
    hint: 'It creates tension in the plot',
    image: null
  }
]

export const subjects = ['English', 'Christian Religious Education', 'Creative Arts', 'Agriculture', 'Social Studies']

export const topics = {
  English: ['Vocabulary', 'Grammar', 'Spelling', 'Reading'],
  'Christian Religious Education': ['Old Testament', 'New Testament', 'Christian Living', 'The Church'],
  'Creative Arts': ['Drawing & Painting', 'Music', 'Drama', 'Crafts'],
  Agriculture: ['Crop Farming', 'Animal Husbandry', 'Soil Science', 'Farm Tools'],
  'Social Studies': ['Geography', 'History', 'Civics', 'Culture']
}
