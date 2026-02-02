import { motion } from 'framer-motion'
import './ExplosionEffect.css'

function ExplosionEffect({ x, y, answer }) {
  // Generate random particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
    distance: 50 + Math.random() * 50,
    size: 8 + Math.random() * 12,
    color: ['#e74c3c', '#f39c12', '#fdcb6e', '#ff6b6b'][Math.floor(Math.random() * 4)]
  }))

  return (
    <motion.div
      className="explosion-container"
      style={{
        left: `${x}%`,
        top: `${y}%`
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Central flash */}
      <motion.div
        className="explosion-flash"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 2, 0] }}
        transition={{ duration: 0.3 }}
      />

      {/* Particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="explosion-particle"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance,
            opacity: 0,
            scale: 0
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Answer reveal */}
      <motion.div
        className="answer-reveal"
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <span className="reveal-label">Answer:</span>
        <span className="reveal-answer">{answer}</span>
      </motion.div>
    </motion.div>
  )
}

export default ExplosionEffect
