/**
 * CAT4 (Cognitive Abilities Test — Year 6 / Year 7, Levels C–D) Puzzle Bank
 * Covers all 4 official CAT4 batteries:
 * 1. Non-Verbal Reasoning (SVG 3x3 Matrices)
 * 2. Spatial Ability (SVG Paper Folding & Hole Punching with Unfold Symmetry)
 * 3. Quantitative Reasoning (Number Analogies & Number Series)
 * 4. Verbal Reasoning (Verbal Classification & Analogies)
 */

export const CAT4_BATTERIES = [
  { id: 'all', label: 'All Batteries' },
  { id: 'non-verbal', label: 'Non-Verbal Matrices' },
  { id: 'spatial', label: 'Spatial Folding' },
  { id: 'quantitative', label: 'Quantitative' },
  { id: 'verbal', label: 'Verbal Logic' }
]

/**
 * Helper to compute unfolded hole coordinates on a 4x4 grid (0..3, 0..3)
 * given a sequence of folds and initial punch coordinates in the folded region.
 * Folds supported:
 *  - 'left-to-right' (folds left half x:0..1 onto right half x:2..3, symmetry axis x=1.5)
 *  - 'right-to-left' (folds right half onto left half, symmetry axis x=1.5)
 *  - 'top-to-bottom' (folds top half y:0..1 onto bottom half y:2..3, symmetry axis y=1.5)
 *  - 'bottom-to-top' (folds bottom half onto top half, symmetry axis y=1.5)
 *  - 'diag-tl-br' (folds across main diagonal y = x)
 */
export function computeUnfoldedHoles(folds, punches) {
  let pts = punches.map(([x, y]) => [x, y])
  // Unfold in reverse order
  for (let i = folds.length - 1; i >= 0; i -= 1) {
    const fold = folds[i]
    const mirrored = []
    for (const [x, y] of pts) {
      mirrored.push([x, y])
      if (fold === 'left-to-right' || fold === 'right-to-left') {
        mirrored.push([3 - x, y])
      } else if (fold === 'top-to-bottom' || fold === 'bottom-to-top') {
        mirrored.push([x, 3 - y])
      } else if (fold === 'diag-tl-br') {
        mirrored.push([y, x])
      } else if (fold === 'diag-tr-bl') {
        mirrored.push([3 - y, 3 - x])
      }
    }
    // Deduplicate
    const seen = new Set()
    pts = mirrored.filter(([x, y]) => {
      const k = `${x},${y}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }
  return pts
}

export const CAT4_PUZZLES = [
  // ========================================================
  // BATTERY 1: NON-VERBAL REASONING (3x3 SVG MATRICES)
  // ========================================================
  {
    id: 'nvr_mat_01',
    battery: 'non-verbal',
    subtype: 'Figure Matrix',
    prompt: 'Which tile completes the 3 × 3 pattern matrix?',
    // Each cell: { shape: 'circle'|'square'|'triangle'|'diamond'|'arrow'|'hex', fill: 'solid'|'outline'|'striped', rotate: deg, dots: number, color: hex }
    matrix: [
      { shape: 'triangle', fill: 'solid', rotate: 0, dots: 0, color: '#818cf8' },
      { shape: 'triangle', fill: 'striped', rotate: 90, dots: 0, color: '#818cf8' },
      { shape: 'triangle', fill: 'outline', rotate: 180, dots: 0, color: '#818cf8' },

      { shape: 'square', fill: 'solid', rotate: 0, dots: 0, color: '#22d3ee' },
      { shape: 'square', fill: 'striped', rotate: 45, dots: 0, color: '#22d3ee' },
      { shape: 'square', fill: 'outline', rotate: 90, dots: 0, color: '#22d3ee' },

      { shape: 'arrow', fill: 'solid', rotate: 0, dots: 0, color: '#f5b942' },
      { shape: 'arrow', fill: 'striped', rotate: 90, dots: 0, color: '#f5b942' },
      null
    ],
    options: [
      { id: 'A', spec: { shape: 'arrow', fill: 'outline', rotate: 180, dots: 0, color: '#f5b942' } },
      { id: 'B', spec: { shape: 'arrow', fill: 'solid', rotate: 180, dots: 0, color: '#f5b942' } },
      { id: 'C', spec: { shape: 'arrow', fill: 'outline', rotate: 270, dots: 0, color: '#f5b942' } },
      { id: 'D', spec: { shape: 'triangle', fill: 'outline', rotate: 180, dots: 0, color: '#f5b942' } },
      { id: 'E', spec: { shape: 'arrow', fill: 'striped', rotate: 180, dots: 0, color: '#f5b942' } }
    ],
    correctOptionId: 'A',
    hint: 'Track two independent rules moving left to right: rotation angle and shading style.',
    explanation: 'Across every row, shading progresses Solid → Striped → Outline, and the arrow/triangle rotates 90° clockwise each column (0° → 90° → 180°). Therefore the missing tile is an Outline Arrow pointing down (180°).'
  },
  {
    id: 'nvr_mat_02',
    battery: 'non-verbal',
    subtype: 'Figure Matrix',
    prompt: 'Identify the missing geometric tile that satisfies both row and column rules.',
    matrix: [
      { shape: 'circle', fill: 'outline', rotate: 0, dots: 1, color: '#22d3ee' },
      { shape: 'square', fill: 'outline', rotate: 0, dots: 2, color: '#818cf8' },
      { shape: 'hex', fill: 'outline', rotate: 0, dots: 3, color: '#34d399' },

      { shape: 'square', fill: 'striped', rotate: 0, dots: 2, color: '#818cf8' },
      { shape: 'hex', fill: 'striped', rotate: 0, dots: 3, color: '#34d399' },
      { shape: 'circle', fill: 'striped', rotate: 0, dots: 1, color: '#22d3ee' },

      { shape: 'hex', fill: 'solid', rotate: 0, dots: 3, color: '#34d399' },
      { shape: 'circle', fill: 'solid', rotate: 0, dots: 1, color: '#22d3ee' },
      null
    ],
    options: [
      { id: 'A', spec: { shape: 'square', fill: 'outline', rotate: 0, dots: 2, color: '#818cf8' } },
      { id: 'B', spec: { shape: 'square', fill: 'solid', rotate: 0, dots: 3, color: '#818cf8' } },
      { id: 'C', spec: { shape: 'square', fill: 'solid', rotate: 0, dots: 2, color: '#818cf8' } },
      { id: 'D', spec: { shape: 'hex', fill: 'solid', rotate: 0, dots: 2, color: '#34d399' } },
      { id: 'E', spec: { shape: 'circle', fill: 'solid', rotate: 0, dots: 2, color: '#22d3ee' } }
    ],
    correctOptionId: 'C',
    hint: 'Each row contains all three shapes (Circle, Square, Hexagon) once, and each shape always carries its own dot count.',
    explanation: 'Every row is a Latin square of Circle (1 dot), Square (2 dots), and Hexagon (3 dots). Row 3 uses Solid fill and already has Hexagon and Circle, so it needs the Solid Square with 2 dots.'
  },
  {
    id: 'nvr_mat_03',
    battery: 'non-verbal',
    subtype: 'Figure Matrix',
    prompt: 'Observe how both orientation and internal dots evolve across the grid.',
    matrix: [
      { shape: 'arrow', fill: 'outline', rotate: 0, dots: 1, color: '#38bdf8' },
      { shape: 'arrow', fill: 'outline', rotate: 90, dots: 2, color: '#38bdf8' },
      { shape: 'arrow', fill: 'outline', rotate: 180, dots: 3, color: '#38bdf8' },

      { shape: 'arrow', fill: 'outline', rotate: 90, dots: 1, color: '#a78bfa' },
      { shape: 'arrow', fill: 'outline', rotate: 180, dots: 2, color: '#a78bfa' },
      { shape: 'arrow', fill: 'outline', rotate: 270, dots: 3, color: '#a78bfa' },

      { shape: 'arrow', fill: 'outline', rotate: 180, dots: 1, color: '#34d399' },
      { shape: 'arrow', fill: 'outline', rotate: 270, dots: 2, color: '#34d399' },
      null
    ],
    options: [
      { id: 'A', spec: { shape: 'arrow', fill: 'outline', rotate: 90, dots: 3, color: '#34d399' } },
      { id: 'B', spec: { shape: 'arrow', fill: 'outline', rotate: 0, dots: 3, color: '#34d399' } },
      { id: 'C', spec: { shape: 'arrow', fill: 'outline', rotate: 0, dots: 2, color: '#34d399' } },
      { id: 'D', spec: { shape: 'arrow', fill: 'solid', rotate: 0, dots: 3, color: '#34d399' } },
      { id: 'E', spec: { shape: 'arrow', fill: 'outline', rotate: 180, dots: 3, color: '#34d399' } }
    ],
    correctOptionId: 'B',
    hint: 'Moving right adds +90° clockwise AND +1 dot. What is 270° + 90°?',
    explanation: 'Each step to the right rotates the arrow 90° clockwise and adds one dot. In Row 3: 180° (1 dot) → 270° (2 dots) → 360° / 0° pointing UP (3 dots).'
  },
  {
    id: 'nvr_mat_04',
    battery: 'non-verbal',
    subtype: 'Figure Matrix',
    prompt: 'Find the missing tile by combining the row shape rule with the column shading rule.',
    matrix: [
      { shape: 'diamond', fill: 'solid', rotate: 0, dots: 1, color: '#f472b6' },
      { shape: 'diamond', fill: 'outline', rotate: 0, dots: 2, color: '#f472b6' },
      { shape: 'diamond', fill: 'striped', rotate: 0, dots: 3, color: '#f472b6' },

      { shape: 'triangle', fill: 'solid', rotate: 0, dots: 1, color: '#fbbf24' },
      { shape: 'triangle', fill: 'outline', rotate: 0, dots: 2, color: '#fbbf24' },
      { shape: 'triangle', fill: 'striped', rotate: 0, dots: 3, color: '#fbbf24' },

      { shape: 'hex', fill: 'solid', rotate: 0, dots: 1, color: '#38bdf8' },
      { shape: 'hex', fill: 'outline', rotate: 0, dots: 2, color: '#38bdf8' },
      null
    ],
    options: [
      { id: 'A', spec: { shape: 'hex', fill: 'outline', rotate: 0, dots: 3, color: '#38bdf8' } },
      { id: 'B', spec: { shape: 'hex', fill: 'striped', rotate: 0, dots: 2, color: '#38bdf8' } },
      { id: 'C', spec: { shape: 'hex', fill: 'solid', rotate: 0, dots: 3, color: '#38bdf8' } },
      { id: 'D', spec: { shape: 'hex', fill: 'striped', rotate: 0, dots: 3, color: '#38bdf8' } },
      { id: 'E', spec: { shape: 'diamond', fill: 'striped', rotate: 0, dots: 3, color: '#38bdf8' } }
    ],
    correctOptionId: 'D',
    hint: 'Column 3 is always Striped with 3 dots; Row 3 is always a Hexagon.',
    explanation: 'Row 3 fixes the shape as a blue Hexagon. Column 3 fixes shading as Striped and dot count as 3. Combining both gives Option D.'
  },

  // ========================================================
  // BATTERY 2: SPATIAL ABILITY (PAPER FOLDING & HOLE PUNCHING)
  // ========================================================
  {
    id: 'sp_fold_01',
    battery: 'spatial',
    subtype: 'Paper Folding (Figure Analysis)',
    prompt: 'A square sheet is folded left-to-right, then top-to-bottom, and 1 hole is punched. What does it look like unfolded?',
    folds: ['left-to-right', 'top-to-bottom'],
    punches: [[3, 3]],
    options: [
      { id: 'A', holes: [[0, 0], [3, 0], [0, 3], [3, 3]] },
      { id: 'B', holes: [[1, 1], [2, 1], [1, 2], [2, 2]] },
      { id: 'C', holes: [[0, 3], [3, 3]] },
      { id: 'D', holes: [[0, 0], [3, 3]] },
      { id: 'E', holes: [[1, 0], [2, 0], [1, 3], [2, 3]] }
    ],
    correctOptionId: 'A',
    hint: 'The punch is in the outer bottom-right corner. Mirror it upwards first, then mirror both holes to the left.',
    explanation: 'Unfolding bottom-to-top mirrors the bottom-right corner hole (3,3) to the top-right corner (3,0). Unfolding right-to-left mirrors both onto the left edge: (0,0) and (0,3) — all four outer corners!'
  },
  {
    id: 'sp_fold_02',
    battery: 'spatial',
    subtype: 'Paper Folding (Figure Analysis)',
    prompt: 'The sheet is folded top-to-bottom, then left-to-right, and punched near the inner fold corner. Choose the unfolded pattern.',
    folds: ['top-to-bottom', 'left-to-right'],
    punches: [[2, 2]],
    options: [
      { id: 'A', holes: [[0, 0], [3, 0], [0, 3], [3, 3]] },
      { id: 'B', holes: [[1, 1], [2, 1], [1, 2], [2, 2]] },
      { id: 'C', holes: [[2, 1], [2, 2]] },
      { id: 'D', holes: [[1, 2], [2, 2], [1, 3], [2, 3]] },
      { id: 'E', holes: [[0, 2], [3, 2], [0, 1], [3, 1]] }
    ],
    correctOptionId: 'B',
    hint: 'The hole sits close to the centre intersection of both fold lines!',
    explanation: 'Because the punch sits at (2,2)—right beside both the vertical and horizontal fold creases—unfolding reflects it tightly across the centre into a 2 × 2 cluster: (1,1), (2,1), (1,2), and (2,2).'
  },
  {
    id: 'sp_fold_03',
    battery: 'spatial',
    subtype: 'Paper Folding (Figure Analysis)',
    prompt: 'Folded once across the diagonal (top-right onto bottom-left), then punched twice. Predict the unfolded holes.',
    folds: ['diag-tl-br'],
    punches: [[0, 2], [1, 3]],
    options: [
      { id: 'A', holes: [[0, 2], [1, 3], [3, 2], [2, 3]] },
      { id: 'B', holes: [[0, 2], [1, 3], [0, 1], [1, 0]] },
      { id: 'C', holes: [[0, 2], [1, 3], [2, 0], [3, 1]] },
      { id: 'D', holes: [[0, 2], [1, 3], [3, 1], [2, 2]] },
      { id: 'E', holes: [[0, 2], [1, 3]] }
    ],
    correctOptionId: 'C',
    hint: 'Across the main diagonal (top-left to bottom-right), reflecting a point swaps its column and row: (x, y) → (y, x).',
    explanation: 'Reflecting across the top-left → bottom-right diagonal swaps coordinates: (0,2) mirrors to (2,0), and (1,3) mirrors to (3,1). Together with the original punches, that forms Option C.'
  },
  {
    id: 'sp_fold_04',
    battery: 'spatial',
    subtype: 'Paper Folding (Figure Analysis)',
    prompt: 'Folded left-to-right, then top-to-bottom, with two asymmetric holes punched on the bottom-right quadrant.',
    folds: ['left-to-right', 'top-to-bottom'],
    punches: [[2, 3], [3, 2]],
    options: [
      { id: 'A', holes: [[1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]] },
      { id: 'B', holes: [[0, 0], [3, 0], [1, 1], [2, 1], [1, 2], [2, 2], [0, 3], [3, 3]] },
      { id: 'C', holes: [[2, 0], [3, 1], [2, 3], [3, 2]] },
      { id: 'D', holes: [[1, 3], [2, 3], [0, 2], [3, 2]] },
      { id: 'E', holes: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 3], [1, 3], [2, 3], [3, 3]] }
    ],
    correctOptionId: 'A',
    hint: 'Notice how the two holes form a small diagonal near the outer edge—unfolding creates an octagon-like ring of 8 holes!',
    explanation: 'Each of the 2 punches multiplies across 4 layers (2 × 4 = 8 holes). Mirroring (2,3) and (3,2) across both horizontal and vertical axes creates a symmetrical ring of 8 holes around the perimeter (Option A).'
  },

  // ========================================================
  // BATTERY 3: QUANTITATIVE REASONING (ANALOGIES & SERIES)
  // ========================================================
  {
    id: 'qr_01',
    battery: 'quantitative',
    subtype: 'Number Analogy',
    prompt: 'Find the single rule linking each pair, then calculate the missing number.',
    pairs: [['4', '14'], ['7', '23'], ['11', '?']],
    options: [
      { id: 'A', label: '31' },
      { id: 'B', label: '33' },
      { id: 'C', label: '35' },
      { id: 'D', label: '37' },
      { id: 'E', label: '41' }
    ],
    correctOptionId: 'C',
    hint: 'Try multiplying the first number by 3, then see how much you need to add.',
    explanation: 'Rule: multiply by 3, then add 2. Check: (4 × 3) + 2 = 14; (7 × 3) + 2 = 23; so (11 × 3) + 2 = 35.'
  },
  {
    id: 'qr_02',
    battery: 'quantitative',
    subtype: 'Number Series',
    prompt: 'Determine the next number in this CAT4 sequence:',
    series: ['5', '8', '14', '23', '35', '?'],
    options: [
      { id: 'A', label: '47' },
      { id: 'B', label: '49' },
      { id: 'C', label: '50' },
      { id: 'D', label: '52' },
      { id: 'E', label: '54' }
    ],
    correctOptionId: 'C',
    hint: 'Write down the gaps between consecutive numbers: +3, +6, +9, +12...',
    explanation: 'The differences increase by +3 each step (+3, +6, +9, +12, +15). Adding 15 to 35 gives 50.'
  },
  {
    id: 'qr_03',
    battery: 'quantitative',
    subtype: 'Number Analogy',
    prompt: 'What hidden two-step operation connects these pairs?',
    pairs: [['18', '6'], ['30', '12'], ['42', '?']],
    options: [
      { id: 'A', label: '14' },
      { id: 'B', label: '16' },
      { id: 'C', label: '18' },
      { id: 'D', label: '21' },
      { id: 'E', label: '24' }
    ],
    correctOptionId: 'C',
    hint: 'Halve the first number, then subtract 3.',
    explanation: 'Rule: divide by 2, then subtract 3. Check: (18 ÷ 2) − 3 = 6; (30 ÷ 2) − 3 = 12; so (42 ÷ 2) − 3 = 21 − 3 = 18.'
  },
  {
    id: 'qr_04',
    battery: 'quantitative',
    subtype: 'Number Series',
    prompt: 'Watch out for an alternating two-rule pattern in this series:',
    series: ['4', '12', '10', '30', '28', '?'],
    options: [
      { id: 'A', label: '26' },
      { id: 'B', label: '56' },
      { id: 'C', label: '82' },
      { id: 'D', label: '84' },
      { id: 'E', label: '90' }
    ],
    correctOptionId: 'D',
    hint: 'Look at the alternating steps: ×3, −2, ×3, −2...',
    explanation: 'The series alternates multiplying by 3 and subtracting 2: 4 × 3 = 12, 12 − 2 = 10, 10 × 3 = 30, 30 − 2 = 28, so 28 × 3 = 84.'
  },

  // ========================================================
  // BATTERY 4: VERBAL REASONING (CLASSIFICATION & ANALOGIES)
  // ========================================================
  {
    id: 'vr_01',
    battery: 'verbal',
    subtype: 'Verbal Classification',
    prompt: 'Select the word that shares the exact same category as the three given words:',
    groupWords: ['Sonnet', 'Haiku', 'Ballad'],
    options: [
      { id: 'A', label: 'Chapter' },
      { id: 'B', label: 'Limerick' },
      { id: 'C', label: 'Glossary' },
      { id: 'D', label: 'Biography' },
      { id: 'E', label: 'Editorial' }
    ],
    correctOptionId: 'B',
    hint: 'All three are specific forms of poetry.',
    explanation: 'Sonnet, Haiku, and Ballad are all poetic forms. Limerick is the only poetic form among the options; the rest are prose or book-structure terms.'
  },
  {
    id: 'vr_02',
    battery: 'verbal',
    subtype: 'Verbal Analogy',
    prompt: 'Complete the logical relationship:',
    analogy: { a: 'Cartographer', b: 'Map', c: 'Lexicographer', d: '?' },
    options: [
      { id: 'A', label: 'Compass' },
      { id: 'B', label: 'Novel' },
      { id: 'C', label: 'Dictionary' },
      { id: 'D', label: 'Library' },
      { id: 'E', label: 'Telescope' }
    ],
    correctOptionId: 'C',
    hint: 'A cartographer compiles maps. Think of the Greek root "lexis" (word).',
    explanation: 'A cartographer creates a map; a lexicographer compiles a dictionary ("lexicon" = vocabulary).'
  },
  {
    id: 'vr_03',
    battery: 'verbal',
    subtype: 'Verbal Classification',
    prompt: 'Which word belongs most precisely with this group?',
    groupWords: ['Murmur', 'Whisper', 'Mutter'],
    options: [
      { id: 'A', label: 'Bellow' },
      { id: 'B', label: 'Declare' },
      { id: 'C', label: 'Mumble' },
      { id: 'D', label: 'Orate' },
      { id: 'E', label: 'Shout' }
    ],
    correctOptionId: 'C',
    hint: 'All three describe speaking very quietly or indistinctly.',
    explanation: 'Murmur, Whisper, and Mutter all denote quiet, low-volume speech. Mumble matches that exact volume and clarity register, whereas Bellow, Orate, and Shout are loud or formal.'
  },
  {
    id: 'vr_04',
    battery: 'verbal',
    subtype: 'Verbal Analogy',
    prompt: 'Identify the matching degree/intensity relationship:',
    analogy: { a: 'Breeze', b: 'Gale', c: 'Tremor', d: '?' },
    options: [
      { id: 'A', label: 'Pebble' },
      { id: 'B', label: 'Earthquake' },
      { id: 'C', label: 'Drought' },
      { id: 'D', label: 'Mist' },
      { id: 'E', label: 'Echo' }
    ],
    correctOptionId: 'B',
    hint: 'A gale is a much stronger, extreme version of a breeze.',
    explanation: 'The relationship is mild → extreme intensity. A mild wind is a breeze and its extreme is a gale; a mild ground shake is a tremor and its extreme is an earthquake.'
  }
]
