import { useRef, useState, useEffect, useCallback } from 'react'
import './WritingCanvas.css'

const PEN_STYLES = [
  { name: 'Pen', color: '#1a1a2e', width: 2.5, icon: '\u270F\uFE0F' },
  { name: 'Pencil', color: '#4a4a4a', width: 1.5, icon: '\u2712\uFE0F' },
  { name: 'Marker', color: '#2d3436', width: 5, icon: '\uD83D\uDD8D\uFE0F' },
  { name: 'Blue Pen', color: '#0984e3', width: 2.5, icon: '\uD83D\uDD35' },
  { name: 'Red Pen', color: '#d63031', width: 2.5, icon: '\uD83D\uDD34' },
  { name: 'Green Pen', color: '#00b894', width: 2.5, icon: '\uD83D\uDFE2' },
]

function WritingCanvas({ guideLines = true, readOnly = false, initialStrokes = null, onStrokesChange, height = 600 }) {
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState([])
  const [currentStroke, setCurrentStroke] = useState(null)
  const [penStyle, setPenStyle] = useState(0)
  const [undoStack, setUndoStack] = useState([])
  const [canvasSize, setCanvasSize] = useState({ width: 800, height })

  // Resize canvas to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: Math.floor(rect.width), height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [height])

  // Load initial strokes (for read-only viewing)
  useEffect(() => {
    if (initialStrokes && Array.isArray(initialStrokes)) {
      setStrokes(initialStrokes)
    }
  }, [initialStrokes])

  // Draw guide lines on overlay canvas
  useEffect(() => {
    if (!guideLines || !overlayRef.current) return
    const ctx = overlayRef.current.getContext('2d')
    const { width, height: h } = canvasSize

    ctx.clearRect(0, 0, width, h)

    const lineSpacing = 36
    const marginTop = 20

    for (let y = marginTop + lineSpacing; y < h; y += lineSpacing) {
      // Dotted midline
      ctx.beginPath()
      ctx.setLineDash([4, 8])
      ctx.strokeStyle = 'rgba(173, 216, 230, 0.4)'
      ctx.lineWidth = 0.5
      ctx.moveTo(40, y - lineSpacing / 2)
      ctx.lineTo(width - 20, y - lineSpacing / 2)
      ctx.stroke()

      // Solid baseline
      ctx.beginPath()
      ctx.setLineDash([])
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.3)'
      ctx.lineWidth = 0.8
      ctx.moveTo(40, y)
      ctx.lineTo(width - 20, y)
      ctx.stroke()
    }

    // Left margin line
    ctx.beginPath()
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)'
    ctx.lineWidth = 1.5
    ctx.moveTo(40, 0)
    ctx.lineTo(40, h)
    ctx.stroke()
  }, [guideLines, canvasSize])

  // Redraw all strokes
  const redrawStrokes = useCallback((strokesToDraw) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    for (const stroke of strokesToDraw) {
      if (stroke.points.length < 2) continue

      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const points = stroke.points
      ctx.moveTo(points[0].x, points[0].y)

      for (let i = 1; i < points.length; i++) {
        const p = points[i]
        const prevP = points[i - 1]

        // Pressure-sensitive width
        const pressure = p.pressure || 0.5
        ctx.lineWidth = stroke.width * (0.5 + pressure)

        // Smooth curve through midpoints
        const midX = (prevP.x + p.x) / 2
        const midY = (prevP.y + p.y) / 2
        ctx.quadraticCurveTo(prevP.x, prevP.y, midX, midY)
      }
      ctx.stroke()
    }
  }, [canvasSize])

  // Redraw whenever strokes change
  useEffect(() => {
    redrawStrokes(strokes)
  }, [strokes, redrawStrokes])

  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
      time: Date.now()
    }
  }

  const handlePointerDown = (e) => {
    if (readOnly) return
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)

    const point = getPointerPos(e)
    const style = PEN_STYLES[penStyle]
    const newStroke = {
      color: style.color,
      width: style.width,
      points: [point]
    }
    setCurrentStroke(newStroke)
    setIsDrawing(true)
  }

  const handlePointerMove = (e) => {
    if (!isDrawing || readOnly || !currentStroke) return
    e.preventDefault()

    const point = getPointerPos(e)
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, point]
    }
    setCurrentStroke(updatedStroke)

    // Draw in real-time
    redrawStrokes([...strokes, updatedStroke])
  }

  const handlePointerUp = (e) => {
    if (!isDrawing || readOnly || !currentStroke) return
    e.preventDefault()

    if (currentStroke.points.length >= 2) {
      const newStrokes = [...strokes, currentStroke]
      setStrokes(newStrokes)
      setUndoStack([])
      if (onStrokesChange) onStrokesChange(newStrokes)
    }
    setCurrentStroke(null)
    setIsDrawing(false)
  }

  const handleUndo = () => {
    if (strokes.length === 0) return
    const removed = strokes[strokes.length - 1]
    const newStrokes = strokes.slice(0, -1)
    setStrokes(newStrokes)
    setUndoStack([...undoStack, removed])
    if (onStrokesChange) onStrokesChange(newStrokes)
  }

  const handleRedo = () => {
    if (undoStack.length === 0) return
    const restored = undoStack[undoStack.length - 1]
    const newStrokes = [...strokes, restored]
    setStrokes(newStrokes)
    setUndoStack(undoStack.slice(0, -1))
    if (onStrokesChange) onStrokesChange(newStrokes)
  }

  const handleClear = () => {
    setUndoStack([...undoStack, ...strokes])
    setStrokes([])
    if (onStrokesChange) onStrokesChange([])
  }

  // Generate thumbnail as data URL
  const getThumbnail = useCallback(() => {
    if (!canvasRef.current) return null
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 200
    tempCanvas.height = 150
    const ctx = tempCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 200, 150)
    ctx.drawImage(canvasRef.current, 0, 0, canvasSize.width, canvasSize.height, 0, 0, 200, 150)
    return tempCanvas.toDataURL('image/png', 0.6)
  }, [canvasSize])

  // Expose getThumbnail and getStrokes
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current._getThumbnail = getThumbnail
      canvasRef.current._getStrokes = () => strokes
    }
  }, [getThumbnail, strokes])

  return (
    <div className="writing-canvas-wrapper" ref={containerRef}>
      {!readOnly && (
        <div className="canvas-toolbar">
          <div className="pen-styles">
            {PEN_STYLES.map((style, i) => (
              <button
                key={i}
                className={`pen-btn ${penStyle === i ? 'active' : ''}`}
                onClick={() => setPenStyle(i)}
                title={style.name}
              >
                <span className="pen-icon">{style.icon}</span>
                <span className="pen-label">{style.name}</span>
              </button>
            ))}
          </div>
          <div className="canvas-actions">
            <button className="action-btn undo-btn" onClick={handleUndo} disabled={strokes.length === 0} title="Undo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 015 5v2"/><path d="M3 10l5-5M3 10l5 5"/></svg>
              Undo
            </button>
            <button className="action-btn redo-btn" onClick={handleRedo} disabled={undoStack.length === 0} title="Redo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H11a5 5 0 00-5 5v2"/><path d="M21 10l-5-5M21 10l-5 5"/></svg>
              Redo
            </button>
            <button className="action-btn clear-btn" onClick={handleClear} disabled={strokes.length === 0} title="Clear All">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6"/></svg>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="canvas-container" style={{ height: canvasSize.height }}>
        {/* Guide lines layer (behind) */}
        <canvas
          ref={overlayRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="guide-canvas"
        />
        {/* Drawing layer (front) */}
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`drawing-canvas ${readOnly ? 'read-only' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>

      {!readOnly && (
        <div className="canvas-hint">
          Use your tablet stylus, pen, or mouse to write. Stroke count: {strokes.length}
        </div>
      )}
    </div>
  )
}

export { WritingCanvas, PEN_STYLES }
export default WritingCanvas
