import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './EarningsBar.css'

const RATE_PER_CORRECT = 0.50 // KSh 0.50 per correct answer

function EarningsBar({ sessionCorrect = 0, serverEarnings = 0 }) {
  const [showPop, setShowPop] = useState(false)
  const prevCorrectRef = useRef(0)

  const sessionEarnings = sessionCorrect * RATE_PER_CORRECT
  const totalToday = serverEarnings + sessionEarnings

  // Show pop animation when earnings increase
  useEffect(() => {
    if (sessionCorrect > prevCorrectRef.current) {
      setShowPop(true)
      const timer = setTimeout(() => setShowPop(false), 600)
      prevCorrectRef.current = sessionCorrect
      return () => clearTimeout(timer)
    }
  }, [sessionCorrect])

  return (
    <div className="earnings-bar">
      <div className="earnings-bar-inner">
        <span className="earnings-icon">KSh</span>
        <motion.span
          className="earnings-amount"
          key={totalToday}
          initial={{ scale: 1 }}
          animate={showPop ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {totalToday.toFixed(2)}
        </motion.span>
        <span className="earnings-label">earned today</span>
      </div>

      <AnimatePresence>
        {showPop && (
          <motion.span
            className="earnings-pop"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            +0.50
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EarningsBar
