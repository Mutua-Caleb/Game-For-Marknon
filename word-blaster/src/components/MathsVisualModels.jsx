/**
 * Interactive SVG Visual Models for Year 7 British Maths Forge:
 * - Algebra Balance Scale
 * - White Rose / Singapore Ratio Bar Model
 * - Percentage Strip Bar
 * - Geometry Diagrams (Triangle, Straight Line, Regular Polygon)
 */

export function MathsVisualDiagram({ visual }) {
  if (!visual) return null

  switch (visual.type) {
    case 'balance':
      return (
        <svg viewBox="0 0 360 140" className="maths-svg-diagram" aria-label="Algebraic balance scale">
          {/* Base & Fulcrum */}
          <polygon points="180,58 158,124 202,124" fill="rgba(245, 158, 11, 0.22)" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
          <line x1="130" y1="126" x2="230" y2="126" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          {/* Balanced Beam */}
          <line x1="56" y1="58" x2="304" y2="58" stroke="#fcd34d" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="180" cy="58" r="6" fill="#0b1020" stroke="#fcd34d" strokeWidth="3" />
          {/* Left Pan */}
          <rect x="26" y="18" width="118" height="36" rx="10" fill="rgba(245, 158, 11, 0.16)" stroke="#f59e0b" strokeWidth="2" />
          <text x="85" y="41" textAnchor="middle" fill="#fef3c7" fontSize="15" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {visual.left}
          </text>
          {/* Equals badge */}
          <text x="180" y="42" textAnchor="middle" fill="#fcd34d" fontSize="18" fontWeight="800">=</text>
          {/* Right Pan */}
          <rect x="216" y="18" width="118" height="36" rx="10" fill="rgba(34, 211, 238, 0.14)" stroke="#22d3ee" strokeWidth="2" />
          <text x="275" y="41" textAnchor="middle" fill="#cffafe" fontSize="15" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {visual.right}
          </text>
        </svg>
      )

    case 'ratio-bar': {
      const totalParts = visual.partsA + visual.partsB
      const maxWidth = 310
      const unitW = maxWidth / Math.max(1, totalParts)
      const startX = 25

      return (
        <svg viewBox="0 0 360 135" className="maths-svg-diagram" aria-label="Ratio bar model">
          <text x="180" y="22" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="700">
            {visual.totalLabel}
          </text>

          {/* Bar A segments */}
          {Array.from({ length: visual.partsA }).map((_, i) => (
            <rect
              key={`a_${i}`}
              x={startX + i * unitW + 1.5}
              y="38"
              width={Math.max(8, unitW - 3)}
              height="38"
              rx="6"
              fill="rgba(245, 158, 11, 0.28)"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          ))}

          {/* Bar B segments */}
          {Array.from({ length: visual.partsB }).map((_, i) => (
            <rect
              key={`b_${i}`}
              x={startX + (visual.partsA + i) * unitW + 1.5}
              y="38"
              width={Math.max(8, unitW - 3)}
              height="38"
              rx="6"
              fill="rgba(56, 189, 248, 0.24)"
              stroke="#38bdf8"
              strokeWidth="2"
            />
          ))}

          {/* Labels beneath */}
          <text
            x={startX + (visual.partsA * unitW) / 2}
            y="102"
            textAnchor="middle"
            fill="#fcd34d"
            fontSize="12"
            fontWeight="700"
          >
            {visual.labelA}
          </text>
          <text
            x={startX + visual.partsA * unitW + (visual.partsB * unitW) / 2}
            y="102"
            textAnchor="middle"
            fill="#7dd3fc"
            fontSize="12"
            fontWeight="700"
          >
            {visual.labelB}
          </text>
        </svg>
      )
    }

    case 'percent-bar': {
      const barW = 300
      const highlightW = Math.round((visual.highlightPct / 100) * barW)
      return (
        <svg viewBox="0 0 360 128" className="maths-svg-diagram" aria-label="Percentage bar model">
          <text x="180" y="24" textAnchor="middle" fill="#fde68a" fontSize="13" fontWeight="700">
            {visual.totalLabel}
          </text>
          <rect x="30" y="42" width={barW} height="38" rx="9" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <rect x="30" y="42" width={barW - highlightW} height="38" rx="9" fill="rgba(16, 185, 129, 0.24)" stroke="#10b981" strokeWidth="2" />
          <rect x={30 + (barW - highlightW)} y="42" width={highlightW} height="38" rx="7" fill="rgba(245, 158, 11, 0.34)" stroke="#f59e0b" strokeWidth="2" />
          <text x={30 + (barW - highlightW) / 2} y="66" textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="700">
            {visual.remainLabel}
          </text>
          <text x={30 + (barW - highlightW) + highlightW / 2} y="103" textAnchor="middle" fill="#fcd34d" fontSize="12" fontWeight="700">
            {visual.highlightLabel}
          </text>
        </svg>
      )
    }

    case 'triangle':
      return (
        <svg viewBox="0 0 360 160" className="maths-svg-diagram" aria-label="Triangle angle diagram">
          <polygon
            points="175,20 75,138 285,138"
            fill="rgba(245, 158, 11, 0.14)"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <text x="175" y="54" textAnchor="middle" fill="#22d3ee" fontSize="15" fontWeight="800" fontFamily="JetBrains Mono, monospace">
            {visual.c}
          </text>
          <text x="112" y="128" textAnchor="middle" fill="#fde68a" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {visual.a}
          </text>
          <text x="242" y="128" textAnchor="middle" fill="#fde68a" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {visual.b}
          </text>
        </svg>
      )

    case 'straight-line':
      return (
        <svg viewBox="0 0 360 140" className="maths-svg-diagram" aria-label="Angles on a straight line">
          <line x1="40" y1="108" x2="320" y2="108" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="180" y1="108" x2="232" y2="26" stroke="#22d3ee" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 142 108 A 38 38 0 0 1 218 108" fill="none" stroke="rgba(245, 158, 11, 0.55)" strokeWidth="2.2" strokeDasharray="4 3" />
          <text x="122" y="84" textAnchor="middle" fill="#fde68a" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {visual.leftLabel}
          </text>
          <text x="248" y="84" textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            {visual.rightLabel}
          </text>
          <text x="180" y="128" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
            Straight line = 180°
          </text>
        </svg>
      )

    case 'polygon': {
      const n = visual.sides || 6
      const cx = 180
      const cy = 78
      const r = 52
      const pts = Array.from({ length: n }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`
      }).join(' ')
      return (
        <svg viewBox="0 0 360 156" className="maths-svg-diagram" aria-label={visual.label}>
          <polygon points={pts} fill="rgba(245, 158, 11, 0.16)" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
          <text x="180" y="82" textAnchor="middle" fill="#fde68a" fontSize="14" fontWeight="700">
            {visual.label}
          </text>
          <text x="180" y="146" textAnchor="middle" fill="#94a3b8" fontSize="11.5" fontWeight="600">
            All {n} sides &amp; interior angles are equal
          </text>
        </svg>
      )
    }

    default:
      return null
  }
}
