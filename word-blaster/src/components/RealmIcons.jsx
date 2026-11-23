/**
 * Bespoke inline SVG iconography for Scholar's Observatory realms and HUD.
 * Replaces raw OS emojis with crisp, consistent vector art.
 */

export function RealmCrest({ realmId, size = 32, className = '' }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    fill: 'none',
    className,
    'aria-hidden': true
  }

  switch (realmId) {
    case 'english':
      // Open literary folio with illuminated quill
      return (
        <svg {...props}>
          <path
            d="M4.5 9.5C4.5 7.8 5.9 6.5 7.6 6.5H13.5C14.9 6.5 16 7.6 16 9V25C16 23.7 14.9 22.7 13.5 22.7H6.5C5.4 22.7 4.5 21.8 4.5 20.7V9.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M27.5 9.5C27.5 7.8 26.1 6.5 24.4 6.5H18.5C17.1 6.5 16 7.6 16 9V25C16 23.7 17.1 22.7 18.5 22.7H25.5C26.6 22.7 27.5 21.8 27.5 20.7V9.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M8.5 11.5H12.5M8.5 15.5H12.5M19.5 11.5H23.5M19.5 15.5H22.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="16" cy="4.2" r="1.5" fill="currentColor" />
        </svg>
      )

    case 'cat4':
      // 3x3 Cognitive matrix & spatial prism
      return (
        <svg {...props}>
          <rect x="4.5" y="4.5" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="4.5" width="7" height="7" rx="1.8" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="24.5" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="4.5" y="13" width="7" height="7" rx="1.8" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16.5 13L20 19.5H13L16.5 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="21.2" y="13" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="8" cy="24.8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="21.5" width="7" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M22.2 24.8H27M24.6 22.4V27.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )

    case 'maths':
      // Precision compass & geometric arc
      return (
        <svg {...props}>
          <circle cx="16" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.9" />
          <path d="M14.8 9.8L8 25.5M17.2 9.8L24 25.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9.5 19.2C11.4 20.5 13.6 21.2 16 21.2C18.4 21.2 20.6 20.5 22.5 19.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 3.5V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="21.2" r="1.4" fill="currentColor" />
        </svg>
      )

    case 'french':
      // Francophonie compass rose / atelier crest
      return (
        <svg {...props}>
          <circle cx="16" cy="16" r="11.2" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M16 7.2L18.5 13.5L24.8 16L18.5 18.5L16 24.8L13.5 18.5L7.2 16L13.5 13.5L16 7.2Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="1.8" fill="currentColor" />
        </svg>
      )

    case 'mistakes':
      // Forging flame / boss rematch shield
      return (
        <svg {...props}>
          <path
            d="M16 4.5L25.5 8.5V15.8C25.5 21.5 21.5 25.8 16 27.8C10.5 25.8 6.5 21.5 6.5 15.8V8.5L16 4.5Z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M17.2 10.5L12.5 17H16.2L14.8 22.5L19.8 15.8H16L17.2 10.5Z" fill="currentColor" />
        </svg>
      )

    default:
      return (
        <svg {...props}>
          <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="16" cy="16" r="3.5" fill="currentColor" />
        </svg>
      )
  }
}

export function ObservatoryIcon({ name, size = 18, className = '' }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true
  }

  switch (name) {
    case 'flame':
      return (
        <svg {...props}>
          <path d="M12 2.5C12 2.5 17.5 6.8 17.5 12.2C17.5 15.9 15 19.5 12 20.5C9 19.5 6.5 15.9 6.5 12.2C6.5 9.8 7.8 7.5 9 6.2C9.1 8 10.3 9 11.4 9C11 6.7 12 2.5 12 2.5Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      )
    case 'vault':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 9V7.5M12 16.5V15M9 12H7.5M16.5 12H15" />
        </svg>
      )
    case 'sound-on':
      return (
        <svg {...props}>
          <path d="M11 5L6 9H3V15H6L11 19V5Z" />
          <path d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5" />
          <path d="M18.5 6C21 8.5 21 15.5 18.5 18" />
        </svg>
      )
    case 'sound-off':
      return (
        <svg {...props}>
          <path d="M11 5L6 9H3V15H6L11 19V5Z" />
          <path d="M22 9L16 15M16 9L22 15" />
        </svg>
      )
    case 'ambience':
      return (
        <svg {...props}>
          <path d="M7 15.5C4.8 15.5 3 13.8 3 11.7C3 9.7 4.5 8.1 6.5 7.9C7.3 5.6 9.5 4 12 4C15.1 4 17.7 6.3 18 9.3C19.8 9.7 21 11.2 21 13C21 14.9 19.4 16.5 17.5 16.5" />
          <path d="M8 19L7 21M12.5 19L11.5 21M17 19L16 21" />
        </svg>
      )
    case 'crown':
      return (
        <svg {...props}>
          <path d="M3 18L5 8L10 12L12 6L14 12L19 8L21 18H3Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" />
        </svg>
      )
    case 'check':
      return (
        <svg {...props}>
          <path d="M5 12.5L9.5 17L19 7.5" />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg {...props}>
          <path d="M5 12H19M13 6L19 12L13 18" />
        </svg>
      )
    case 'arrow-left':
      return (
        <svg {...props}>
          <path d="M19 12H5M11 6L5 12L11 18" />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...props}>
          <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      )
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...props}>
          <path d="M8 21H16M12 17V21M7 4H17V9C17 12.3 14.8 15 12 15C9.2 15 7 12.3 7 9V4Z" />
          <path d="M7 6H4V8C4 10 5.3 11.5 7 11.5M17 6H20V8C20 10 18.7 11.5 17 11.5" />
        </svg>
      )
    case 'pause':
      return (
        <svg {...props}>
          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </svg>
      )
    case 'play':
      return (
        <svg {...props}>
          <path d="M7 5L19 12L7 19V5Z" fill="currentColor" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...props}>
          <path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" />
          <path d="M16 17L21 12L16 7M21 12H9" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...props}>
          <path d="M12 3L14 9L20 11L14 13L12 19L10 13L4 11L10 9L12 3Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M19 3V6M17.5 4.5H20.5" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...props}>
          <path d="M12 20.5C12 20.5 4 15.2 4 9.5C4 6.8 6.1 4.8 8.6 4.8C10.2 4.8 11.4 5.7 12 6.8C12.6 5.7 13.8 4.8 15.4 4.8C17.9 4.8 20 6.8 20 9.5C20 15.2 12 20.5 12 20.5Z" fill="currentColor" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...props}>
          <path d="M12 3L21 19H3L12 3Z" />
          <path d="M12 9V13M12 16.5H12.01" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

export function MasteryRing({
  percent = 0,
  size = 56,
  strokeWidth = 4.5,
  color = 'var(--realm-accent)',
  trackColor = 'rgba(255, 255, 255, 0.1)',
  children
}) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {children}
      </div>
    </div>
  )
}
