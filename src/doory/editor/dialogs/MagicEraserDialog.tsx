import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Undo2, Trash2, Check, Sparkles, Loader2 } from 'lucide-react'
import { useEditor } from '../context'
import { runLamaInpainting } from '../engine/magicEraser/lamaInpainter'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import styles from './MagicEraserDialog.module.css'

type EraserStatus =
  | { kind: 'idle' }
  | { kind: 'running'; phase: 'downloading' | 'processing'; percent: number }
  | { kind: 'error'; message: string }

export function MagicEraserDialog() {
  const editor = useEditor()
  const view = editor.activeView()
  const selectedObj = view?.selectedObjects()[0]
  const targetObjRef = useRef<any>(selectedObj)

  if (selectedObj && targetObjRef.current !== selectedObj) {
    targetObjRef.current = selectedObj
  }

  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const [brushSize, setBrushSize] = useState(32)
  const [hasMask, setHasMask] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [status, setStatus] = useState<EraserStatus>({ kind: 'idle' })
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })

  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const maskHistory = useRef<ImageData[]>([])
  const imageHistory = useRef<ImageData[]>([])

  // Initialize and render base image into canvas
  useEffect(() => {
    if (!selectedObj || selectedObj.type !== 'image') {
      editor.closeDialog()
      return
    }

    const anyObj = selectedObj as any
    const src = anyObj.getSrc?.() || anyObj._element?.src || ''
    if (!src) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const imgCanvas = imageCanvasRef.current
      const maskCanvas = maskCanvasRef.current
      if (!imgCanvas || !maskCanvas) return

      imgCanvas.width = img.naturalWidth || img.width
      imgCanvas.height = img.naturalHeight || img.height
      maskCanvas.width = imgCanvas.width
      maskCanvas.height = imgCanvas.height

      const imgCtx = imgCanvas.getContext('2d')
      if (imgCtx) {
        imgCtx.drawImage(img, 0, 0)
        // Store initial image state
        imageHistory.current = [imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height)]
      }

      const maskCtx = maskCanvas.getContext('2d')
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      }
    }
    img.src = src
  }, [selectedObj, editor])

  // Coordinate mapper from mouse pointer to native canvas resolution
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return { x: 0, y: 0, scale: 1 }

    const rect = maskCanvas.getBoundingClientRect()
    const scaleX = maskCanvas.width / rect.width
    const scaleY = maskCanvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      scale: scaleX,
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (status.kind === 'running') return
      const maskCanvas = maskCanvasRef.current
      if (!maskCanvas) return

      const ctx = maskCanvas.getContext('2d')
      if (!ctx) return

      // Save undo snapshot of current mask
      maskHistory.current.push(ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height))
      if (maskHistory.current.length > 20) maskHistory.current.shift()

      isDrawing.current = true
      const { x, y, scale } = getCanvasCoords(e)
      lastPoint.current = { x, y }

      const actualRadius = (brushSize * scale) / 2
      ctx.fillStyle = 'rgba(16, 185, 129, 0.45)'
      ctx.beginPath()
      ctx.arc(x, y, actualRadius, 0, Math.PI * 2)
      ctx.fill()

      setHasMask(true)
    },
    [brushSize, getCanvasCoords, status.kind],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      setCursorPos({ x: e.clientX, y: e.clientY, visible: true })

      if (!isDrawing.current || status.kind === 'running') return
      const maskCanvas = maskCanvasRef.current
      if (!maskCanvas) return

      const ctx = maskCanvas.getContext('2d')
      if (!ctx || !lastPoint.current) return

      const { x, y, scale } = getCanvasCoords(e)
      const actualWidth = brushSize * scale

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)'
      ctx.fillStyle = 'rgba(16, 185, 129, 0.45)'
      ctx.lineWidth = actualWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()

      lastPoint.current = { x, y }
      setHasMask(true)
    },
    [brushSize, getCanvasCoords, status.kind],
  )

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false
    lastPoint.current = null
  }, [])

  const handlePointerLeave = useCallback(() => {
    isDrawing.current = false
    lastPoint.current = null
    setCursorPos((prev) => ({ ...prev, visible: false }))
  }, [])

  // Undo last mask brush stroke
  const handleUndoStroke = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return

    const previous = maskHistory.current.pop()
    if (previous) {
      ctx.putImageData(previous, 0, 0)
    } else {
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      setHasMask(false)
    }

    if (maskHistory.current.length === 0) {
      setHasMask(false)
    }
  }, [])

  // Clear mask entirely
  const handleClearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const ctx = maskCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    maskHistory.current = []
    setHasMask(false)
  }, [])

  // Execute inpainting with LaMa
  const handleRunInpaint = useCallback(async () => {
    const imgCanvas = imageCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!imgCanvas || !maskCanvas || !hasMask || status.kind === 'running') return

    try {
      setStatus({ kind: 'running', phase: 'downloading', percent: 0 })

      const resultBlob = await runLamaInpainting(imgCanvas, maskCanvas, (phase, percent) => {
        setStatus({ kind: 'running', phase, percent })
      })

      // Load new inpainted result back into base image canvas
      const img = new Image()
      img.src = URL.createObjectURL(resultBlob)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
      })

      const ctx = imgCanvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height)
        ctx.drawImage(img, 0, 0)
        imageHistory.current.push(ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height))
      }

      // Clear mask
      const maskCtx = maskCanvas.getContext('2d')
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      }
      maskHistory.current = []
      setHasMask(false)
      setHasChanges(true)
      setStatus({ kind: 'idle' })
      editor.toast('Elemento eliminado del fondo', 'success')
    } catch (err: any) {
      console.error('[Magic Eraser] Error during inpainting:', err)
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Error al procesar el borrado.' })
    }
  }, [editor, hasMask, status.kind])

  // Apply cleaned image to canvas
  const handleApply = useCallback(async () => {
    const imgCanvas = imageCanvasRef.current
    if (!imgCanvas) return

    imgCanvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        console.log('[Magic Eraser] Uploading cleaned image asset...')
        const ref = await editor.assets.upload(blob, 'magic-erased.png')
        const view = editor.activeView()
        const target = targetObjRef.current
        if (view && target) {
          view.selectObjects([target])
        }
        console.log('[Magic Eraser] Replacing selected image on canvas...')
        await editor.insert.replaceSelectedImage(ref, 'Borrador mágico', undefined, target)
        editor.toast('Imagen actualizada', 'success')
        editor.closeDialog()
      } catch (err) {
        console.error('[Magic Eraser] Failed to replace image:', err)
        editor.toast('Error al aplicar la imagen al diseño', 'error')
      }
    }, 'image/png')
  }, [editor])

  return (
    <Dialog
      title="Borrador Mágico (IA)"
      width={860}
      onClose={() => editor.closeDialog()}
      footer={
        <div className={styles.footerActions}>
          <Button variant="ghost" onClick={() => editor.closeDialog()}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={!hasChanges && !hasMask}
            title={hasChanges ? 'Aplica los cambios al diseño' : 'Primero elimina algún elemento'}
          >
            <Check size={16} />
            Aplicar al diseño
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        {/* Instruction Banner */}
        <div className={styles.instructionBar}>
          <div className={styles.instructionText}>
            <Sparkles size={16} color="#10b981" />
            <span>Pasa el pincel sobre las personas, textos o elementos que quieras hacer desaparecer.</span>
          </div>
          {hasChanges && <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Cambios realizados</span>}
        </div>

        {/* Painting Canvas Viewport */}
        <div ref={viewportRef} className={styles.viewport}>
          <div className={styles.canvasWrapper}>
            <canvas ref={imageCanvasRef} className={styles.imageCanvas} />
            <canvas
              ref={maskCanvasRef}
              className={styles.maskCanvas}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            />
          </div>

          {/* Floating Circular Brush Cursor */}
          {cursorPos.visible && (
            <div
              className={styles.brushCursor}
              style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                width: `${brushSize}px`,
                height: `${brushSize}px`,
              }}
            />
          )}
        </div>

        {/* Tool Controls Bar */}
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <label className={styles.sliderLabel}>
              <Eraser size={16} />
              Grosor del pincel:
              <input
                type="range"
                min="10"
                max="90"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className={styles.sliderInput}
              />
              <span
                className={styles.brushPreviewCircle}
                style={{ width: `${Math.max(8, brushSize / 2)}px`, height: `${Math.max(8, brushSize / 2)}px` }}
              />
              <span style={{ fontSize: '12px', color: '#64748b', minWidth: '32px' }}>{brushSize}px</span>
            </label>
          </div>

          <div className={styles.toolGroup}>
            <Button
              variant="ghost"
              onClick={handleUndoStroke}
              disabled={maskHistory.current.length === 0}
              title="Deshacer último trazo"
            >
              <Undo2 size={16} />
              Deshacer trazo
            </Button>

            <Button
              variant="ghost"
              onClick={handleClearMask}
              disabled={!hasMask}
              title="Borrar selección de trazos"
            >
              <Trash2 size={16} />
              Limpiar
            </Button>

            <Button
              variant="primary"
              onClick={handleRunInpaint}
              disabled={!hasMask || status.kind === 'running'}
            >
              {status.kind === 'running' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Borrar objeto
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress bar during AI download/inference */}
        {status.kind === 'running' && (
          <div className={styles.progressBarContainer}>
            <div className={styles.progressLabel}>
              <span>
                {status.phase === 'downloading'
                  ? 'Descargando modelo de borrado inteligente (solo la primera vez)...'
                  : 'Reconstruyendo el fondo con IA...'}
              </span>
              <span>{status.percent}%</span>
            </div>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${status.percent}%` }} />
            </div>
          </div>
        )}

        {/* Error message */}
        {status.kind === 'error' && (
          <div style={{ color: '#ef4444', fontSize: '13px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
            ⚠️ {status.message}
          </div>
        )}
      </div>
    </Dialog>
  )
}
