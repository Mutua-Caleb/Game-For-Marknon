export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftDateString(dateStr, deltaDays) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays)
  return getLocalDateString(dt)
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatShortDayLabel(dateStr) {
  if (!dateStr) return { dow: '', day: '', month: '' }
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return {
    dow: dt.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d),
    month: dt.toLocaleDateString('en-US', { month: 'short' })
  }
}

export function formatClockTime(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatClockTimeWithSeconds(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatDateTimeCompact(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatDurationHuman(totalSeconds) {
  const sec = Math.max(0, Math.round(Number(totalSeconds) || 0))
  if (sec === 0) return '0s'
  const hrs = Math.floor(sec / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  const rem = sec % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  if (mins > 0) return `${mins}m ${String(rem).padStart(2, '0')}s`
  return `${rem}s`
}

export function formatDurationClock(totalSeconds) {
  const sec = Math.max(0, Math.round(Number(totalSeconds) || 0))
  const mins = Math.floor(sec / 60)
  const rem = sec % 60
  return `${mins}:${String(rem).padStart(2, '0')}`
}

export function formatMs(ms) {
  const n = Number(ms) || 0
  if (n <= 0) return '—'
  if (n < 1000) return `${n}ms`
  const sec = n / 1000
  if (sec < 60) return `${sec.toFixed(1)}s`
  return formatDurationHuman(Math.round(sec))
}

export function formatGameMode(mode) {
  const map = {
    quiz: 'Topic Quiz',
    'maths-forge': 'CE 13+ Maths',
    math: 'Mental Arithmetic',
    reading: 'Reading Studio',
    cat4: 'CAT4 Reasoning',
    french: 'French Atelier',
    mistakes: 'Mistake Forge',
    sequence: 'Sequence',
    diagram: 'Diagram',
    latin: 'Latin',
    chemistry: 'Chemistry'
  }
  return map[mode] || mode || 'Quiz'
}

export function getSubjectTone(subject) {
  const key = String(subject || '').toLowerCase()
  if (key.includes('english') || key.includes('reading')) return 'emerald'
  if (key.includes('math')) return 'amber'
  if (key.includes('cat4')) return 'blue'
  if (key.includes('french')) return 'cyan'
  if (key.includes('mistake')) return 'rose'
  return 'slate'
}

export function getAccuracyTone(accuracy) {
  const pct = Number(accuracy) || 0
  if (pct >= 80) return 'good'
  if (pct >= 55) return 'mid'
  return 'low'
}

export function buildRecentDaysList(count = 14, anchorDateStr = getLocalDateString()) {
  const days = []
  for (let i = count - 1; i >= 0; i -= 1) {
    days.push(shiftDateString(anchorDateStr, -i))
  }
  return days
}

export function downloadCsv(filename, headers, rows) {
  const escapeCell = (val) => {
    const str = val === null || val === undefined ? '' : String(val)
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
