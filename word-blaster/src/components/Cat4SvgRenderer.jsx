import { motion as Motion } from 'framer-motion'

/**
 * Procedural SVG Renderers for CAT4 Non-Verbal Reasoning Matrices
 * and Spatial Paper-Folding / Animated Unfold Symmetry.
 */

export function MatrixShapeTile({ spec, size = 72 }) {
  if (!spec) {
    return (
      <div className="cat4-missing-tile" style={{ width: size, height: size }}>
        <span>?</span>
      </div>
    )
  }

  const { shape = 'square', fill = 'solid', rotate = 0, dots = 0, color = '#818cf8' } = spec
  const patternId = `stripe_${shape}_${color.replace('#', '')}_${size}`

  const fillValue = fill === 'solid'
    ? color
    : fill === 'striped'
      ? `url(#${patternId})`
      : 'transparent'

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return <circle cx="50" cy="50" r="28" fill={fillValue} stroke={color} strokeWidth="4.5" />
      case 'square':
        return <rect x="24" y="24" width="52" height="52" rx="4" fill={fillValue} stroke={color} strokeWidth="4.5" />
      case 'triangle':
        return <polygon points="50,18 82,76 18,76" fill={fillValue} stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
      case 'diamond':
        return <polygon points="50,16 82,50 50,84 18,50" fill={fillValue} stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
      case 'hex':
        return <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill={fillValue} stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
      case 'arrow':
        return (
          <polygon
            points="50,16 78,48 61,48 61,82 39,82 39,48 22,48"
            fill={fillValue}
            stroke={color}
            strokeWidth="4.2"
            strokeLinejoin="round"
          />
        )
      default:
        return <rect x="24" y="24" width="52" height="52" fill={fillValue} stroke={color} strokeWidth="4.5" />
    }
  }

  const dotPositions = {
    1: [[50, 50]],
    2: [[40, 50], [60, 50]],
    3: [[50, 41], [40, 58], [60, 58]]
  }
  const activeDots = dotPositions[dots] || []

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <pattern
          id={patternId}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="9" stroke={color} strokeWidth="4.2" strokeOpacity="0.82" />
        </pattern>
      </defs>
      <g transform={`rotate(${rotate} 50 50)`}>
        {renderShape()}
      </g>
      {activeDots.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r="5"
          fill={fill === 'solid' ? '#0b1020' : '#f8fafc'}
          stroke={fill === 'solid' ? '#ffffff' : color}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

/**
 * Renders an unfolded 4x4 hole grid for Spatial Paper Folding options & reveal
 */
export function UnfoldedSheetSvg({ holes = [], folds = [], showCreases = false, size = 86, highlight = false }) {
  const cell = 20
  const pad = 10

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="8"
        fill={highlight ? 'rgba(99, 102, 241, 0.22)' : 'rgba(241, 245, 249, 0.94)'}
        stroke={highlight ? '#818cf8' : '#cbd5e1'}
        strokeWidth="2.4"
      />

      {/* Subtle 4x4 reference grid */}
      {[1, 2, 3].map(i => (
        <g key={i} opacity="0.16">
          <line x1={pad + i * cell} y1="10" x2={pad + i * cell} y2="90" stroke="#334155" strokeWidth="1" />
          <line x1="10" y1={pad + i * cell} x2="90" y2={pad + i * cell} stroke="#334155" strokeWidth="1" />
        </g>
      ))}

      {/* Symmetry Crease Lines (shown during unfold animation!) */}
      {showCreases && folds.map((fold, idx) => {
        if (fold === 'left-to-right' || fold === 'right-to-left') {
          return <line key={idx} x1="50" y1="8" x2="50" y2="92" stroke="#22d3ee" strokeWidth="2.4" strokeDasharray="5 4" />
        }
        if (fold === 'top-to-bottom' || fold === 'bottom-to-top') {
          return <line key={idx} x1="8" y1="50" x2="92" y2="50" stroke="#22d3ee" strokeWidth="2.4" strokeDasharray="5 4" />
        }
        if (fold === 'diag-tl-br') {
          return <line key={idx} x1="10" y1="10" x2="90" y2="90" stroke="#22d3ee" strokeWidth="2.4" strokeDasharray="5 4" />
        }
        return null
      })}

      {/* Punched Holes */}
      {holes.map(([gx, gy], idx) => {
        const cx = pad + gx * cell + cell / 2
        const cy = pad + gy * cell + cell / 2
        return (
          <Motion.circle
            key={`${gx}-${gy}-${idx}`}
            cx={cx}
            cy={cy}
            r="6.2"
            fill="#0b1020"
            stroke={highlight ? '#22d3ee' : '#475569'}
            strokeWidth="2"
            initial={showCreases ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: showCreases ? idx * 0.08 : 0, type: 'spring', stiffness: 260 }}
          />
        )
      })}
    </svg>
  )
}

function buildFoldSteps(folds) {
  let activeXMin = 0
  let activeXMax = 4
  let activeYMin = 0
  let activeYMax = 4
  let isDiag = false

  const steps = folds.map((fold, idx) => {
    let label = ''
    if (fold === 'left-to-right') {
      activeXMin = 2
      label = 'Fold Left → Right'
    } else if (fold === 'right-to-left') {
      activeXMax = 2
      label = 'Fold Right → Left'
    } else if (fold === 'top-to-bottom') {
      activeYMin = 2
      label = 'Fold Top → Bottom'
    } else if (fold === 'bottom-to-top') {
      activeYMax = 2
      label = 'Fold Bottom → Top'
    } else if (fold === 'diag-tl-br') {
      isDiag = true
      label = 'Fold Diagonally'
    }
    return {
      stepNum: idx + 1,
      fold,
      label,
      nextRegion: { xMin: activeXMin, xMax: activeXMax, yMin: activeYMin, yMax: activeYMax },
      isDiag
    }
  })

  return {
    steps,
    finalRegion: { xMin: activeXMin, xMax: activeXMax, yMin: activeYMin, yMax: activeYMax, isDiag }
  }
}

/**
 * Renders the multi-step Folding Sequence strip (Fold 1 -> Fold 2 -> Punch!)
 */
export function PaperFoldSequence({ folds = [], punches = [] }) {
  const cell = 20
  const pad = 10
  const { steps, finalRegion } = buildFoldSteps(folds)
  const { xMin: activeXMin, xMax: activeXMax, yMin: activeYMin, yMax: activeYMax, isDiag } = finalRegion

  return (
    <div className="fold-sequence-strip">
      {steps.map(step => (
        <div key={step.stepNum} className="fold-step-card">
          <span className="fold-step-label mono-num">Step {step.stepNum}: {step.label}</span>
          <svg width="96" height="96" viewBox="0 0 100 100" aria-hidden="true">
            {/* Ghost full paper */}
            <rect x="10" y="10" width="80" height="80" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 3" />

            {/* Folded active region */}
            {step.isDiag ? (
              <polygon points="10,10 10,90 90,90" fill="rgba(99, 102, 241, 0.34)" stroke="#818cf8" strokeWidth="2.2" />
            ) : (
              <rect
                x={pad + step.nextRegion.xMin * cell}
                y={pad + step.nextRegion.yMin * cell}
                width={(step.nextRegion.xMax - step.nextRegion.xMin) * cell}
                height={(step.nextRegion.yMax - step.nextRegion.yMin) * cell}
                rx="4"
                fill="rgba(99, 102, 241, 0.34)"
                stroke="#818cf8"
                strokeWidth="2.2"
              />
            )}

            {/* Crease line */}
            {(step.fold === 'left-to-right' || step.fold === 'right-to-left') && (
              <line x1="50" y1="8" x2="50" y2="92" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="5 3" />
            )}
            {(step.fold === 'top-to-bottom' || step.fold === 'bottom-to-top') && (
              <line x1="8" y1="50" x2="92" y2="50" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="5 3" />
            )}
            {step.fold === 'diag-tl-br' && (
              <line x1="10" y1="10" x2="90" y2="90" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="5 3" />
            )}
          </svg>
        </div>
      ))}

      {/* Final Step: Hole Punch */}
      <div className="fold-step-card is-punch">
        <span className="fold-step-label mono-num">Step {steps.length + 1}: Punch Hole{punches.length > 1 ? 's' : ''}</span>
        <svg width="96" height="96" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="10" y="10" width="80" height="80" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeDasharray="4 3" />
          {isDiag ? (
            <polygon points="10,10 10,90 90,90" fill="rgba(241, 245, 249, 0.92)" stroke="#818cf8" strokeWidth="2.4" />
          ) : (
            <rect
              x={pad + activeXMin * cell}
              y={pad + activeYMin * cell}
              width={(activeXMax - activeXMin) * cell}
              height={(activeYMax - activeYMin) * cell}
              rx="4"
              fill="rgba(241, 245, 249, 0.92)"
              stroke="#818cf8"
              strokeWidth="2.4"
            />
          )}
          {punches.map(([gx, gy], i) => (
            <circle
              key={i}
              cx={pad + gx * cell + cell / 2}
              cy={pad + gy * cell + cell / 2}
              r="6.2"
              fill="#0b1020"
              stroke="#f5b942"
              strokeWidth="2.2"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
