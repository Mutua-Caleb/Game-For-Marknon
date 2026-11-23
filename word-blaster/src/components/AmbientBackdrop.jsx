import './AmbientBackdrop.css'

/**
 * Lightweight atmospheric starfield and realm-tinted nebula lighting.
 * Pure CSS + SVG layers for silky 60fps performance with zero main-thread cost.
 */
function AmbientBackdrop({ realm = null }) {
  return (
    <div className="ambient-backdrop" data-realm={realm || undefined} aria-hidden="true">
      <div className="ambient-nebula ambient-nebula-primary" />
      <div className="ambient-nebula ambient-nebula-secondary" />
      <div className="ambient-grid" />
      <div className="ambient-stars ambient-stars-near" />
      <div className="ambient-stars ambient-stars-far" />
    </div>
  )
}

export default AmbientBackdrop
