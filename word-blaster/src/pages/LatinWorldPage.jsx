import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { feature } from 'topojson-client'
import { latinCategoryCounts, latinCategoryLabels, latinWords } from '../data/latinWords'
import { useActiveFocusTimer } from '../hooks/useActiveFocusTimer'
import { useSound } from '../context/SoundContext'
import './LatinWorldPage.css'

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const PROGRESS_KEY = 'word-blaster-latin-progress-v1'
const BASE_W = 1600
const BASE_H = 900

const continentFrames = {
  Africa: [-25, -40, 55, 38],
  Asia: [25, -12, 180, 80],
  Europe: [-25, 34, 45, 72],
  'North America': [-170, 5, -30, 84],
  'South America': [-92, -58, -30, 15],
  Oceania: [110, -50, 180, 10]
}

const fallbackCountries = [
  ['Kenya', 37.9, 0.1],
  ['Italy', 12.6, 42.5],
  ['Brazil', -51.9, -14.2],
  ['Japan', 138.2, 36.2],
  ['Egypt', 30.8, 26.8],
  ['India', 78.9, 22.9],
  ['France', 2.2, 46.2],
  ['Greece', 21.8, 39.0],
  ['Mexico', -102.6, 23.6],
  ['Morocco', -7.1, 31.8],
  ['Peru', -75.0, -9.2],
  ['Turkey', 35.2, 39.0],
  ['South Africa', 24.0, -29.0],
  ['China', 104.2, 35.9],
  ['Canada', -106.3, 56.1],
  ['Australia', 133.8, -25.3],
  ['Iceland', -19.0, 64.9],
  ['Spain', -3.7, 40.4],
  ['Chile', -71.5, -35.7],
  ['New Zealand', 174.9, -40.9]
]

function cleanLatinHead(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\+/g, ' ')
    .replace(/\babl\.?\b/gi, '')
    .replace(/\bacc\.?\b/gi, '')
    .replace(/[=].*$/g, '')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim()
}

function normalizeAnswer(value) {
  return cleanLatinHead(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function projectLonLat(point) {
  const lon = Array.isArray(point) ? point[0] : point.lon
  const lat = Array.isArray(point) ? point[1] : point.lat
  return [((lon + 180) / 360) * BASE_W, ((90 - lat) / 180) * BASE_H]
}

function lonLatFromBase(point) {
  return [(point[0] / BASE_W) * 360 - 180, 90 - (point[1] / BASE_H) * 180]
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function geometryRings(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates.filter(ring => ring.length > 2)
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap(polygon => polygon.filter(ring => ring.length > 2))
  }
  return []
}

function continentForCountry(name, lon, lat) {
  if (/australia|new zealand|papua|fiji|solomon|vanuatu|caledonia/i.test(name)) return 'Oceania'
  if (/greenland|canada|united states|mexico|guatemala|belize|honduras|salvador|nicaragua|costa rica|panama|cuba|haiti|dominican|jamaica|bahamas|puerto/i.test(name)) return 'North America'
  if (/iceland|ireland|united kingdom|norway|sweden|finland|denmark|france|spain|portugal|germany|poland|italy|greece|ukraine|netherlands|belgium|switzerland|austria|czech|slovakia|hungary|romania|bulgaria|serbia|croatia|slovenia|bosnia|albania|moldova|estonia|latvia|lithuania/i.test(name)) return 'Europe'
  if (/egypt|morocco|algeria|tunisia|libya|sudan|ethiopia|eritrea|djibouti|somalia|kenya|uganda|tanzania|rwanda|burundi|congo|angola|zambia|zimbabwe|mozambique|malawi|namibia|botswana|south africa|ghana|nigeria|niger|mali|senegal|chad|cameroon|gabon|guinea|liberia|benin|togo|burkina|mauritania|madagascar/i.test(name)) return 'Africa'
  if (/argentina|brazil|chile|peru|bolivia|paraguay|uruguay|colombia|venezuela|ecuador|guyana|suriname|falkland/i.test(name)) return 'South America'
  if (lat < -8 && lon > 105) return 'Oceania'
  if (lon >= -92 && lon <= -30 && lat < 15) return 'South America'
  if (lon >= -170 && lon <= -30 && lat >= 5) return 'North America'
  if (lon >= -25 && lon <= 55 && lat >= -40 && lat <= 38) return 'Africa'
  if (lon >= -25 && lon <= 45 && lat > 34) return 'Europe'
  return 'Asia'
}

function hashString(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function prepareCountry(worldFeature) {
  const name = worldFeature.properties?.name
  if (!name || /antarctic|antarctica/i.test(name)) return null

  const rings = geometryRings(worldFeature.geometry).map(ring => ring.map(projectLonLat))
  if (!rings.length) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let totalX = 0
  let totalY = 0
  let count = 0

  rings.forEach(ring => {
    ring.forEach(([x, y]) => {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      totalX += x
      totalY += y
      count += 1
    })
  })

  const center = [totalX / count, totalY / count]
  const [lon, lat] = lonLatFromBase(center)
  return {
    name,
    rings,
    center,
    bbox: { minX, minY, maxX, maxY },
    continent: continentForCountry(name, lon, lat),
    seed: hashString(name)
  }
}

function pointCountry(name, lon, lat) {
  const center = projectLonLat([lon, lat])
  return {
    name,
    rings: [],
    center,
    bbox: {
      minX: center[0] - 22,
      minY: center[1] - 22,
      maxX: center[0] + 22,
      maxY: center[1] + 22
    },
    continent: continentForCountry(name, lon, lat),
    seed: hashString(name)
  }
}

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}
  } catch {
    return {}
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

function weightedPick(items, weightFor) {
  const weighted = items.map(item => ({ item, weight: Math.max(0.1, weightFor(item)) }))
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = Math.random() * total
  for (const entry of weighted) {
    cursor -= entry.weight
    if (cursor <= 0) return entry.item
  }
  return weighted[weighted.length - 1].item
}

function drawMap({ canvas, countries, currentCountry, currentWord, viewMode }) {
  const ctx = canvas.getContext('2d')
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const view = getView(width, height, currentCountry, viewMode)
  const toScreen = point => [
    (point[0] - view.x) * view.zoom + width / 2,
    (point[1] - view.y) * view.zoom + height / 2
  ]

  const ocean = ctx.createLinearGradient(0, 0, width, height)
  ocean.addColorStop(0, '#2dd4bf')
  ocean.addColorStop(0.5, '#667eea')
  ocean.addColorStop(1, '#764ba2')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, width, height)

  countries.forEach(country => {
    const isCurrent = country === currentCountry
    const inContinent = currentCountry && country.continent === currentCountry.continent
    if (!isVisible(country, toScreen, width, height)) return

    ctx.beginPath()
    if (country.rings.length) {
      country.rings.forEach(ring => {
        let moved = false
        let previous = null
        ring.forEach(point => {
          const screen = toScreen(point)
          const jump = previous && Math.abs(point[0] - previous[0]) > BASE_W / 2
          if (!moved || jump) {
            ctx.moveTo(screen[0], screen[1])
            moved = true
          } else {
            ctx.lineTo(screen[0], screen[1])
          }
          previous = point
        })
        ctx.closePath()
      })
    } else {
      const screen = toScreen(country.center)
      ctx.arc(screen[0], screen[1], isCurrent ? 15 : 7, 0, Math.PI * 2)
    }

    ctx.fillStyle = isCurrent ? 'rgba(253, 203, 110, 0.92)' : inContinent ? 'rgba(85, 239, 196, 0.48)' : 'rgba(255, 255, 255, 0.28)'
    ctx.strokeStyle = isCurrent ? 'rgba(45, 52, 54, 0.75)' : 'rgba(255, 255, 255, 0.34)'
    ctx.lineWidth = isCurrent ? 2 : inContinent ? 1.2 : 0.7
    ctx.fill('evenodd')
    ctx.stroke()
  })

  if (currentCountry && currentWord) {
    const point = toScreen(currentCountry.center)
    ctx.beginPath()
    ctx.arc(point[0], point[1], 22, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(253, 121, 168, 0.22)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(point[0], point[1], 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fdcb6e'
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 10
    ctx.fillStyle = 'white'
    ctx.font = '800 14px Nunito, sans-serif'
    ctx.fillText(currentCountry.name, point[0], point[1] - 38, Math.min(360, width * 0.62))
    ctx.font = '900 30px Nunito, sans-serif'
    ctx.fillText(currentWord.english, point[0], point[1] - 12, Math.min(430, width * 0.7))
  }
}

function getView(width, height, country, viewMode) {
  if (!country) return { x: BASE_W / 2, y: BASE_H / 2, zoom: 0.75 }

  let box = country.bbox
  if (viewMode === 'continent') {
    const frame = continentFrames[country.continent]
    if (frame) {
      const [minLon, minLat, maxLon, maxLat] = frame
      const topLeft = projectLonLat([minLon, maxLat])
      const bottomRight = projectLonLat([maxLon, minLat])
      box = {
        minX: Math.min(topLeft[0], bottomRight[0]),
        minY: Math.min(topLeft[1], bottomRight[1]),
        maxX: Math.max(topLeft[0], bottomRight[0]),
        maxY: Math.max(topLeft[1], bottomRight[1])
      }
    }
  }

  const spanX = Math.max(viewMode === 'continent' ? 180 : 45, box.maxX - box.minX)
  const spanY = Math.max(viewMode === 'continent' ? 120 : 34, box.maxY - box.minY)
  const pad = viewMode === 'continent' ? 1.2 : 3.1
  return {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    zoom: clamp(Math.min(width / (spanX * pad), height / (spanY * pad)), viewMode === 'continent' ? 0.55 : 1.05, viewMode === 'continent' ? 2.8 : 10)
  }
}

function isVisible(country, toScreen, width, height) {
  const topLeft = toScreen([country.bbox.minX, country.bbox.minY])
  const bottomRight = toScreen([country.bbox.maxX, country.bbox.maxY])
  const minX = Math.min(topLeft[0], bottomRight[0])
  const maxX = Math.max(topLeft[0], bottomRight[0])
  const minY = Math.min(topLeft[1], bottomRight[1])
  const maxY = Math.max(topLeft[1], bottomRight[1])
  return maxX > -120 && minX < width + 120 && maxY > -120 && minY < height + 120
}

function LatinWorldPage() {
  const navigate = useNavigate()
  const { playSound } = useSound()
  const canvasRef = useRef(null)
  const activityRef = useRef(null)
  const answerRef = useRef(null)
  const progressRef = useRef(readProgress())
  const [countries, setCountries] = useState([])
  const [category, setCategory] = useState('all')
  const [viewMode, setViewMode] = useState('continent')
  const [currentWord, setCurrentWord] = useState(null)
  const [currentCountry, setCurrentCountry] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [session, setSession] = useState({ correct: 0, wrong: 0, streak: 0 })

  const focusTimer = useActiveFocusTimer({
    storageKey: 'word-blaster-latin-focus-v1',
    activityRef
  })
  const {
    markActivity,
    recordAttempt,
    resetTimer,
    focusText,
    focusPercent,
    focusStatus,
    focusGoalText
  } = focusTimer

  const categoryOptions = useMemo(() => Object.entries(latinCategoryLabels).map(([id, label]) => ({
    id,
    label,
    count: id === 'all' ? latinWords.length : latinCategoryCounts[id] || 0
  })), [])

  const filteredWords = useMemo(() => {
    if (category === 'all') return latinWords
    return latinWords.filter(word => word.categories?.includes(category))
  }, [category])

  const chooseWord = useCallback(() => {
    return weightedPick(filteredWords, word => {
      const stats = progressRef.current[word.id]
      if (!stats) return 5
      const attempts = stats.correct + stats.wrong
      const failureRate = attempts ? stats.wrong / attempts : 0
      return 1 + failureRate * 6 + (stats.streak ? 0 : 2)
    })
  }, [filteredWords])

  const chooseCountry = useCallback(() => {
    if (!countries.length) return null
    return countries[Math.floor(Math.random() * countries.length)]
  }, [countries])

  const nextCard = useCallback(() => {
    if (!filteredWords.length || !countries.length) return
    const word = chooseWord()
    const country = chooseCountry()
    setCurrentWord(word)
    setCurrentCountry(country)
    setAnswer('')
    setFeedback('')
    setRevealed(false)
    requestAnimationFrame(() => {
      answerRef.current?.focus()
      markActivity()
    })
  }, [chooseCountry, chooseWord, countries.length, filteredWords.length, markActivity])

  useEffect(() => {
    async function loadCountries() {
      try {
        const response = await fetch(WORLD_ATLAS_URL)
        const topology = await response.json()
        const worldFeatures = feature(topology, topology.objects.countries).features
        setCountries(worldFeatures.map(prepareCountry).filter(Boolean))
      } catch (error) {
        console.error('Failed to load world map:', error)
        setCountries(fallbackCountries.map(([name, lon, lat]) => pointCountry(name, lon, lat)))
      }
    }
    loadCountries()
  }, [])

  useEffect(() => {
    if (countries.length) {
      const timer = setTimeout(nextCard, 0)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [category, countries.length, nextCard])

  useEffect(() => {
    if (!canvasRef.current) return
    drawMap({
      canvas: canvasRef.current,
      countries,
      currentCountry,
      currentWord,
      viewMode
    })
  }, [countries, currentCountry, currentWord, viewMode])

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) {
        drawMap({ canvas: canvasRef.current, countries, currentCountry, currentWord, viewMode })
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [countries, currentCountry, currentWord, viewMode])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!currentWord) return
    recordAttempt()

    if (revealed) {
      nextCard()
      return
    }

    const normalized = normalizeAnswer(answer)
    const accepted = currentWord.accepted.map(normalizeAnswer)
    const correct = normalized && accepted.includes(normalized)
    const stats = progressRef.current[currentWord.id] || { correct: 0, wrong: 0, streak: 0 }

    if (correct) {
      playSound('correct')
      progressRef.current[currentWord.id] = {
        ...stats,
        correct: stats.correct + 1,
        streak: stats.streak + 1
      }
      setSession(prev => ({ correct: prev.correct + 1, wrong: prev.wrong, streak: prev.streak + 1 }))
      setFeedback(`Correct: ${currentWord.latin}`)
      saveProgress(progressRef.current)
      setTimeout(nextCard, 900)
      return
    }

    playSound('wrong')
    progressRef.current[currentWord.id] = {
      ...stats,
      wrong: stats.wrong + 1,
      streak: 0
    }
    setSession(prev => ({ correct: prev.correct, wrong: prev.wrong + 1, streak: 0 }))
    setFeedback(`Answer: ${currentWord.latin}`)
    setRevealed(true)
    saveProgress(progressRef.current)
  }

  const attempts = session.correct + session.wrong

  return (
    <div className="latin-world-page" ref={activityRef} onPointerDown={markActivity} onKeyDown={markActivity}>
      <div className="latin-stars"></div>
      <Motion.div className="latin-shell" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="latin-topbar">
          <button className="latin-back-button" onClick={() => navigate('/')}>Back</button>
          <div>
            <p className="latin-kicker">Latin World Blaster</p>
            <h1>Choose a category, then type the Latin.</h1>
          </div>
          <div className="latin-focus-card">
            <span>Active Focus</span>
            <strong>{focusText}</strong>
            <small>{focusStatus} / {focusGoalText}</small>
            <div className="latin-focus-bar"><div style={{ width: `${focusPercent}%` }} /></div>
            <button type="button" onClick={resetTimer}>Reset</button>
          </div>
        </div>

        <section className="latin-category-panel">
          {categoryOptions.map(option => (
            <Motion.button
              key={option.id}
              className={`latin-category-card ${category === option.id ? 'selected' : ''}`}
              onClick={() => { playSound('click'); setCategory(option.id) }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>{option.label}</span>
              <small>{option.count} words</small>
            </Motion.button>
          ))}
        </section>

        <section className="latin-game-grid">
          <div className="latin-map-card">
            <div className="latin-map-tools">
              <button className={viewMode === 'continent' ? 'active' : ''} onClick={() => setViewMode('continent')}>Continent</button>
              <button className={viewMode === 'country' ? 'active' : ''} onClick={() => setViewMode('country')}>Country</button>
              <span>{currentCountry ? `${currentCountry.name}, ${currentCountry.continent}` : 'Loading map'}</span>
            </div>
            <canvas ref={canvasRef} className="latin-world-canvas" />
          </div>

          <form className="latin-answer-card" onSubmit={handleSubmit}>
            <span className="latin-card-badge">{latinCategoryLabels[category]}</span>
            <h2>{currentWord?.english || 'Loading...'}</h2>
            <p>Type the Latin headword. If you miss it, the answer appears and comes back more often.</p>
            <input
              ref={answerRef}
              value={answer}
              onChange={event => { setAnswer(event.target.value); markActivity() }}
              placeholder="Latin answer"
              spellCheck="false"
              autoComplete="off"
            />
            <button className="latin-submit-button" type="submit">{revealed ? 'Next stop' : 'Enter'}</button>
            {feedback && <div className={`latin-feedback ${revealed ? 'wrong' : 'correct'}`}>{feedback}</div>}

            <div className="latin-stats-row">
              <div><strong>{session.correct}</strong><span>correct</span></div>
              <div><strong>{session.wrong}</strong><span>missed</span></div>
              <div><strong>{session.streak}</strong><span>streak</span></div>
              <div><strong>{attempts ? Math.round((session.correct / attempts) * 100) : 100}%</strong><span>accuracy</span></div>
            </div>
          </form>
        </section>
      </Motion.div>
    </div>
  )
}

export default LatinWorldPage
