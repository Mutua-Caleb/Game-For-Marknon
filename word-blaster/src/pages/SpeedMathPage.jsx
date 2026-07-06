import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useSound } from '../context/SoundContext'
import './SpeedMathPage.css'

const SOROMATH_SRC = '/soromath/index.html'

function SpeedMathPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const [frameVersion, setFrameVersion] = useState(1)

  const handleBack = () => {
    playSound('click')
    navigate('/')
  }

  const handleReload = () => {
    playSound('click')
    setFrameVersion(version => version + 1)
  }

  return (
    <div className="speed-math-page">
      <div className="math-particles"></div>
      <Motion.div
        className="math-shell soromath-shell"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <header className="soromath-topbar">
          <button className="math-back-button" type="button" onClick={handleBack}>Back</button>
          <div className="soromath-title">
            <p className="math-kicker">Speed Math</p>
            <h1>SoroMath</h1>
          </div>
          <button className="math-reload-button" type="button" onClick={handleReload}>Reload</button>
        </header>

        <div className="soromath-mode-strip" aria-label="SoroMath practice areas">
          <span>Arithmetic</span>
          <span>Fractions</span>
          <span>Algebra</span>
          <span>Calendars</span>
          <span>Conversions</span>
          <span>Flash Anzan</span>
        </div>

        <section className="soromath-frame-wrap">
          <iframe
            key={frameVersion}
            className="soromath-frame"
            title="SoroMath trainer"
            src={`${SOROMATH_SRC}?inside=word-blaster&v=${frameVersion}`}
          />
        </section>
      </Motion.div>
    </div>
  )
}

export default SpeedMathPage
