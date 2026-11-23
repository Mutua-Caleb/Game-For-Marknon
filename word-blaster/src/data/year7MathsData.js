/**
 * Year 7 British Curriculum Maths Forge (KS3 / White Rose / 11+–13+ ISEB)
 * Every challenge includes an interactive SVG visual model + step-by-step worked method.
 */

export const MATHS_STRANDS = [
  { id: 'all', label: 'All Year 7 Strands' },
  { id: 'algebra', label: 'Algebra & Equations' },
  { id: 'fdp', label: 'Fractions & Percentages' },
  { id: 'ratio', label: 'Ratio & Proportion' },
  { id: 'geometry', label: 'Geometry & Angles' }
]

export const YEAR7_MATHS_CHALLENGES = [
  // ==========================================
  // ALGEBRA & EQUATIONS
  // ==========================================
  {
    id: 'y7m_alg_01',
    strand: 'algebra',
    strandLabel: 'Algebra & Equations',
    title: 'Balancing Two-Step Equations',
    prompt: 'The balance scale is completely level. Solve for the value of x:',
    equation: '3x + 7 = 28',
    answer: '7',
    unit: 'x =',
    visual: { type: 'balance', left: '3x + 7', right: '28' },
    hint: 'Keep both sides balanced: remove 7 from both pans first, then divide equally into 3 groups.',
    workedSteps: [
      'Subtract 7 from both sides: 3x = 28 − 7 = 21',
      'Divide both sides by 3: x = 21 ÷ 3 = 7',
      'Check: 3(7) + 7 = 21 + 7 = 28 ✓'
    ]
  },
  {
    id: 'y7m_alg_02',
    strand: 'algebra',
    strandLabel: 'Algebra & Equations',
    title: 'Unknowns on Both Sides',
    prompt: 'Solve this equation where x appears on both pans of the scale:',
    equation: '5x − 4 = 2x + 11',
    answer: '5',
    unit: 'x =',
    visual: { type: 'balance', left: '5x − 4', right: '2x + 11' },
    hint: 'Collect the x terms on the left by subtracting 2x from both sides first.',
    workedSteps: [
      'Subtract 2x from both sides: 3x − 4 = 11',
      'Add 4 to both sides: 3x = 15',
      'Divide by 3: x = 5 (Check: 25 − 4 = 21 and 10 + 11 = 21 ✓)'
    ]
  },
  {
    id: 'y7m_alg_03',
    strand: 'algebra',
    strandLabel: 'Algebra & Equations',
    title: 'Substitution with Directed Numbers',
    prompt: 'If n = −4, calculate the exact value of the expression 3n² − 10:',
    equation: '3n² − 10   (n = −4)',
    answer: '38',
    unit: 'Value =',
    visual: { type: 'balance', left: '3 × (−4)² − 10', right: '?' },
    hint: 'Follow BIDMAS carefully: square (−4) BEFORE multiplying by 3. Remember negative × negative = positive!',
    workedSteps: [
      'Indices first: (−4)² = (−4) × (−4) = +16',
      'Multiply by 3: 3 × 16 = 48',
      'Subtract 10: 48 − 10 = 38'
    ]
  },

  // ==========================================
  // FRACTIONS, DECIMALS & PERCENTAGES
  // ==========================================
  {
    id: 'y7m_fdp_01',
    strand: 'fdp',
    strandLabel: 'Fractions & Percentages',
    title: 'Percentage Decrease (Sale Price)',
    prompt: 'A scientific telescope normally costs £120. It is discounted by 15%. What is the new sale price in £?',
    equation: '£120 reduced by 15%',
    answer: '102',
    unit: '£',
    visual: { type: 'percent-bar', totalLabel: '£120 (100%)', highlightPct: 15, highlightLabel: '−15% off', remainLabel: '85% Sale Price' },
    hint: 'Find 10% first (£12), then halve it to get 5% (£6). Add them to get 15%!',
    workedSteps: [
      '10% of £120 = £12',
      '5% of £120 = £6 → so 15% = £12 + £6 = £18',
      'Sale price = £120 − £18 = £102'
    ]
  },
  {
    id: 'y7m_fdp_02',
    strand: 'fdp',
    strandLabel: 'Fractions & Percentages',
    title: 'Reverse Percentage / Finding the Whole',
    prompt: 'Three-fifths (3/5) of the pupils in Year 7 travel by train. If 48 pupils travel by train, how many pupils are in Year 7 altogether?',
    equation: '3/5 of Total = 48',
    answer: '80',
    unit: 'pupils =',
    visual: { type: 'ratio-bar', partsA: 3, partsB: 2, labelA: 'Train (3 parts = 48)', labelB: 'Other (2 parts)', totalLabel: 'Total Year 7 = ?' },
    hint: 'Use the bar model: if 3 equal blocks equal 48, find 1 block first, then multiply by all 5 blocks.',
    workedSteps: [
      '3 fifths = 48 pupils',
      '1 fifth = 48 ÷ 3 = 16 pupils',
      '5 fifths (the whole year group) = 16 × 5 = 80 pupils'
    ]
  },
  {
    id: 'y7m_fdp_03',
    strand: 'fdp',
    strandLabel: 'Fractions & Percentages',
    title: 'Percentage Increase',
    prompt: 'A rare book bought for £60 increases in value by 35%. What is its new value in £?',
    equation: '£60 increased by 35%',
    answer: '81',
    unit: '£',
    visual: { type: 'percent-bar', totalLabel: 'Original £60 (100%)', highlightPct: 35, highlightLabel: '+35% gain', remainLabel: 'New = 135%' },
    hint: 'Break 35% into 10% × 3 + 5%.',
    workedSteps: [
      '10% of £60 = £6 → 30% = £18',
      '5% of £60 = £3 → so 35% = £18 + £3 = £21',
      'New value = £60 + £21 = £81'
    ]
  },

  // ==========================================
  // RATIO & PROPORTION
  // ==========================================
  {
    id: 'y7m_rat_01',
    strand: 'ratio',
    strandLabel: 'Ratio & Proportion',
    title: 'Sharing in a Given Ratio',
    prompt: 'Amara and Leo share £72 in the ratio 5 : 4. How much does Amara (the larger share) receive in £?',
    equation: 'Share £72 in ratio 5 : 4',
    answer: '40',
    unit: '£',
    visual: { type: 'ratio-bar', partsA: 5, partsB: 4, labelA: 'Amara (5 parts)', labelB: 'Leo (4 parts)', totalLabel: 'Total = £72 (9 parts)' },
    hint: 'Count the total equal parts in the bar model (5 + 4 = 9) and divide £72 by 9 to find 1 part.',
    workedSteps: [
      'Total parts = 5 + 4 = 9 parts',
      'Value of 1 part = £72 ÷ 9 = £8',
      'Amara’s share = 5 × £8 = £40 (Leo gets 4 × £8 = £32; £40 + £32 = £72 ✓)'
    ]
  },
  {
    id: 'y7m_rat_02',
    strand: 'ratio',
    strandLabel: 'Ratio & Proportion',
    title: 'Ratio Difference Problem',
    prompt: 'In a jar of marbles, the ratio of Blue to Gold is 7 : 3. There are 24 MORE Blue marbles than Gold marbles. How many Gold marbles are there?',
    equation: 'Blue : Gold = 7 : 3  (Difference = 24)',
    answer: '18',
    unit: 'Gold =',
    visual: { type: 'ratio-bar', partsA: 7, partsB: 3, labelA: 'Blue (7 parts)', labelB: 'Gold (3 parts)', totalLabel: 'Extra 4 parts = 24' },
    hint: 'Blue has 7 − 3 = 4 more parts than Gold, and those 4 parts equal 24 marbles!',
    workedSteps: [
      'Difference in parts = 7 − 3 = 4 parts',
      '4 parts = 24 marbles → 1 part = 24 ÷ 4 = 6 marbles',
      'Gold marbles = 3 parts = 3 × 6 = 18 marbles'
    ]
  },

  // ==========================================
  // GEOMETRY & ANGLES
  // ==========================================
  {
    id: 'y7m_geo_01',
    strand: 'geometry',
    strandLabel: 'Geometry & Angles',
    title: 'Angles in a Triangle',
    prompt: 'Calculate the missing interior angle x (in degrees) of the triangle shown:',
    equation: '48° + 67° + x° = 180°',
    answer: '65',
    unit: 'x = °',
    visual: { type: 'triangle', a: '48°', b: '67°', c: 'x°' },
    hint: 'Interior angles of every triangle always sum to 180°.',
    workedSteps: [
      'Add the two known angles: 48° + 67° = 115°',
      'Subtract from 180°: x = 180° − 115° = 65°'
    ]
  },
  {
    id: 'y7m_geo_02',
    strand: 'geometry',
    strandLabel: 'Geometry & Angles',
    title: 'Algebraic Angles on a Straight Line',
    prompt: 'Two angles lie on a straight line: one measures (2x + 15)° and the other measures (3x + 15)°. Find x:',
    equation: '(2x + 15) + (3x + 15) = 180',
    answer: '30',
    unit: 'x =',
    visual: { type: 'straight-line', leftLabel: '2x + 15°', rightLabel: '3x + 15°' },
    hint: 'Angles on a straight line add up to 180°. Combine like terms to form a simple equation!',
    workedSteps: [
      'Sum on straight line = 180°: (2x + 15) + (3x + 15) = 180',
      'Simplify: 5x + 30 = 180',
      'Subtract 30: 5x = 150 → Divide by 5: x = 30'
    ]
  },
  {
    id: 'y7m_geo_03',
    strand: 'geometry',
    strandLabel: 'Geometry & Angles',
    title: 'Interior Angle of a Regular Hexagon',
    prompt: 'Find the size of ONE interior angle (in degrees) of a regular hexagon (6 equal sides):',
    equation: 'Regular Hexagon (n = 6)',
    answer: '120',
    unit: 'Angle = °',
    visual: { type: 'polygon', sides: 6, label: 'Regular Hexagon' },
    hint: 'Total interior sum is (n − 2) × 180°. Then divide equally by 6 corners (or use exterior angle 360° ÷ 6 = 60°)!',
    workedSteps: [
      'Fastest British KS3 method: Exterior angle = 360° ÷ 6 = 60°',
      'Interior + Exterior = 180° (straight line)',
      'One interior angle = 180° − 60° = 120°'
    ]
  }
]
