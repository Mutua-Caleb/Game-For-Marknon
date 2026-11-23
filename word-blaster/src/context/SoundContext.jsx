import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Howler } from 'howler'

const SoundContext = createContext()

const MUTE_STORAGE_KEY = 'observatory-sound-muted-v1'
const AMBIENCE_STORAGE_KEY = 'observatory-ambience-v1'

// Pentatonic scale (C5 -> G6) for pitch-escalating streak chimes
const STREAK_SCALE = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  1046.50, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98 // G6
]

function readStoredBool(key, fallback = false) {
  try {
    const val = localStorage.getItem(key)
    return val === null ? fallback : val === 'true'
  } catch {
    return fallback
  }
}

export function SoundProvider({ children }) {
  const [isMuted, setIsMuted] = useState(() => readStoredBool(MUTE_STORAGE_KEY, false))
  const [volume, setVolume] = useState(0.55)
  const [isMusicPlaying, setIsMusicPlaying] = useState(() => readStoredBool(AMBIENCE_STORAGE_KEY, false))

  const audioCtxRef = useRef(null)
  const masterGainRef = useRef(null)
  const ambienceNodesRef = useRef(null)
  const isMutedRef = useRef(isMuted)
  const volumeRef = useRef(volume)

  useEffect(() => {
    isMutedRef.current = isMuted
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted))
    } catch {
      // Ignore storage errors
    }
    Howler.mute(isMuted)
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime
      masterGainRef.current.gain.setTargetAtTime(isMuted ? 0 : volumeRef.current, now, 0.04)
    }
  }, [isMuted])

  useEffect(() => {
    volumeRef.current = volume
    Howler.volume(volume)
    if (masterGainRef.current && audioCtxRef.current && !isMutedRef.current) {
      const now = audioCtxRef.current.currentTime
      masterGainRef.current.gain.setTargetAtTime(volume, now, 0.04)
    }
  }, [volume])

  // Lazily initialize a single persistent AudioContext + dynamics compressor
  const getAudioGraph = useCallback(() => {
    if (typeof window === 'undefined') return null
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null

    if (!audioCtxRef.current) {
      const ctx = new AudioCtx()
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.setValueAtTime(-18, ctx.currentTime)
      compressor.knee.setValueAtTime(16, ctx.currentTime)
      compressor.ratio.setValueAtTime(4, ctx.currentTime)

      const master = ctx.createGain()
      master.gain.setValueAtTime(isMutedRef.current ? 0 : volumeRef.current, ctx.currentTime)

      master.connect(compressor)
      compressor.connect(ctx.destination)

      audioCtxRef.current = ctx
      masterGainRef.current = master
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }

    return {
      ctx: audioCtxRef.current,
      master: masterGainRef.current
    }
  }, [])

  // Helper for sculpted harmonic bell/marimba notes
  const playTone = useCallback((ctx, dest, {
    freq,
    startOffset = 0,
    duration = 0.25,
    gainPeak = 0.22,
    type = 'triangle',
    endFreq = null
  }) => {
    const start = ctx.currentTime + startOffset
    const osc = ctx.createOscillator()
    const env = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration)
    }

    env.gain.setValueAtTime(0.0001, start)
    env.gain.linearRampToValueAtTime(gainPeak, start + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    osc.connect(env)
    env.connect(dest)

    osc.start(start)
    osc.stop(start + duration + 0.02)
  }, [])

  const stopAmbienceNodes = useCallback(() => {
    if (!ambienceNodesRef.current) return
    const { gain, sources, ctx } = ambienceNodesRef.current
    try {
      const now = ctx.currentTime
      gain.gain.setTargetAtTime(0.0001, now, 0.12)
      window.setTimeout(() => {
        sources.forEach(src => {
          try { src.stop() } catch { /* already stopped */ }
        })
      }, 450)
    } catch {
      // Ignore cleanup errors
    }
    ambienceNodesRef.current = null
  }, [])

  const startAmbienceNodes = useCallback(() => {
    if (ambienceNodesRef.current) return
    const graph = getAudioGraph()
    if (!graph) return

    const { ctx, master } = graph

    // Create a 3-second soft pink-filtered rain texture buffer (100% offline)
    const bufferSize = ctx.sampleRate * 3
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1
      b0 = 0.997 * b0 + white * 0.029
      b1 = 0.985 * b1 + white * 0.032
      b2 = 0.950 * b2 + white * 0.048
      output[i] = (b0 + b1 + b2 + white * 0.02) * 0.45
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(520, ctx.currentTime)
    filter.Q.setValueAtTime(0.7, ctx.currentTime)

    const ambGain = ctx.createGain()
    ambGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    ambGain.gain.setTargetAtTime(0.11, ctx.currentTime, 0.5)

    noise.connect(filter)
    filter.connect(ambGain)
    ambGain.connect(master)
    noise.start()

    ambienceNodesRef.current = {
      ctx,
      gain: ambGain,
      sources: [noise]
    }
  }, [getAudioGraph])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbienceNodes()
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
      }
      Howler.unload()
    }
  }, [stopAmbienceNodes])

  const playSound = useCallback((soundName, options = {}) => {
    if (isMutedRef.current) return
    const graph = getAudioGraph()
    if (!graph) return
    const { ctx, master } = graph

    // If user enabled focus ambience and audio context just unlocked, gently fade it in
    if (isMusicPlaying && !ambienceNodesRef.current) {
      startAmbienceNodes()
    }

    try {
      switch (soundName) {
        case 'click': {
          playTone(ctx, master, { freq: 680, endFreq: 420, duration: 0.055, gainPeak: 0.12, type: 'triangle' })
          break
        }
        case 'hover': {
          playTone(ctx, master, { freq: 920, endFreq: 760, duration: 0.03, gainPeak: 0.04, type: 'sine' })
          break
        }
        case 'correct': {
          const streak = Math.max(0, Number(options.streak) || 0)
          const baseIdx = Math.min(STREAK_SCALE.length - 2, streak)
          const f1 = STREAK_SCALE[baseIdx]
          const f2 = STREAK_SCALE[Math.min(STREAK_SCALE.length - 1, baseIdx + 2)]
          playTone(ctx, master, { freq: f1, duration: 0.22, gainPeak: 0.22, type: 'triangle' })
          playTone(ctx, master, { freq: f2, startOffset: 0.075, duration: 0.34, gainPeak: 0.24, type: 'sine' })
          break
        }
        case 'streak': {
          const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]
          notes.forEach((freq, i) => {
            playTone(ctx, master, {
              freq,
              startOffset: i * 0.065,
              duration: 0.36,
              gainPeak: 0.18,
              type: i % 2 === 0 ? 'triangle' : 'sine'
            })
          })
          break
        }
        case 'wrong': {
          // Soft muted low wood knock — clear yet encouraging
          playTone(ctx, master, { freq: 210, endFreq: 138, duration: 0.18, gainPeak: 0.2, type: 'triangle' })
          playTone(ctx, master, { freq: 145, endFreq: 110, startOffset: 0.07, duration: 0.2, gainPeak: 0.14, type: 'sine' })
          break
        }
        case 'explosion': {
          playTone(ctx, master, { freq: 140, endFreq: 48, duration: 0.36, gainPeak: 0.26, type: 'triangle' })
          break
        }
        case 'focusBlockComplete': {
          // Celebratory gold vault arpeggio when KSh 20 block completes
          const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]
          notes.forEach((freq, i) => {
            playTone(ctx, master, {
              freq,
              startOffset: i * 0.08,
              duration: 0.5,
              gainPeak: 0.2,
              type: 'sine'
            })
          })
          break
        }
        case 'gameStart': {
          const notes = [392.0, 493.88, 587.33, 783.99]
          notes.forEach((freq, i) => {
            playTone(ctx, master, {
              freq,
              startOffset: i * 0.075,
              duration: 0.32,
              gainPeak: 0.18,
              type: 'triangle'
            })
          })
          break
        }
        case 'gameOver': {
          const notes = [440.0, 392.0, 329.63, 261.63]
          notes.forEach((freq, i) => {
            playTone(ctx, master, {
              freq,
              startOffset: i * 0.12,
              duration: 0.38,
              gainPeak: 0.18,
              type: 'triangle'
            })
          })
          break
        }
        default:
          break
      }
    } catch {
      // Ignore audio errors on locked contexts
    }
  }, [getAudioGraph, isMusicPlaying, playTone, startAmbienceNodes])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  const setGlobalVolume = useCallback((vol) => {
    setVolume(vol)
  }, [])

  const startBackgroundMusic = useCallback(() => {
    setIsMusicPlaying(true)
    try { localStorage.setItem(AMBIENCE_STORAGE_KEY, 'true') } catch { /* ignore */ }
    if (!isMutedRef.current) {
      startAmbienceNodes()
    }
  }, [startAmbienceNodes])

  const stopBackgroundMusic = useCallback(() => {
    setIsMusicPlaying(false)
    try { localStorage.setItem(AMBIENCE_STORAGE_KEY, 'false') } catch { /* ignore */ }
    stopAmbienceNodes()
  }, [stopAmbienceNodes])

  const toggleAmbience = useCallback(() => {
    if (isMusicPlaying) {
      stopBackgroundMusic()
    } else {
      startBackgroundMusic()
    }
  }, [isMusicPlaying, startBackgroundMusic, stopBackgroundMusic])

  const value = {
    isMuted,
    volume,
    isMusicPlaying,
    playSound,
    toggleMute,
    toggleAmbience,
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
