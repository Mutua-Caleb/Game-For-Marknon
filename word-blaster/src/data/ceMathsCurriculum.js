/**
 * Galore Park Common Entrance 13+ / KS3 Mathematics Curriculum (David E. Hanson)
 * Organized cleanly into Chapters 1–7, with authentic exam-practice questions,
 * exact verified answers, optional SVG visuals, and step-by-step worked methods.
 */

export const MATHS_CHAPTERS = [
  {
    id: 'ch1-mental',
    number: 1,
    shortTitle: 'Mental Arithmetic',
    title: 'Chapter 1: Basic Skills & Mental Strategies',
    subtitle: 'Part 1.1 Rapid Skills & Part 1.2 ISEB Mental Word Problems (No Calculator)',
    accent: '#f59e0b',
    subtopics: ['Place Value & ×/÷ 10, 100, 1000', 'Mental Operations & BIDMAS', 'Quick FDP & Algebra', 'Mental Word Strategies']
  },
  {
    id: 'ch2-number',
    number: 2,
    shortTitle: 'Number',
    title: 'Chapter 2: Number',
    subtitle: 'Properties of Numbers, Non-Calculator Arithmetic, FDP, Ratio & Rounding',
    accent: '#fb923c',
    subtopics: ['Primes, Factors, HCF & LCM', 'BIDMAS & Directed Numbers', 'Fractions, Decimals, % & Ratio', 'Rounding & Estimation']
  },
  {
    id: 'ch3-algebra',
    number: 3,
    shortTitle: 'Algebra',
    title: 'Chapter 3: Algebra',
    subtitle: 'Expressions, Brackets, Factorising, Equations, Formulae & Sequences',
    accent: '#f5b942',
    subtopics: ['Simplifying & Factorising', 'Substitution & Formulae', 'Linear Equations', 'Sequences']
  },
  {
    id: 'ch4-measurement',
    number: 4,
    shortTitle: 'Area, Perimeter & Units',
    title: 'Chapter 4: Area, Perimeter, Volume & Measurement',
    subtitle: 'Units, Speed/Distance/Time, Perimeter, Area of 2D Shapes & Volume of Solids',
    accent: '#10b981',
    subtopics: ['Metric & Imperial Units', 'Time & Speed', 'Perimeter & Area', 'Volume & Surface Area']
  },
  {
    id: 'ch5-geometry',
    number: 5,
    shortTitle: 'Geometry',
    title: 'Chapter 5: Geometry & Angles',
    subtitle: '2D/3D Shapes, Angle Calculations, Parallel Lines, Polygons & Pythagoras',
    accent: '#38bdf8',
    subtopics: ['Triangles & Straight Lines', 'Polygons & Parallel Lines', '3D Faces, Edges & Vertices', 'Enlargement & Pythagoras']
  },
  {
    id: 'ch6-stats',
    number: 6,
    shortTitle: 'Probability & Stats',
    title: 'Chapter 6: Probability & Statistics',
    subtitle: 'Mean, Median, Mode, Range & Single-Event Probability',
    accent: '#a78bfa',
    subtopics: ['Mean & Reverse Mean', 'Median, Mode & Range', 'Probability Fractions', 'Complementary Events']
  },
  {
    id: 'ch7-puzzles',
    number: 7,
    shortTitle: 'Puzzles & Reasoning',
    title: 'Chapter 7: Reasoning Puzzles & Problems',
    subtitle: 'Multi-Step Number Reasoning, Ages, Primes & Real-Life Logic',
    accent: '#f43f5e',
    subtopics: ['Number & Prime Puzzles', 'Age & Ratio Logic', 'Multi-Step Real-Life Problems']
  }
]

/**
 * Every question has:
 * - id, chapterId, section (e.g. '1.1 Basic Skills', '2.3 FDP & Ratio')
 * - prompt, equation (optional highlighted math display)
 * - answer (canonical) & acceptedAnswers (optional alternates)
 * - unit (prefix/suffix label like '£', 'cm²', 'x =')
 * - hint, workedSteps (array of clear steps)
 * - visual (optional SVG diagram spec for MathsVisualDiagram)
 */
export const CE_MATHS_QUESTIONS = [
  // =========================================================================
  // CHAPTER 1 — PART 1.1: BASIC SKILLS (Galore Park PDF pp. 9–13)
  // =========================================================================
  {
    id: 'ch1_1_01',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'What is the value of the digit 6 in the number 30 640?',
    equation: '30 640',
    answer: '600',
    acceptedAnswers: ['600', 'six hundred', '6 hundreds'],
    unit: 'Value =',
    hint: 'Check which place-value column the 6 sits in (thousands, hundreds, tens, units).',
    workedSteps: ['Reading from the right: 0 units, 4 tens, 6 hundreds.', 'So the value of 6 is 600.']
  },
  {
    id: 'ch1_1_02',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'In the number 72.07, how many times greater is the value of the 7 on the left than the 7 on the right?',
    equation: '72.07',
    answer: '1000',
    acceptedAnswers: ['1000', '1,000'],
    unit: 'Times =',
    hint: 'Compare 70 with 0.07: how many places apart are tens and hundredths?',
    workedSteps: ['Left 7 = 70; right 7 = 0.07.', '70 ÷ 0.07 = 7000 ÷ 7 = 1000 times greater.']
  },
  {
    id: 'ch1_1_03',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Multiply 3.45 by 100.',
    equation: '3.45 × 100',
    answer: '345',
    unit: '=',
    hint: 'Shift every digit two place-value columns to the left.',
    workedSteps: ['3.45 × 10 = 34.5', '34.5 × 10 = 345']
  },
  {
    id: 'ch1_1_04',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Divide 2070 by 1000.',
    equation: '2070 ÷ 1000',
    answer: '2.07',
    acceptedAnswers: ['2.07', '2.070'],
    unit: '=',
    hint: 'Shift every digit three place-value columns to the right.',
    workedSteps: ['2070 ÷ 1000 = 2.070 = 2.07']
  },
  {
    id: 'ch1_1_05',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'When these five numbers are put in order of size, which number will be in the middle?  3.41,  4.13,  1.34,  3.14,  1.43',
    equation: '3.41   4.13   1.34   3.14   1.43',
    answer: '3.14',
    unit: 'Middle =',
    hint: 'Arrange all five from smallest to largest and pick the 3rd number.',
    workedSteps: ['Ordered: 1.34, 1.43, 3.14, 3.41, 4.13.', 'The middle (3rd) number is 3.14.']
  },
  {
    id: 'ch1_1_06',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'What is the largest number that will divide exactly into both 54 and 45? (HCF)',
    equation: 'HCF(54, 45)',
    answer: '9',
    unit: 'HCF =',
    hint: 'Check the 9 times table!',
    workedSteps: ['54 = 9 × 6 and 45 = 9 × 5.', 'Since 6 and 5 share no common factor > 1, HCF = 9.']
  },
  {
    id: 'ch1_1_07',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'What is the smallest number that is a multiple of both 16 and 24? (LCM)',
    equation: 'LCM(16, 24)',
    answer: '48',
    unit: 'LCM =',
    hint: 'List multiples of the larger number (24, 48, 72...) until 16 divides into it.',
    workedSteps: ['Multiples of 24: 24, 48...', '48 ÷ 16 = 3 exactly → LCM = 48.']
  },
  {
    id: 'ch1_1_08',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Calculate without a calculator: 143 + 79',
    equation: '143 + 79',
    answer: '222',
    unit: '=',
    hint: 'Add 80, then subtract 1!',
    workedSteps: ['143 + 80 = 223', '223 − 1 = 222']
  },
  {
    id: 'ch1_1_09',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Calculate mentally: 10.3 − 6.4',
    equation: '10.3 − 6.4',
    answer: '3.9',
    unit: '=',
    hint: 'Subtract 6 first (4.3), then subtract 0.4.',
    workedSteps: ['10.3 − 6 = 4.3', '4.3 − 0.4 = 3.9']
  },
  {
    id: 'ch1_1_10',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Calculate mentally: 12.8 ÷ 4',
    equation: '12.8 ÷ 4',
    answer: '3.2',
    unit: '=',
    hint: 'Divide 12 by 4, and divide 0.8 by 4.',
    workedSteps: ['12 ÷ 4 = 3 and 0.8 ÷ 4 = 0.2', 'Total = 3.2']
  },
  {
    id: 'ch1_1_11',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Use BIDMAS to evaluate: 2 + 3 × 5',
    equation: '2 + 3 × 5',
    answer: '17',
    unit: '=',
    hint: 'Multiply BEFORE you add.',
    workedSteps: ['3 × 5 = 15', '2 + 15 = 17']
  },
  {
    id: 'ch1_1_12',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Use BIDMAS to evaluate: 5 − 3 × 2',
    equation: '5 − 3 × 2',
    answer: '-1',
    acceptedAnswers: ['-1', '−1'],
    unit: '=',
    hint: 'Calculate 3 × 2 first, then subtract from 5.',
    workedSteps: ['3 × 2 = 6', '5 − 6 = −1']
  },
  {
    id: 'ch1_1_13',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Evaluate: √16 + 2²',
    equation: '√16 + 2²',
    answer: '8',
    unit: '=',
    hint: 'Square root of 16 is 4; 2 squared is 4.',
    workedSteps: ['√16 = 4 and 2² = 4', '4 + 4 = 8']
  },
  {
    id: 'ch1_1_14',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'How much is 30% of £40?',
    equation: '30% of £40',
    answer: '12',
    unit: '£',
    hint: 'Find 10% first (£4), then multiply by 3.',
    workedSteps: ['10% of £40 = £4', '30% = 3 × £4 = £12']
  },
  {
    id: 'ch1_1_15',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Write £8 as a percentage of £20.',
    equation: '£8 out of £20 = ?%',
    answer: '40',
    unit: '%',
    hint: 'Scale the fraction 8/20 up to a denominator of 100 (multiply top and bottom by 5).',
    workedSteps: ['8/20 = 40/100 = 40%']
  },
  {
    id: 'ch1_1_16',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Round 0.096 to 1 decimal place.',
    equation: '0.096  (to 1 d.p.)',
    answer: '0.1',
    unit: '=',
    hint: 'Look at the second decimal digit (9): it rounds the 0 tenths up to 1 tenth.',
    workedSteps: ['First decimal place is 0; next digit is 9 (≥ 5), so round up to 0.1.']
  },
  {
    id: 'ch1_1_17',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Estimate, to the nearest integer, the value of 2.98 × 3.05.',
    equation: '2.98 × 3.05 ≈ ?',
    answer: '9',
    unit: '≈',
    hint: 'Round each number to 1 significant figure before multiplying.',
    workedSteps: ['2.98 ≈ 3 and 3.05 ≈ 3', '3 × 3 = 9']
  },
  {
    id: 'ch1_1_18',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'If a = 3 and b = 4, what is the value of a + 3b?',
    equation: 'a + 3b   (a = 3, b = 4)',
    answer: '15',
    unit: '=',
    hint: 'Remember 3b means 3 × b.',
    workedSteps: ['3b = 3 × 4 = 12', 'a + 3b = 3 + 12 = 15']
  },
  {
    id: 'ch1_1_19',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Solve mentally for x: 4x − 4 = 12',
    equation: '4x − 4 = 12',
    answer: '4',
    unit: 'x =',
    hint: 'Add 4 to both sides, then divide by 4.',
    workedSteps: ['4x = 12 + 4 = 16', 'x = 16 ÷ 4 = 4']
  },
  {
    id: 'ch1_1_20',
    chapterId: 'ch1-mental',
    section: '1.1 Basic Skills',
    prompt: 'Write down the next term in the sequence: 1, 5, 13, 29, ...',
    equation: '1,  5,  13,  29,  ?',
    answer: '61',
    unit: 'Next =',
    hint: 'Look at the gaps (+4, +8, +16...) or try "double and add 3".',
    workedSteps: ['Differences double each time: +4, +8, +16, so next difference is +32.', '29 + 32 = 61 (or 2 × 29 + 3 = 61).']
  },

  // =========================================================================
  // CHAPTER 1 — PART 1.2: MENTAL STRATEGIES (Galore Park PDF pp. 16–22)
  // =========================================================================
  {
    id: 'ch1_2_01',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'I invest £600 for a year at 6% interest. How much interest do I earn in a year?',
    equation: '6% of £600',
    answer: '36',
    unit: '£',
    hint: '1% of £600 is £6 — multiply by 6!',
    workedSteps: ['1% of £600 = £6', '6% = 6 × £6 = £36']
  },
  {
    id: 'ch1_2_02',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'A recipe says that 10 kg of flour will make 20 loaves. How many kilograms of flour will Adriana need to make 30 loaves of the same size?',
    equation: '10 kg → 20 loaves  |  ? kg → 30 loaves',
    answer: '15',
    unit: 'kg',
    hint: 'Each loaf takes half a kilogram of flour (or multiply by 1.5).',
    workedSteps: ['10 kg makes 20 loaves → 5 kg makes 10 loaves.', '30 loaves = 3 × 5 kg = 15 kg.']
  },
  {
    id: 'ch1_2_03',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'On a trip to London, Eva spends £12.20 on the train, £10 on a taxi, £1.30 on a bus and £2.70 on the Underground. How much does the journey cost altogether?',
    equation: '£12.20 + £10 + £1.30 + £2.70',
    answer: '26.20',
    acceptedAnswers: ['26.20', '26.2'],
    unit: '£',
    hint: 'Pair £1.30 and £2.70 first — they make an exact £4.00!',
    workedSteps: ['£1.30 + £2.70 = £4.00', '£12.20 + £10 + £4.00 = £26.20']
  },
  {
    id: 'ch1_2_04',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Chris is 12 years old. Four years ago, his sister was twice his age. How old is his sister now?',
    equation: 'Chris now = 12',
    answer: '20',
    unit: 'years',
    hint: 'Find Chris’s age 4 years ago (8), double it (16), then add 4 years back to today!',
    workedSteps: ['4 years ago Chris was 12 − 4 = 8.', 'His sister was 2 × 8 = 16 four years ago.', 'Now she is 16 + 4 = 20 years old.']
  },
  {
    id: 'ch1_2_05',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'In Rugby Union, a converted try is worth 7 points and a penalty is worth 3 points. A team scores 3 converted tries and 2 penalties. What is their total score?',
    equation: '(3 × 7) + (2 × 3)',
    answer: '27',
    unit: 'points',
    hint: 'Multiply each score type, then add together.',
    workedSteps: ['3 × 7 = 21 points; 2 × 3 = 6 points.', '21 + 6 = 27 points.']
  },
  {
    id: 'ch1_2_06',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'The total cost of a coach trip for 30 people is £4200. How much will each person pay if shared equally?',
    equation: '£4200 ÷ 30',
    answer: '140',
    unit: '£',
    hint: 'Cancel a zero first: 420 ÷ 3.',
    workedSteps: ['4200 ÷ 30 = 420 ÷ 3 = £140 per person.']
  },
  {
    id: 'ch1_2_07',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Tiles are sold in packs of 10 and cost £8 per pack. A bathroom needs 200 tiles. How much will the tiles cost?',
    equation: '200 tiles ÷ 10 per pack × £8',
    answer: '160',
    unit: '£',
    hint: 'Find how many packs of 10 are in 200 first.',
    workedSteps: ['200 ÷ 10 = 20 packs.', '20 × £8 = £160.']
  },
  {
    id: 'ch1_2_08',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'A pudding for 4 people requires 320 ml of milk. How much milk (in ml) is required to feed 6 people?',
    equation: '4 people → 320 ml  |  6 people → ? ml',
    answer: '480',
    unit: 'ml',
    hint: 'Find how much milk 2 people need (half of 320 ml), then add it to 320 ml.',
    workedSteps: ['For 2 people = 160 ml.', 'For 6 people = 320 + 160 = 480 ml.']
  },
  {
    id: 'ch1_2_09',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Find the value of seven squared minus eight.',
    equation: '7² − 8',
    answer: '41',
    unit: '=',
    hint: '7 × 7 = 49, then subtract 8.',
    workedSteps: ['7² = 49', '49 − 8 = 41']
  },
  {
    id: 'ch1_2_10',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'A fire destroyed 30 out of 120 paintings in a gallery. What percentage of the paintings were destroyed?',
    equation: '30 out of 120 = ?%',
    answer: '25',
    unit: '%',
    hint: 'Simplify 30/120 first!',
    workedSteps: ['30/120 = 1/4 = 25%.']
  },
  {
    id: 'ch1_2_11',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Entry to an adventure centre is £12 per person, with a 1/4 reduction for groups of 10 or more. What is the total cost for 10 people?',
    equation: '10 × £12  (minus 1/4)',
    answer: '90',
    unit: '£',
    hint: 'Full cost is £120; take off one quarter (£30).',
    workedSteps: ['Full price for 10 = £120.', '1/4 of £120 = £30 reduction.', 'Total cost = £120 − £30 = £90.']
  },
  {
    id: 'ch1_2_12',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'At midday the temperature was 11°C. By midnight it had dropped to −3°C. By how many degrees had the temperature fallen?',
    equation: '11°C  →  −3°C',
    answer: '14',
    unit: '°C',
    hint: 'Count down 11° to reach 0°C, then another 3° to reach −3°C.',
    workedSteps: ['11 − (−3) = 11 + 3 = 14°C drop.']
  },
  {
    id: 'ch1_2_13',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Write down the total cost of six shirts which cost £9.99 each.',
    equation: '6 × £9.99',
    answer: '59.94',
    unit: '£',
    hint: 'Calculate 6 × £10, then subtract 6 pence!',
    workedSteps: ['6 × £10 = £60.00', '£60.00 − 6p = £59.94']
  },
  {
    id: 'ch1_2_14',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Five oranges cost £1.80. What would be the cost of three of the same oranges?',
    equation: '5 oranges = £1.80  |  3 oranges = ?',
    answer: '1.08',
    unit: '£',
    hint: 'Divide 180p by 5 (36p each), then multiply by 3.',
    workedSteps: ['1 orange = 180p ÷ 5 = 36p.', '3 oranges = 3 × 36p = 108p = £1.08.']
  },
  {
    id: 'ch1_2_15',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'What is the next prime number greater than 73?',
    equation: 'Next prime > 73',
    answer: '79',
    unit: 'Prime =',
    hint: 'Check odd numbers after 73: 75 (÷5), 77 (7×11)... what’s next?',
    workedSteps: ['75 = 3 × 25; 77 = 7 × 11.', '79 has no factors other than 1 and 79 → next prime is 79.']
  },
  {
    id: 'ch1_2_16',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Cans of fizzy drink cost 49p each. A multipack of 10 cans costs £4.50. How much (in pence) do you save by buying the multipack?',
    equation: '(10 × 49p) − £4.50',
    answer: '40',
    acceptedAnswers: ['40', '40p', '0.40'],
    unit: 'p',
    hint: '10 separate cans = £4.90; compare with £4.50.',
    workedSteps: ['10 × 49p = 490p = £4.90.', '£4.90 − £4.50 = 40p saved.']
  },
  {
    id: 'ch1_2_17',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'Rowan invests £600 at 3% interest per annum. How much is in his account after one year?',
    equation: '£600 + 3% interest',
    answer: '618',
    unit: '£',
    hint: 'Find 3% of £600 (£18) and add it to the original £600!',
    workedSteps: ['1% of £600 = £6 → 3% = £18.', 'Total in account = £600 + £18 = £618.']
  },
  {
    id: 'ch1_2_18',
    chapterId: 'ch1-mental',
    section: '1.2 Mental Strategies',
    prompt: 'A prize of £256 is shared equally between 8 people. How much does each person receive?',
    equation: '£256 ÷ 8',
    answer: '32',
    unit: '£',
    hint: 'Halve three times: 256 → 128 → 64 → ?',
    workedSteps: ['256 ÷ 2 = 128; ÷ 2 = 64; ÷ 2 = 32.', 'Each person receives £32.']
  },

  // =========================================================================
  // CHAPTER 2 — NUMBER (Galore Park PDF pp. 25–43)
  // =========================================================================
  {
    id: 'ch2_01',
    chapterId: 'ch2-number',
    section: '2.1 Properties of Numbers',
    prompt: 'Write 30 as a product of its prime factors (using × signs, smallest first).',
    equation: 'Prime factorisation of 30',
    answer: '2x3x5',
    acceptedAnswers: ['2x3x5', '2×3×5', '2*3*5', '2 x 3 x 5', '2 × 3 × 5'],
    unit: '30 =',
    hint: 'Divide by 2, then 3, then 5.',
    workedSteps: ['30 = 2 × 15 = 2 × 3 × 5. All three are prime!']
  },
  {
    id: 'ch2_02',
    chapterId: 'ch2-number',
    section: '2.1 Properties of Numbers',
    prompt: 'Find the value of 4³ (four cubed).',
    equation: '4³',
    answer: '64',
    unit: '=',
    hint: 'Multiply 4 × 4 × 4.',
    workedSteps: ['4 × 4 = 16', '16 × 4 = 64']
  },
  {
    id: 'ch2_03',
    chapterId: 'ch2-number',
    section: '2.2 Non-Calculator',
    prompt: 'Calculate: (3 − 5) × 2',
    equation: '(3 − 5) × 2',
    answer: '-4',
    acceptedAnswers: ['-4', '−4'],
    unit: '=',
    hint: 'Evaluate inside the brackets first: 3 − 5 = −2.',
    workedSteps: ['Brackets first: 3 − 5 = −2', 'Multiply: −2 × 2 = −4']
  },
  {
    id: 'ch2_04',
    chapterId: 'ch2-number',
    section: '2.2 Non-Calculator',
    prompt: 'Calculate: 0.02 × 0.5',
    equation: '0.02 × 0.5',
    answer: '0.01',
    unit: '=',
    hint: '2 × 5 = 10, and there are 3 decimal places altogether (0.02 has 2, 0.5 has 1).',
    workedSteps: ['2 × 5 = 10; shift 3 decimal places → 0.010 = 0.01 (half of 0.02!).']
  },
  {
    id: 'ch2_05',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'Mr Brown earns £2200 a month and spends 6% of this on train fares. How much does he spend on train fares?',
    equation: '6% of £2200',
    answer: '132',
    unit: '£',
    visual: { type: 'percent-bar', totalLabel: 'Monthly Pay £2200 (100%)', highlightPct: 6, highlightLabel: '6% Fares', remainLabel: '94% Remaining' },
    hint: 'Find 1% of £2200 (£22), then multiply by 6.',
    workedSteps: ['1% of £2200 = £22', '6% = 6 × £22 = £132']
  },
  {
    id: 'ch2_06',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'Donald drinks 460 ml from a bottle containing 2 litres of orange juice. What percentage of the 2 litres does he drink?',
    equation: '460 ml out of 2000 ml',
    answer: '23',
    unit: '%',
    hint: 'Convert 2 litres to 2000 ml, then divide both numbers by 20 to get a denominator of 100!',
    workedSteps: ['2 litres = 2000 ml.', '460 / 2000 = 23 / 100 = 23%.']
  },
  {
    id: 'ch2_07',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'Josh eats 55% of a bunch of 40 grapes. How many grapes does Josh eat?',
    equation: '55% of 40',
    answer: '22',
    unit: 'grapes',
    hint: 'Find 50% (20) plus 5% (2).',
    workedSteps: ['50% of 40 = 20; 10% = 4 so 5% = 2.', '55% = 20 + 2 = 22 grapes.']
  },
  {
    id: 'ch2_08',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'A coat originally priced at £280 is sold for £168 in a sale. Express the price reduction as a percentage of the original price.',
    equation: '£280 → £168  (% reduction)',
    answer: '40',
    unit: '%',
    visual: { type: 'percent-bar', totalLabel: 'Original £280', highlightPct: 40, highlightLabel: 'Reduction £112', remainLabel: 'Sale £168' },
    hint: 'Reduction = £280 − £168 = £112. Notice £28 is 10% of £280 — how many £28s make £112?',
    workedSteps: ['Reduction = 280 − 168 = £112.', '10% of 280 = 28, and 112 ÷ 28 = 4.', 'So the reduction is 4 × 10% = 40%.']
  },
  {
    id: 'ch2_09',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'A DVD player is in a sale with 40% off its original price of £35. What is the sale price?',
    equation: '£35 reduced by 40%',
    answer: '21',
    unit: '£',
    hint: '10% of £35 is £3.50; 40% is £14. Subtract £14 from £35.',
    workedSteps: ['10% of £35 = £3.50 → 40% = £14.', 'Sale price = £35 − £14 = £21.']
  },
  {
    id: 'ch2_10',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'Chin-Sun baked a cake from ingredients costing £20 and sold it making a 35% profit. For what price did she sell the cake?',
    equation: '£20 + 35% profit',
    answer: '27',
    unit: '£',
    hint: '10% of £20 is £2, so 35% is £7.',
    workedSteps: ['35% of £20 = 0.35 × 20 = £7 profit.', 'Selling price = £20 + £7 = £27.']
  },
  {
    id: 'ch2_11',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'Last year in Milltown there were 60 cases of flu. This year the number dropped by 35%. How many cases were reported this year?',
    equation: '60 decreased by 35%',
    answer: '39',
    unit: 'cases',
    hint: '10% of 60 = 6; 30% = 18; 5% = 3 → 35% = 21.',
    workedSteps: ['35% of 60 = 18 + 3 = 21.', '60 − 21 = 39 cases.']
  },
  {
    id: 'ch2_12',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'In a sale, Billy paid £105 for a jacket marked at 30% off. What was the ORIGINAL price before the sale? (Reverse %)',
    equation: '70% of Original = £105',
    answer: '150',
    unit: '£',
    hint: '£105 represents 70% (not 100%!). Divide by 7 to find 10%, then multiply by 10.',
    workedSteps: ['70% = £105 → 10% = £105 ÷ 7 = £15.', '100% (original price) = 10 × £15 = £150.']
  },
  {
    id: 'ch2_13',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'Pedro and Rose share 65 sweets in the ratio 8 : 5. How many sweets does Pedro receive?',
    equation: 'Share 65 in ratio 8 : 5',
    answer: '40',
    unit: 'sweets',
    visual: { type: 'ratio-bar', partsA: 8, partsB: 5, labelA: 'Pedro (8 parts)', labelB: 'Rose (5 parts)', totalLabel: 'Total = 65 sweets (13 parts)' },
    hint: '8 + 5 = 13 total parts. Divide 65 by 13 first!',
    workedSteps: ['Total parts = 8 + 5 = 13.', '1 part = 65 ÷ 13 = 5 sweets.', 'Pedro gets 8 × 5 = 40 sweets.']
  },
  {
    id: 'ch2_14',
    chapterId: 'ch2-number',
    section: '2.3 FDP & Ratio',
    prompt: 'In a box of chocolates, the ratio of hard centres to soft centres is 2 : 3. If there are 8 hard centres, how many chocolates are in the box altogether?',
    equation: 'Hard : Soft = 2 : 3  (Hard = 8)',
    answer: '20',
    unit: 'chocolates',
    visual: { type: 'ratio-bar', partsA: 2, partsB: 3, labelA: 'Hard (2 parts = 8)', labelB: 'Soft (3 parts)', totalLabel: 'Total = 5 parts' },
    hint: '2 parts = 8, so 1 part = 4. Total box = 5 parts.',
    workedSteps: ['2 parts = 8 → 1 part = 4 chocolates.', 'Total = (2 + 3) × 4 = 20 chocolates.']
  },
  {
    id: 'ch2_15',
    chapterId: 'ch2-number',
    section: '2.4 Rounding & Estimation',
    prompt: '36 857 spectators watched a rugby match. Write this number rounded to the nearest hundred.',
    equation: '36 857 (nearest 100)',
    answer: '36900',
    acceptedAnswers: ['36900', '36,900', '36 900'],
    unit: '≈',
    hint: 'Look at the tens digit (5): 5 or more rounds the hundreds digit up.',
    workedSteps: ['The tens digit is 5, so 857 rounds up to 900 → 36 900.']
  },

  // =========================================================================
  // CHAPTER 3 — ALGEBRA (Galore Park PDF pp. 47–60)
  // =========================================================================
  {
    id: 'ch3_01',
    chapterId: 'ch3-algebra',
    section: '3.1 Expressions',
    prompt: 'Multiply out the brackets and simplify: 2(5 − 3n) + 6(n − 3)',
    equation: '2(5 − 3n) + 6(n − 3)',
    answer: '-8',
    acceptedAnswers: ['-8', '−8'],
    unit: '=',
    hint: 'Watch what happens to the −6n and +6n terms when you expand!',
    workedSteps: ['2(5 − 3n) = 10 − 6n;  6(n − 3) = 6n − 18.', 'Combine: (−6n + 6n) + (10 − 18) = −8.']
  },
  {
    id: 'ch3_02',
    chapterId: 'ch3-algebra',
    section: '3.1 Expressions',
    prompt: 'Remove the brackets and simplify: 2(x + 3y) + 3(x − 2y)',
    equation: '2(x + 3y) + 3(x − 2y)',
    answer: '5x',
    unit: '=',
    hint: 'Expand both brackets carefully — notice the y terms cancel out!',
    workedSteps: ['2x + 6y + 3x − 6y = 5x + 0y = 5x.']
  },
  {
    id: 'ch3_03',
    chapterId: 'ch3-algebra',
    section: '3.1 Expressions',
    prompt: 'Factorise completely: 12a + 18',
    equation: 'Factorise  12a + 18',
    answer: '6(2a+3)',
    acceptedAnswers: ['6(2a+3)', '6(2a + 3)'],
    unit: '=',
    hint: 'Take out the HIGHEST common factor of 12 and 18 (which is 6, not just 2 or 3!).',
    workedSteps: ['HCF(12, 18) = 6.', '12a + 18 = 6(2a + 3).']
  },
  {
    id: 'ch3_04',
    chapterId: 'ch3-algebra',
    section: '3.1 Substitution',
    prompt: 'What is the value of the expression 5p − 4 when p = 6?',
    equation: '5p − 4   (p = 6)',
    answer: '26',
    unit: '=',
    hint: 'Multiply 5 × 6 first, then subtract 4.',
    workedSteps: ['5(6) − 4 = 30 − 4 = 26.']
  },
  {
    id: 'ch3_05',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for w: 3(w + 2) = 9',
    equation: '3(w + 2) = 9',
    answer: '1',
    unit: 'w =',
    visual: { type: 'balance', left: '3(w + 2)', right: '9' },
    hint: 'Divide both sides by 3 first (w + 2 = 3), or expand 3w + 6 = 9.',
    workedSteps: ['Divide by 3: w + 2 = 3', 'Subtract 2: w = 1']
  },
  {
    id: 'ch3_06',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for c: 3c − 4 = c + 2',
    equation: '3c − 4 = c + 2',
    answer: '3',
    unit: 'c =',
    visual: { type: 'balance', left: '3c − 4', right: 'c + 2' },
    hint: 'Subtract c from both sides, then add 4 to both sides.',
    workedSteps: ['2c − 4 = 2', '2c = 6 → c = 3']
  },
  {
    id: 'ch3_07',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for d: 4(d − 2) = 16',
    equation: '4(d − 2) = 16',
    answer: '6',
    unit: 'd =',
    hint: 'Divide both sides by 4 first: d − 2 = 4.',
    workedSteps: ['Divide by 4: d − 2 = 4', 'Add 2: d = 6']
  },
  {
    id: 'ch3_08',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for w: 4(w − 3) = w + 15',
    equation: '4(w − 3) = w + 15',
    answer: '9',
    unit: 'w =',
    visual: { type: 'balance', left: '4(w − 3)', right: 'w + 15' },
    hint: 'Expand left side to 4w − 12, then collect w terms on the left.',
    workedSteps: ['4w − 12 = w + 15', '3w = 27 → w = 9']
  },
  {
    id: 'ch3_09',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for v: 3v − 5 = v + 9',
    equation: '3v − 5 = v + 9',
    answer: '7',
    unit: 'v =',
    hint: 'Subtract v from both sides (2v − 5 = 9), then add 5.',
    workedSteps: ['2v − 5 = 9', '2v = 14 → v = 7']
  },
  {
    id: 'ch3_10',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for z: 5 + 3(2z − 1) = 17',
    equation: '5 + 3(2z − 1) = 17',
    answer: '2.5',
    acceptedAnswers: ['2.5', '5/2', '2 1/2'],
    unit: 'z =',
    hint: 'Subtract 5 first: 3(2z − 1) = 12, then divide by 3!',
    workedSteps: ['3(2z − 1) = 12', '2z − 1 = 4 → 2z = 5 → z = 2.5']
  },
  {
    id: 'ch3_11',
    chapterId: 'ch3-algebra',
    section: '3.3 Equations',
    prompt: 'Solve for z: z − 6 = 19 − 4z',
    equation: 'z − 6 = 19 − 4z',
    answer: '5',
    unit: 'z =',
    hint: 'Add 4z to both sides to eliminate the negative 4z on the right!',
    workedSteps: ['5z − 6 = 19', '5z = 25 → z = 5']
  },
  {
    id: 'ch3_12',
    chapterId: 'ch3-algebra',
    section: '3.4 Formulae',
    prompt: 'Using C = 5/9 (F − 32), calculate the Celsius temperature equivalent to 212°F.',
    equation: 'C = 5/9 (212 − 32)',
    answer: '100',
    unit: '°C',
    hint: 'Subtract 32 from 212 first (180), divide by 9 (20), then multiply by 5.',
    workedSteps: ['212 − 32 = 180', '180 ÷ 9 = 20', '20 × 5 = 100°C (boiling point of water!)']
  },
  {
    id: 'ch3_13',
    chapterId: 'ch3-algebra',
    section: '3.4 Formulae',
    prompt: 'Density D = M / V. The density of lead is 12 g/cm³. Calculate the volume (in cm³) of a lead toy soldier with mass 24 g.',
    equation: 'D = M / V   (D = 12, M = 24)',
    answer: '2',
    unit: 'cm³',
    hint: 'Rearrange: V = M ÷ D.',
    workedSteps: ['V = 24 ÷ 12 = 2 cm³.']
  },
  {
    id: 'ch3_14',
    chapterId: 'ch3-algebra',
    section: '3.5 Sequences',
    prompt: 'For the sequence 4, 7, 10, 13, 16, ... work out the 8th term.',
    equation: '4,  7,  10,  13,  16,  ...  → 8th term?',
    answer: '25',
    unit: '8th =',
    hint: 'The sequence adds 3 each step (nth term = 3n + 1). Substitute n = 8!',
    workedSteps: ['Rule: +3 each step (nth term = 3n + 1).', '8th term = 3(8) + 1 = 25.']
  },
  {
    id: 'ch3_15',
    chapterId: 'ch3-algebra',
    section: '3.5 Sequences',
    prompt: 'For the Fibonacci sequence 1, 1, 2, 3, 5, 8, ... work out the 8th term.',
    equation: '1,  1,  2,  3,  5,  8,  ?,  ?',
    answer: '21',
    unit: '8th =',
    hint: 'Each term is the sum of the previous two terms.',
    workedSteps: ['7th term = 5 + 8 = 13.', '8th term = 8 + 13 = 21.']
  },

  // =========================================================================
  // CHAPTER 4 — MEASUREMENT: AREA, PERIMETER, VOLUME & SPEED (PDF pp. 13, 16–20, 56)
  // =========================================================================
  {
    id: 'ch4_01',
    chapterId: 'ch4-measurement',
    section: '4.1 Units',
    prompt: 'Write 2.15 kg in grams.',
    equation: '2.15 kg = ? g',
    answer: '2150',
    unit: 'g',
    hint: '1 kg = 1000 g → multiply by 1000.',
    workedSteps: ['2.15 × 1000 = 2150 g.']
  },
  {
    id: 'ch4_02',
    chapterId: 'ch4-measurement',
    section: '4.1 Units',
    prompt: 'Write 3050 grams in kilograms.',
    equation: '3050 g = ? kg',
    answer: '3.05',
    unit: 'kg',
    hint: 'Divide by 1000.',
    workedSteps: ['3050 ÷ 1000 = 3.05 kg.']
  },
  {
    id: 'ch4_03',
    chapterId: 'ch4-measurement',
    section: '4.1 Units',
    prompt: 'Esme uses 370 g from a 1 kg bag of flour. How many grams of flour are left in the bag?',
    equation: '1 kg − 370 g',
    answer: '630',
    unit: 'g',
    hint: '1 kg = 1000 g; subtract 370.',
    workedSteps: ['1000 − 370 = 630 g remaining.']
  },
  {
    id: 'ch4_04',
    chapterId: 'ch4-measurement',
    section: '4.2 Speed, Distance & Time',
    prompt: 'A car travels 35 km in 30 minutes. What is its average speed in km/h?',
    equation: '35 km in 30 min → ? km/h',
    answer: '70',
    unit: 'km/h',
    hint: '30 minutes is half an hour — double the distance to find how far it travels in 1 full hour!',
    workedSteps: ['Speed = Distance ÷ Time = 35 ÷ 0.5 = 70 km/h.']
  },
  {
    id: 'ch4_05',
    chapterId: 'ch4-measurement',
    section: '4.2 Speed, Distance & Time',
    prompt: 'Penny jogs at a steady speed of 6 km/h. How far (in km) does she jog in 3.5 hours?',
    equation: 'Distance = 6 km/h × 3.5 h',
    answer: '21',
    unit: 'km',
    hint: '3 hours = 18 km, plus half an hour = 3 km.',
    workedSteps: ['Distance = Speed × Time = 6 × 3.5 = 18 + 3 = 21 km.']
  },
  {
    id: 'ch4_06',
    chapterId: 'ch4-measurement',
    section: '4.2 Speed, Distance & Time',
    prompt: 'Emma swims 50 lengths of a 25 m swimming pool. How far does she swim in kilometres?',
    equation: '50 × 25 m = ? km',
    answer: '1.25',
    unit: 'km',
    hint: '50 × 25 = 1250 metres; divide by 1000 to convert to km.',
    workedSteps: ['50 × 25 m = 1250 m.', '1250 ÷ 1000 = 1.25 km.']
  },
  {
    id: 'ch4_07',
    chapterId: 'ch4-measurement',
    section: '4.3 Perimeter & Area',
    prompt: 'A rectangle is 8 cm long and 5 cm wide. What is its perimeter in cm?',
    equation: 'Rectangle: 8 cm × 5 cm',
    answer: '26',
    unit: 'cm',
    hint: 'Perimeter adds ALL four sides: 2 × (length + width).',
    workedSteps: ['Perimeter = 8 + 5 + 8 + 5 = 2 × 13 = 26 cm.']
  },
  {
    id: 'ch4_08',
    chapterId: 'ch4-measurement',
    section: '4.3 Perimeter & Area',
    prompt: 'Calculate the area (in cm²) of a right-angled triangle with base 4 cm and height 3 cm.',
    equation: 'Area = ½ × base × height',
    answer: '6',
    unit: 'cm²',
    visual: { type: 'triangle', a: 'base 4 cm', b: 'height 3 cm', c: 'Area = ?' },
    hint: 'Don’t forget to halve base × height!',
    workedSteps: ['Area = ½ × 4 × 3 = 6 cm².']
  },
  {
    id: 'ch4_09',
    chapterId: 'ch4-measurement',
    section: '4.3 Perimeter & Area',
    prompt: 'Taking π = 3, calculate the area (in cm²) of a circle with radius 5 cm.',
    equation: 'A = πr²   (π ≈ 3, r = 5 cm)',
    answer: '75',
    unit: 'cm²',
    hint: 'Square the radius FIRST (5² = 25), then multiply by 3.',
    workedSteps: ['r² = 5² = 25', 'Area = 3 × 25 = 75 cm².']
  },
  {
    id: 'ch4_10',
    chapterId: 'ch4-measurement',
    section: '4.3 Perimeter & Area',
    prompt: 'A rectangular field measures 400 m by 150 m. Given 1 hectare = 10 000 m², calculate the area of the field in hectares.',
    equation: '400 m × 150 m  (÷ 10 000)',
    answer: '6',
    unit: 'hectares',
    hint: 'Multiply 400 × 150 = 60 000 m², then divide by 10 000.',
    workedSteps: ['Area = 400 × 150 = 60 000 m².', '60 000 ÷ 10 000 = 6 hectares.']
  },
  {
    id: 'ch4_11',
    chapterId: 'ch4-measurement',
    section: '4.3 Perimeter & Area',
    prompt: 'A square of side 8 cm and a triangle of base 16 cm have the SAME area. Work out the height h (in cm) of the triangle.',
    equation: 'Square (8 × 8) = Triangle (½ × 16 × h)',
    answer: '8',
    unit: 'h = cm',
    hint: 'Square area = 64 cm². Triangle area = 8h = 64.',
    workedSteps: ['Area of square = 8 × 8 = 64 cm².', '½ × 16 × h = 8h = 64 → h = 8 cm.']
  },
  {
    id: 'ch4_12',
    chapterId: 'ch4-measurement',
    section: '4.3 Volume & Surface Area',
    prompt: 'A cuboid has edges 3 cm, 4 cm and 5 cm. What is its volume in cm³?',
    equation: 'V = 3 × 4 × 5',
    answer: '60',
    unit: 'cm³',
    hint: 'Volume of a cuboid = length × width × height.',
    workedSteps: ['V = 3 × 4 × 5 = 12 × 5 = 60 cm³.']
  },
  {
    id: 'ch4_13',
    chapterId: 'ch4-measurement',
    section: '4.3 Volume & Surface Area',
    prompt: 'A cube has edges of length 2 cm. What is its TOTAL surface area in cm²?',
    equation: 'Cube edge = 2 cm  (6 square faces)',
    answer: '24',
    unit: 'cm²',
    hint: 'Each face has area 2 × 2 = 4 cm², and a cube has 6 faces.',
    workedSteps: ['Area of 1 face = 2 × 2 = 4 cm².', 'Total surface area = 6 × 4 = 24 cm².']
  },
  {
    id: 'ch4_14',
    chapterId: 'ch4-measurement',
    section: '4.3 Volume & Surface Area',
    prompt: 'How many cubic boxes of edge 0.5 m can fit into a packing case measuring 3 m by 2 m by 1 m?',
    equation: '(3 ÷ 0.5) × (2 ÷ 0.5) × (1 ÷ 0.5)',
    answer: '48',
    unit: 'boxes',
    hint: 'Two 0.5 m edges fit into every 1 metre: so 6 × 4 × 2 boxes!',
    workedSteps: ['Along 3 m: 6 boxes; along 2 m: 4 boxes; along 1 m: 2 boxes.', 'Total = 6 × 4 × 2 = 48 boxes.']
  },

  // =========================================================================
  // CHAPTER 5 — GEOMETRY & ANGLES (PDF Ch 1.1 Q123–140 & Ch 5 CE 13+ Spec)
  // =========================================================================
  {
    id: 'ch5_01',
    chapterId: 'ch5-geometry',
    section: '5.1 Solid Shapes',
    prompt: 'How many faces does a square-based pyramid have?',
    equation: 'Square-based pyramid: faces?',
    answer: '5',
    unit: 'faces',
    hint: '1 square base + 4 triangular side faces.',
    workedSteps: ['1 square base + 4 triangular faces = 5 faces.']
  },
  {
    id: 'ch5_02',
    chapterId: 'ch5-geometry',
    section: '5.1 Solid Shapes',
    prompt: 'How many edges does a tetrahedron (triangular-based pyramid) have?',
    equation: 'Tetrahedron: edges?',
    answer: '6',
    unit: 'edges',
    hint: '3 edges around the triangular base + 3 sloping edges meeting at the apex.',
    workedSteps: ['3 base edges + 3 sloping edges = 6 edges.']
  },
  {
    id: 'ch5_03',
    chapterId: 'ch5-geometry',
    section: '5.1 Solid Shapes',
    prompt: 'How many vertices (corners) does a triangular prism have?',
    equation: 'Triangular prism: vertices?',
    answer: '6',
    unit: 'vertices',
    hint: 'There is a triangle (3 corners) at each of the two ends.',
    workedSteps: ['3 vertices on the front triangle + 3 on the back triangle = 6 vertices.']
  },
  {
    id: 'ch5_04',
    chapterId: 'ch5-geometry',
    section: '5.2 Angle Calculations',
    prompt: 'Through how many degrees does the minute hand of a clock turn in 50 minutes?',
    equation: '50 / 60 of 360°',
    answer: '300',
    unit: '°',
    hint: 'A full 60 minutes is 360°, so each minute is 6° (or 10 minutes = 60°).',
    workedSteps: ['360° ÷ 60 = 6° per minute.', '50 × 6° = 300°.']
  },
  {
    id: 'ch5_05',
    chapterId: 'ch5-geometry',
    section: '5.2 Angle Calculations',
    prompt: 'Two angles in a triangle measure 48° and 67°. Calculate the third angle x in degrees.',
    equation: '48° + 67° + x° = 180°',
    answer: '65',
    unit: '°',
    visual: { type: 'triangle', a: '48°', b: '67°', c: 'x°' },
    hint: 'Interior angles in any triangle always sum to 180°.',
    workedSteps: ['48° + 67° = 115°', 'x = 180° − 115° = 65°']
  },
  {
    id: 'ch5_06',
    chapterId: 'ch5-geometry',
    section: '5.2 Angle Calculations',
    prompt: 'Two angles lie on a straight line: (2x + 15)° and (3x + 15)°. Find the value of x.',
    equation: '(2x + 15) + (3x + 15) = 180',
    answer: '30',
    unit: 'x =',
    visual: { type: 'straight-line', leftLabel: '2x + 15°', rightLabel: '3x + 15°' },
    hint: 'Angles on a straight line add up to 180°.',
    workedSteps: ['5x + 30 = 180', '5x = 150 → x = 30']
  },
  {
    id: 'ch5_07',
    chapterId: 'ch5-geometry',
    section: '5.2 Polygons',
    prompt: 'Calculate the size of ONE interior angle (in degrees) of a regular hexagon (6 equal sides).',
    equation: 'Regular Hexagon (n = 6)',
    answer: '120',
    unit: '°',
    visual: { type: 'polygon', sides: 6, label: 'Regular Hexagon' },
    hint: 'Exterior angle = 360° ÷ 6 = 60°; Interior = 180° − Exterior.',
    workedSteps: ['Exterior angle = 360° ÷ 6 = 60°.', 'Interior angle = 180° − 60° = 120°.']
  },
  {
    id: 'ch5_08',
    chapterId: 'ch5-geometry',
    section: '5.2 Polygons',
    prompt: 'Calculate the sum of all interior angles of a pentagon (5 sides).',
    equation: '(n − 2) × 180°   (n = 5)',
    answer: '540',
    unit: '°',
    visual: { type: 'polygon', sides: 5, label: 'Pentagon (5 sides)' },
    hint: 'A pentagon splits into 3 triangles from one vertex: 3 × 180°.',
    workedSteps: ['(5 − 2) × 180° = 3 × 180° = 540°.']
  },
  {
    id: 'ch5_09',
    chapterId: 'ch5-geometry',
    section: '5.4 Enlargement',
    prompt: 'A photograph measuring 6 cm by 9 cm is enlarged by scale factor 2. What is the perimeter (in cm) of the enlarged photograph?',
    equation: 'Original: 6 cm × 9 cm  |  SF = 2',
    answer: '60',
    unit: 'cm',
    hint: 'Enlarged dimensions are 12 cm by 18 cm (or double the original perimeter of 30 cm!).',
    workedSteps: ['Original perimeter = 2 × (6 + 9) = 30 cm.', 'Scale factor 2 doubles perimeter: 2 × 30 = 60 cm.']
  },
  {
    id: 'ch5_10',
    chapterId: 'ch5-geometry',
    section: '5.5 Pythagoras’ Theorem',
    prompt: 'A right-angled triangle has two shorter sides of 6 cm and 8 cm. Calculate the length of the hypotenuse (in cm).',
    equation: '6² + 8² = c²',
    answer: '10',
    unit: 'cm',
    hint: 'Use Pythagoras: a² + b² = c². Notice 3-4-5 doubled!',
    workedSteps: ['6² + 8² = 36 + 64 = 100', 'c = √100 = 10 cm']
  },

  // =========================================================================
  // CHAPTER 6 — PROBABILITY & STATISTICS (PDF Ch 1.2 & Ch 6 CE 13+ Spec)
  // =========================================================================
  {
    id: 'ch6_01',
    chapterId: 'ch6-stats',
    section: '6.2 Averages',
    prompt: 'The masses of three packets are 95 g, 45 g and 70 g. What is the mean mass (in grams)?',
    equation: 'Mean of 95,  45,  70',
    answer: '70',
    unit: 'g',
    hint: 'Add all three numbers (95 + 45 = 140, + 70 = 210), then divide by 3.',
    workedSteps: ['Sum = 95 + 45 + 70 = 210 g.', 'Mean = 210 ÷ 3 = 70 g.']
  },
  {
    id: 'ch6_02',
    chapterId: 'ch6-stats',
    section: '6.2 Averages',
    prompt: 'From this list of scores, write down the MODE:  6,  5,  8,  3,  3,  9,  3,  6,  9',
    equation: '6,  5,  8,  3,  3,  9,  3,  6,  9',
    answer: '3',
    unit: 'Mode =',
    hint: 'The mode is the score that appears MOST often.',
    workedSteps: ['3 appears three times, more than any other score → Mode = 3.']
  },
  {
    id: 'ch6_03',
    chapterId: 'ch6-stats',
    section: '6.2 Averages',
    prompt: 'Find the MEDIAN of these seven numbers:  14,  8,  21,  11,  19,  8,  16',
    equation: '14,  8,  21,  11,  19,  8,  16',
    answer: '14',
    unit: 'Median =',
    hint: 'ALWAYS put the numbers in order from smallest to largest first!',
    workedSteps: ['Ordered: 8, 8, 11, 14, 16, 19, 21.', 'The middle (4th) value is 14.']
  },
  {
    id: 'ch6_04',
    chapterId: 'ch6-stats',
    section: '6.2 Reverse Mean',
    prompt: 'Mickey is thinking of three numbers. Their mean is 30, the largest number is 46, and the difference between the two smaller numbers is 2. What is the smallest number?',
    equation: 'Mean of 3 numbers = 30  |  Largest = 46',
    answer: '21',
    unit: 'Smallest =',
    hint: 'Total of all 3 numbers = 3 × 30 = 90. Subtract 46 to find the sum of the two smaller numbers (44)!',
    workedSteps: ['Total sum = 3 × 30 = 90.', 'Two smaller numbers sum to 90 − 46 = 44.', 'Two numbers summing to 44 with difference 2 are 21 and 23 → smallest = 21.']
  },
  {
    id: 'ch6_05',
    chapterId: 'ch6-stats',
    section: '6.1 Probability',
    prompt: 'There are 26 people in a youth group and 14 of them are boys. What is the probability (as a simplified fraction) that a person chosen at random is NOT a boy?',
    equation: 'Not a boy = ? / 26  (simplify)',
    answer: '6/13',
    unit: 'P =',
    hint: '26 − 14 = 12 are not boys. Simplify 12/26 by dividing top and bottom by 2.',
    workedSteps: ['Not boys = 26 − 14 = 12.', 'Probability = 12/26 = 6/13.']
  },
  {
    id: 'ch6_06',
    chapterId: 'ch6-stats',
    section: '6.1 Probability',
    prompt: 'In a school of 400 students, 120 sing in the choir. What is the probability (as a decimal) that a student chosen at random does NOT sing in the choir?',
    equation: '(400 − 120) / 400',
    answer: '0.7',
    acceptedAnswers: ['0.7', '0.70', '7/10', '70%'],
    unit: 'P =',
    hint: '280 out of 400 do not sing in the choir. Simplify 280/400 = 7/10.',
    workedSteps: ['Not in choir = 400 − 120 = 280.', '280 / 400 = 28 / 40 = 7 / 10 = 0.7.']
  },

  // =========================================================================
  // CHAPTER 7 — PUZZLES & REASONING PROBLEMS (PDF Ch 1.2 Q71–80 & Ch 7 Spec)
  // =========================================================================
  {
    id: 'ch7_01',
    chapterId: 'ch7-puzzles',
    section: '7.1 Number Reasoning',
    prompt: 'Chloe thinks of two prime numbers whose sum is 80 and difference is 6. What is the LARGER prime number?',
    equation: 'p + q = 80   and   p − q = 6',
    answer: '43',
    unit: 'Larger =',
    hint: 'Add 80 + 6 = 86 and halve it to find the larger number (then check both are prime!).',
    workedSteps: ['Larger = (80 + 6) ÷ 2 = 43; Smaller = 80 − 43 = 37.', 'Both 37 and 43 are prime! Answer = 43.']
  },
  {
    id: 'ch7_02',
    chapterId: 'ch7-puzzles',
    section: '7.1 Number Reasoning',
    prompt: 'Darcey thinks of a positive number. She squares it and then subtracts her original number to get 30. What is her number?',
    equation: 'n² − n = 30',
    answer: '6',
    unit: 'n =',
    hint: 'Notice n² − n = n(n − 1): two consecutive numbers multiplying to 30!',
    workedSteps: ['n(n − 1) = 30 → 6 × 5 = 30.', 'Check: 6² − 6 = 36 − 6 = 30 → n = 6.']
  },
  {
    id: 'ch7_03',
    chapterId: 'ch7-puzzles',
    section: '7.1 Number Reasoning',
    prompt: 'Lucy is twice as old as she was six years ago. How old will she be in THREE years’ time?',
    equation: 'L = 2(L − 6)  →  find L + 3',
    answer: '15',
    unit: 'years',
    hint: 'Solve L = 2(L − 6) to get Lucy’s age now (12), then remember to add 3 years!',
    workedSteps: ['L = 2L − 12 → L = 12 years old now.', 'In 3 years’ time: 12 + 3 = 15.']
  },
  {
    id: 'ch7_04',
    chapterId: 'ch7-puzzles',
    section: '7.1 Number Reasoning',
    prompt: 'Thea thinks of a NEGATIVE number. She squares it and adds twice her original number to get 8. What is her negative number?',
    equation: 'n² + 2n = 8   (n < 0)',
    answer: '-4',
    acceptedAnswers: ['-4', '−4'],
    unit: 'n =',
    hint: 'Test negative integers: −2 → 4−4=0; −3 → 9−6=3; try −4!',
    workedSteps: ['Try n = −4: (−4)² + 2(−4) = 16 − 8 = 8 ✓', 'So her negative number is −4.']
  },
  {
    id: 'ch7_05',
    chapterId: 'ch7-puzzles',
    section: '7.1 Logic & Permutations',
    prompt: 'Nico has forgotten his 4-digit PIN, but all four digits are DIFFERENT prime numbers and the first digit is 2. How many attempts at most does he need to be certain to unlock it?',
    equation: 'Digits from {2, 3, 5, 7}, first = 2',
    answer: '6',
    unit: 'attempts',
    hint: 'The only single-digit primes are 2, 3, 5, 7. With 2 fixed first, how many ways can you arrange {3, 5, 7}?',
    workedSteps: ['Single-digit primes: 2, 3, 5, 7. First digit is 2.', 'Remaining 3 digits {3, 5, 7} can be arranged in 3 × 2 × 1 = 6 ways.']
  },
  {
    id: 'ch7_06',
    chapterId: 'ch7-puzzles',
    section: '7.2 Real-Life Problems',
    prompt: 'Ahmed bought a coin at a car boot sale and sold it to a dealer for a 60% profit. The dealer sold it to a collector for £40, making a 150% profit. How much (in £) did Ahmed originally pay?',
    equation: 'Ahmed → (+60%) → Dealer → (+150%) → £40',
    answer: '10',
    unit: '£',
    hint: 'Work backwards! A 150% profit means the collector paid 250% (2.5×) of the dealer’s buying price.',
    workedSteps: ['Dealer’s buying price = £40 ÷ 2.5 = £16.', 'Ahmed made 60% profit, so £16 = 160% (1.6×) of Ahmed’s cost.', 'Ahmed paid £16 ÷ 1.6 = £10.']
  }
]

const CHAPTER_PROGRESS_KEY = 'observatory-maths-chapters-v1'

export function readMathsChapterProgress() {
  try {
    const raw = localStorage.getItem(CHAPTER_PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveMathsChapterResult(chapterId, { correct, total }) {
  const current = readMathsChapterProgress()
  const prev = current[chapterId] || { bestCorrect: 0, total, attempts: 0 }
  current[chapterId] = {
    bestCorrect: Math.max(prev.bestCorrect || 0, correct),
    total,
    attempts: (prev.attempts || 0) + 1,
    lastPlayedAt: Date.now()
  }
  try {
    localStorage.setItem(CHAPTER_PROGRESS_KEY, JSON.stringify(current))
  } catch {
    // ignore
  }
  return current
}

export function normalizeMathsInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/−/g, '-')
    .replace(/[£°,\s]/g, '')
}

export function isMathsAnswerCorrect(given, question) {
  const normGiven = normalizeMathsInput(given)
  if (!normGiven) return false
  const candidates = Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0
    ? question.acceptedAnswers
    : [question.answer]
  return candidates.some(ans => normalizeMathsInput(ans) === normGiven)
}
