import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Howl, Howler } from 'howler'

const SoundContext = createContext()

// Sound URLs - using free sound effects (base64 encoded simple beeps for initial version)
// You can replace these with actual sound file URLs
const SOUNDS = {
  correct: null,
  wrong: null,
  explosion: null,
  click: null,
  gameStart: null,
  gameOver: null,
  streak: null,
  background: null
}

export function SoundProvider({ children }) {
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const soundsRef = useRef({})
  const backgroundMusicRef = useRef(null)

  // Initialize sounds with Web Audio API generated sounds
  useEffect(() => {
    // Create audio context for generating sounds
    const createBeepSound = (frequency, duration, type = 'sine') => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    }

    // Create simple sound effects using Howler with generated audio
    // For now, we'll use a simple implementation that works without external files
    soundsRef.current = {
      playCorrect: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
            gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.4)
          } catch (e) { console.log('Sound error:', e) }
        }
      },
      playWrong: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type = 'sawtooth'
            osc.frequency.setValueAtTime(200, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
            gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.3)
          } catch (e) { console.log('Sound error:', e) }
        }
      },
      playExplosion: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type = 'sawtooth'
            osc.frequency.setValueAtTime(150, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5)
            gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.5)
          } catch (e) { console.log('Sound error:', e) }
        }
      },
      playClick: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 800
            gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.05)
          } catch (e) { console.log('Sound error:', e) }
        }
      },
      playStreak: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
            notes.forEach((freq, i) => {
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.frequency.value = freq
              gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
              gain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + i * 0.1 + 0.05)
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15)
              osc.start(ctx.currentTime + i * 0.1)
              osc.stop(ctx.currentTime + i * 0.1 + 0.15)
            })
          } catch (e) { console.log('Sound error:', e) }
        }
      },
      playGameStart: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const notes = [261.63, 329.63, 392.00, 523.25] // C4, E4, G4, C5
            notes.forEach((freq, i) => {
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.frequency.value = freq
              gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15)
              gain.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + i * 0.15 + 0.05)
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3)
              osc.start(ctx.currentTime + i * 0.15)
              osc.stop(ctx.currentTime + i * 0.15 + 0.3)
            })
          } catch (e) { console.log('Sound error:', e) }
        }
      },
      playGameOver: () => {
        if (!isMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const notes = [392.00, 329.63, 261.63, 196.00] // G4, E4, C4, G3
            notes.forEach((freq, i) => {
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.frequency.value = freq
              osc.type = 'triangle'
              gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2)
              gain.gain.linearRampToValueAtTime(volume * 0.3, ctx.currentTime + i * 0.2 + 0.05)
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.4)
              osc.start(ctx.currentTime + i * 0.2)
              osc.stop(ctx.currentTime + i * 0.2 + 0.4)
            })
          } catch (e) { console.log('Sound error:', e) }
        }
      }
    }

    return () => {
      // Cleanup
      Howler.unload()
    }
  }, [isMuted, volume])

  const playSound = useCallback((soundName) => {
    const playFn = soundsRef.current[`play${soundName.charAt(0).toUpperCase() + soundName.slice(1)}`]
    if (playFn) playFn()
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
    Howler.mute(!isMuted)
  }, [isMuted])

  const setGlobalVolume = useCallback((vol) => {
    setVolume(vol)
    Howler.volume(vol)
  }, [])

  const startBackgroundMusic = useCallback(() => {
    // For background music, you would need actual audio files
    // This is a placeholder that could be implemented with looping ambient sounds
    setIsMusicPlaying(true)
  }, [])

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.stop()
    }
    setIsMusicPlaying(false)
  }, [])

  const value = {
    isMuted,
    volume,
    isMusicPlaying,
    playSound,
    toggleMute,
    setGlobalVolume,
    startBackgroundMusic,
    stopBackgroundMusic
  }

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}
