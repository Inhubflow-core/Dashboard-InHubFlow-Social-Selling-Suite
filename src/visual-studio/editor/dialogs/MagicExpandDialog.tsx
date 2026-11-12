import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Maximize2, Loader2, Check, RotateCcw, LayoutTemplate, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useEditor } from '../context'
import { runLamaOutpainting, type OutpaintExpansion, type OutpaintResult } from '../engine/magicExpand/lamaOutpainter'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import styles from './MagicExpandDialog.module.css'

type PresetMode = 'fill-canvas' | '1:1' | '16:9' | '9:16' | '4:5' | 'custom'

interface PresetOption {
  id: PresetMode
  label: string
  hint: string
  icon: typeof Square
}

const PRESETS: PresetOption[] = [
  { id: 'fill-canvas', label: 'Llenar lienzo', hint: 'Tamaño de la página', icon: LayoutTemplate },
  { id: '1:1', label: '1:1 Cuadrado', hint: 'Feed / Perfil', icon: Square },
  { id: '16:9', label: '16:9 Horizontal', hint: 'Presentación / Portada', icon: RectangleHorizontal },
  { id: '9:16', label: '9:16 Vertical', hint: 'Stories / Reels', icon: RectangleVertical },
  { id: '4:5', label: '4:5 Retrato', hint: 'LinkedIn / Post', icon: RectangleVertical },
  { id: 'custom', label: 'Libre', hint: 'Ajuste manual', icon: Maximize2 },
]

type ExpandStatus =
  | { kind: 'idle' }
  | { kind: 'running'; phase: 'downloading' | 'processing'; percent: number }
  | { kind: 'completed' }
  | { kind: 'error'; message: string }

export function MagicExpandDialog() {
  const editor = useEditor()
  const view = editor.activeView()
  const selectedObj = view?.selectedObjects()[0]
  const targetObjRef = useRef<any>(selectedObj)

  if (selectedObj && targetObjRef.current !== selectedObj) {
    targetObjRef.current = selectedObj
  }

  const [preset, setPreset] = useState<PresetMode>('fill-canvas')
  const [customExpansion, setCustomExpansion] = useState<OutpaintExpansion>({ left: 100, right: 100, top: 0, bottom: 0 })
  const [status, setStatus] = useState<ExpandStatus>({ kind: 'idle' })
  const [previewMode, setPreviewMode] = useState<'generated' | 'original'>('generated')

  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [origSize, setOrigSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [originalDataUrl, setOriginalDataUrl] = useState<string>('')
  const [outpaintResult, setOutpaintResult] = useState<OutpaintResult | null>(null)

  // Get current active page size
  const activePageId = editor.state.activePageId ?? editor.state.doc.pages[0]?.id ?? ''
  const pageSize = editor.pageSizeOf(activePageId)

  // 1. Extract selected image into a clean HTMLCanvasElement
  useEffect(() => {
    if (!selectedObj || selectedObj.type !== 'image') {
      editor.closeDialog()
      return
    }

    let isMounted = true
    const anyObj = selectedObj as any

    const setupCanvas = (imageSource: CanvasImageSource, width: number, height: number) => {
      const c = document.createElement('canvas')
      c.width = width
      c.height = height
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.drawImage(imageSource, 0, 0, width, height)
        originalCanvasRef.current = c
        if (isMounted) {
          setOrigSize({ width, height })
          setOriginalDataUrl(c.toDataURL('image/png'))
        }
      }
    }

    const el = anyObj.getElement?.() || anyObj._element
    if (el && (el.naturalWidth || el.width)) {
      const w = el.naturalWidth || el.width
      const h = el.naturalHeight || el.height
      setupCanvas(el, w, h)
      return
    }

    const loadSafely = async () => {
      const rawSrc = anyObj.getSrc?.() || anyObj._element?.src || ''
      if (!rawSrc) return
      try {
        const resolved = await editor.assets.resolve(rawSrc)
        const finalUrl = resolved.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(resolved)}` : resolved
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (!isMounted) return
          setupCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height)
        }
        img.src = finalUrl
      } catch (err) {
        console.error('[Magic Expand] Error loading image:', err)
      }
    }

    void loadSafely()

    return () => {
      isMounted = false
    }
  }, [selectedObj, editor])

  // 2. Calculate effective expansion depending on the selected preset
  const expansion: OutpaintExpansion = useMemo(() => {
    const { width: W, height: H } = origSize
    if (W === 0 || H === 0) return { left: 0, right: 0, top: 0, bottom: 0 }

    if (preset === 'custom') {
      return customExpansion
    }

    let targetRatio = 1

    if (preset === 'fill-canvas') {
      targetRatio = pageSize.width / pageSize.height
    } else if (preset === '1:1') {
      targetRatio = 1
    } else if (preset === '16:9') {
      targetRatio = 16 / 9
    } else if (preset === '9:16') {
      targetRatio = 9 / 16
    } else if (preset === '4:5') {
      targetRatio = 4 / 5
    }

    const currentRatio = W / H

    if (currentRatio < targetRatio) {
      // Need horizontal expansion (widen sides)
      const wantedWidth = Math.round(H * targetRatio)
      const diff = Math.max(0, wantedWidth - W)
      const half = Math.round(diff / 2)
      return { left: half, right: diff - half, top: 0, bottom: 0 }
    } else {
      // Need vertical expansion (lengthen top and bottom)
      const wantedHeight = Math.round(W / targetRatio)
      const diff = Math.max(0, wantedHeight - H)
      const half = Math.round(diff / 2)
      return { left: 0, right: 0, top: half, bottom: diff - half }
    }
  }, [preset, customExpansion, origSize, pageSize])

  const targetDimensions = useMemo(() => {
    return {
      width: origSize.width + expansion.left + expansion.right,
      height: origSize.height + expansion.top + expansion.bottom,
    }
  }, [origSize, expansion])

  // 3. Run Outpainting
  const handleGenerate = useCallback(async () => {
    const origCanvas = originalCanvasRef.current
    if (!origCanvas) return

    setStatus({ kind: 'running', phase: 'processing', percent: 10 })

    try {
      const result = await runLamaOutpainting(origCanvas, expansion, {
        onProgress: (phase, percent) => {
          setStatus({ kind: 'running', phase, percent })
        },
      })

      setOutpaintResult(result)
      setStatus({ kind: 'completed' })
      setPreviewMode('generated')
    } catch (err: any) {
      console.error('[Magic Expand] Error during outpainting:', err)
      setStatus({ kind: 'error', message: err.message || 'Error al expandir la imagen' })
    }
  }, [expansion])

  // 4. Apply back to canvas
  const handleApply = useCallback(async () => {
    if (!outpaintResult?.blob) return

    setStatus({ kind: 'running', phase: 'processing', percent: 90 })

    try {
      console.log('[Magic Expand] Uploading outpainted image asset...')
      const ref = await editor.assets.upload(outpaintResult.blob, 'magic-expanded.png')
      const target = targetObjRef.current

      console.log('[Magic Expand] Replacing image on canvas...', ref, target)
      await editor.insert.replaceSelectedImage(ref, 'Expansión mágica', undefined, target)

      const activeV = editor.activeView()
      if (activeV && target) {
        target.dirty = true
        if (typeof target.clearCache === 'function') target.clearCache()
        activeV.selectObjects([target])
        activeV.canvas.requestRenderAll()
      }

      editor.toast('¡Imagen expandida con IA exitosamente!', 'success')
      editor.closeDialog()
    } catch (err) {
      console.error('[Magic Expand] Failed to apply to canvas:', err)
      editor.toast('Error al aplicar la imagen expandida', 'error')
      setStatus({ kind: 'error', message: 'Error al actualizar el lienzo' })
    }
  }, [editor, outpaintResult])

  return (
    <Dialog
      title="Expansión Mágica (IA)"
      width={1020}
      onClose={() => editor.closeDialog()}
      footer={
        <div className={styles.footerActions}>
          <div className={styles.footerLeft}>
            {outpaintResult ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOutpaintResult(null)
                  setStatus({ kind: 'idle' })
                }}
                disabled={status.kind === 'running'}
              >
                <RotateCcw size={14} style={{ marginRight: 6 }} />
                Reconfigurar tamaño
              </Button>
            ) : null}
          </div>
          <div className={styles.footerRight}>
            <Button variant="ghost" onClick={() => editor.closeDialog()} disabled={status.kind === 'running'}>
              Cancelar
            </Button>
            {outpaintResult ? (
              <Button variant="primary" onClick={handleApply} disabled={status.kind === 'running'}>
                <Check size={16} style={{ marginRight: 6 }} />
                Aplicar al diseño
              </Button>
            ) : (
              <Button variant="primary" onClick={handleGenerate} disabled={status.kind === 'running' || origSize.width === 0}>
                {status.kind === 'running' ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} style={{ marginRight: 6 }} />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} style={{ marginRight: 6 }} />
                    Expandir imagen con IA
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className={styles.container}>
        {/* Left sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.instructionCard}>
            <div className={styles.instructionHeader}>
              <Sparkles size={16} color="#2563eb" />
              <span>Extrapolación con IA (Local)</span>
            </div>
            <p>
              Elige el formato deseado. La IA continuará de forma fluida el fondo, la textura y la escena original en los bordes.
            </p>
          </div>

          <div className={styles.sidebarSection}>
            <span className={styles.sectionTitle}>Formato de Expansión</span>
            <div className={styles.presetGrid}>
              {PRESETS.map((p) => {
                const Icon = p.icon
                const isActive = preset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ''}`}
                    onClick={() => {
                      setPreset(p.id)
                      setOutpaintResult(null)
                      setStatus({ kind: 'idle' })
                    }}
                    disabled={status.kind === 'running'}
                  >
                    <span className={styles.presetIcon}>
                      <Icon size={18} />
                    </span>
                    <span className={styles.presetLabel}>{p.label}</span>
                    <span className={styles.presetHint}>{p.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {preset === 'custom' ? (
            <div className={styles.customControls}>
              <span className={styles.sectionTitle}>Bordes manuales (px)</span>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Izquierda</span>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="10"
                  className={styles.sliderInput}
                  value={customExpansion.left}
                  onChange={(e) => setCustomExpansion((prev) => ({ ...prev, left: parseInt(e.target.value) || 0 }))}
                />
                <span className={styles.sliderValue}>+{customExpansion.left}px</span>
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Derecha</span>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="10"
                  className={styles.sliderInput}
                  value={customExpansion.right}
                  onChange={(e) => setCustomExpansion((prev) => ({ ...prev, right: parseInt(e.target.value) || 0 }))}
                />
                <span className={styles.sliderValue}>+{customExpansion.right}px</span>
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Arriba</span>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="10"
                  className={styles.sliderInput}
                  value={customExpansion.top}
                  onChange={(e) => setCustomExpansion((prev) => ({ ...prev, top: parseInt(e.target.value) || 0 }))}
                />
                <span className={styles.sliderValue}>+{customExpansion.top}px</span>
              </div>
              <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>Abajo</span>
                <input
                  type="range"
                  min="0"
                  max="400"
                  step="10"
                  className={styles.sliderInput}
                  value={customExpansion.bottom}
                  onChange={(e) => setCustomExpansion((prev) => ({ ...prev, bottom: parseInt(e.target.value) || 0 }))}
                />
                <span className={styles.sliderValue}>+{customExpansion.bottom}px</span>
              </div>
            </div>
          ) : null}

          <div className={styles.dimensionsCard}>
            <div className={styles.dimensionRow}>
              <span>Tamaño original:</span>
              <span className={styles.dimensionValue}>{origSize.width} × {origSize.height} px</span>
            </div>
            <div className={styles.dimensionRow}>
              <span>Tamaño expandido:</span>
              <span className={styles.dimensionValue} style={{ color: '#2563eb' }}>
                {targetDimensions.width} × {targetDimensions.height} px
              </span>
            </div>
          </div>
        </aside>

        {/* Right preview stage */}
        <section className={styles.previewStage}>
          {status.kind === 'running' ? (
            <div className={styles.progressOverlay}>
              <Loader2 size={36} className={styles.spinner} />
              <span className={styles.progressLabel}>
                {status.phase === 'downloading'
                  ? 'Preparando motor de IA...'
                  : `Generando expansión mágica (${status.percent}%)...`}
              </span>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarFill} style={{ width: `${status.percent}%` }} />
              </div>
            </div>
          ) : null}

          <div className={styles.viewportContainer}>
            {outpaintResult && previewMode === 'generated' ? (
              <img src={outpaintResult.previewUrl} alt="Vista expandida con IA" className={styles.previewImage} />
            ) : originalDataUrl ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={originalDataUrl} alt="Imagen original" className={styles.previewImage} />
                {/* Visual badge for simulated expansion area */}
                <div className={styles.expansionBadge}>
                  <Sparkles size={12} />
                  <span>Área a expandir: +{targetDimensions.width - origSize.width}px horizontal, +{targetDimensions.height - origSize.height}px vertical</span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Cargando previsualización...</div>
            )}
          </div>

          {outpaintResult ? (
            <div className={styles.previewToolbar}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${previewMode === 'original' ? styles.toggleBtnActive : ''}`}
                onClick={() => setPreviewMode('original')}
              >
                Original
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${previewMode === 'generated' ? styles.toggleBtnActive : ''}`}
                onClick={() => setPreviewMode('generated')}
              >
                ✨ Expandida con IA
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </Dialog>
  )
}
