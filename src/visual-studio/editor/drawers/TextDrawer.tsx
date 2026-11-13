import { useEffect, useState } from 'react'
import { IText } from 'fabric'
import { useEditor } from '../context'
import { TEXT_PRESETS, createTextbox } from '../engine/objects/factories'
import { HIGHLIGHT_STYLES, applyTextHighlight } from '../engine/objects/highlights'
import { fontStack, primaryFamily } from '../engine/text/fontStack'
import type { PanelProps } from '../panels/registry'
import { t } from '../strings'
import ed from '../chrome/ed.module.css'
import { pageCentre } from './insertAt'
import {
  PAIRINGS,
  AVAILABLE_FONTS,
  ACCENT_COLOR_PRESETS,
  getCustomPairings,
  saveCustomPairing,
  deleteCustomPairing,
  type Pairing,
  faceOptions,
} from './pairings'
import styles from './Drawers.module.css'

const ARC_UP = <path d="M2 18 Q20 0 38 18" stroke="currentColor" strokeWidth="2" fill="none" />
const ARC_DOWN = <path d="M2 2 Q20 20 38 2" stroke="currentColor" strokeWidth="2" fill="none" />

/** Text drawer: starter styles, arcs, and font pairings with custom management & canvas capture. */
export function TextDrawer({ close }: PanelProps) {
  const editor = useEditor()

  // Combinaciones personalizadas del usuario
  const [customPairings, setCustomPairings] = useState<Pairing[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Campos del formulario de creación
  const [newName, setNewName] = useState('')
  const [newHeadingFamily, setNewHeadingFamily] = useState('Montserrat')
  const [newHeadingWeight, setNewHeadingWeight] = useState(800)
  const [newHeadingColor, setNewHeadingColor] = useState('#1c1517')
  const [newBodyFamily, setNewBodyFamily] = useState('Open Sans')
  const [newBodyWeight, setNewBodyWeight] = useState(400)
  const [newBodyColor, setNewBodyColor] = useState('#6b6165')
  const [newAccentColor, setNewAccentColor] = useState('#6366f1')

  useEffect(() => {
    setCustomPairings(getCustomPairings())
    const handleUpdate = () => setCustomPairings(getCustomPairings())
    window.addEventListener('inhubflow:pairings_updated', handleUpdate)
    return () => window.removeEventListener('inhubflow:pairings_updated', handleUpdate)
  }, [])

  // Precargar fuentes de presets y combinaciones
  useEffect(() => {
    for (const spec of Object.values(TEXT_PRESETS)) void editor.fonts.load(primaryFamily(spec.font), spec.weight)
    for (const p of [...PAIRINGS, ...customPairings]) {
      void editor.fonts.load(p.heading.family, p.heading.weight)
      void editor.fonts.load(p.body.family, p.body.weight)
    }
  }, [editor, customPairings])

  // Hook (título), intro (subtítulo) y frase resaltada del post activo
  const rawHook =
    editor.meta?.postTitle?.trim() ||
    (typeof window !== 'undefined' ? window.sessionStorage?.getItem('inhubflow_active_post_hook')?.trim() : '') ||
    (editor.meta?.title && editor.meta.title !== 'Diseño Social InHubFlow' ? editor.meta.title.trim() : '')
  const rawIntro =
    editor.meta?.postSubtitle?.trim() ||
    (typeof window !== 'undefined' ? window.sessionStorage?.getItem('inhubflow_active_post_intro')?.trim() : '')

  const rawHighlight =
    editor.meta?.postHighlight?.trim() ||
    (typeof window !== 'undefined' ? window.sessionStorage?.getItem('inhubflow_active_post_highlight')?.trim() : '') ||
    ''

  const [highlightWord, setHighlightWord] = useState(rawHighlight)

  const hookText = rawHook || t.drawers.pairingHeading
  const introText = rawIntro || t.drawers.pairingBody

  const add = (preset: 'heading' | 'subheading' | 'body'): void => {
    let customText: string | undefined
    if (preset === 'heading' && rawHook) customText = rawHook
    else if ((preset === 'subheading' || preset === 'body') && rawIntro) customText = rawIntro
    void editor.insert.text(preset, customText)
    close()
  }

  const addPairing = async (pairing: Pairing): Promise<void> => {
    close()
    await Promise.all([
      editor.fonts.load(pairing.heading.family, pairing.heading.weight),
      editor.fonts.load(pairing.body.family, pairing.body.weight),
    ])

    const selected = editor.selectedObjects().filter((o): o is IText => o instanceof IText)

    // Si el usuario tiene objetos de texto seleccionados, actualiza sus tipografías in-situ
    if (selected.length >= 2) {
      const [topObj, bottomObj] = [...selected].sort((a, b) => (a.top ?? 0) - (b.top ?? 0))
      topObj.set({
        fontFamily: fontStack(pairing.heading.family, pairing.heading.category),
        fontWeight: pairing.heading.weight,
        fill: pairing.heading.color,
      })
      if (!topObj.text || topObj.text === t.drawers.pairingHeading || topObj.text.toLowerCase().includes('heading') || topObj.text.toLowerCase().includes('título')) {
        topObj.set({ text: hookText })
      }
      topObj.initDimensions()

      bottomObj.set({
        fontFamily: fontStack(pairing.body.family, pairing.body.category),
        fontWeight: pairing.body.weight,
      })
      if (!bottomObj.text || bottomObj.text === t.drawers.pairingBody || bottomObj.text.toLowerCase().includes('body text') || bottomObj.text.toLowerCase().includes('subtítulo')) {
        bottomObj.set({ text: introText })
      }
      bottomObj.initDimensions()

      const view = editor.activeView()
      view?.canvas.requestRenderAll()
      editor.commitActive({ label: t.history.addTextPairing })
      editor.refreshSelection()
      return
    }

    if (selected.length === 1) {
      const obj = selected[0]
      obj.set({
        fontFamily: fontStack(pairing.heading.family, pairing.heading.category),
        fontWeight: pairing.heading.weight,
        fill: pairing.heading.color,
      })
      if (!obj.text || obj.text === t.drawers.pairingHeading || obj.text.toLowerCase().includes('heading') || obj.text.toLowerCase().includes('título')) {
        obj.set({ text: hookText })
      }
      obj.initDimensions()
      const view = editor.activeView()
      view?.canvas.requestRenderAll()
      editor.commitActive({ label: t.history.addTextPairing })
      editor.refreshSelection()
      return
    }

    // Inserción limpia en el lienzo adaptando posiciones y anchuras para evitar solapamientos
    const page = editor.pageSizeOf(editor.state.activePageId)
    const at = pageCentre(editor)
    const headingY = at.y - Math.max(page.height * 0.05, 50)
    const bodyY = at.y + Math.max(page.height * 0.06, 60)

    const heading = createTextbox(
      page,
      { x: at.x, y: headingY },
      {
        ...faceOptions(pairing.heading, 'heading', hookText),
        width: Math.round(page.width * 0.8),
      }
    )

    // Aplicar estilo de resaltado sobre la frase clave
    const targetHighlight = highlightWord.trim()
    if (targetHighlight && hookText.toLowerCase().includes(targetHighlight.toLowerCase())) {
      const start = hookText.toLowerCase().indexOf(targetHighlight.toLowerCase())
      const end = start + targetHighlight.length
      const accent = pairing.accentColor || '#6366f1'
      heading.setSelectionStyles({ fill: accent, fontWeight: 'bold' }, start, end)
      const anyH = heading as any
      delete anyH.__lineWidths
      delete anyH.__lineHeights
      delete anyH.__charBounds
      delete anyH._charBounds
      delete anyH._styleMap
      if (typeof anyH._clearCache === 'function') anyH._clearCache()
      heading.initDimensions()
      heading.setCoords()
      heading.set('dirty', true)
    }

    const body = createTextbox(
      page,
      { x: at.x, y: bodyY },
      {
        ...faceOptions(pairing.body, 'body', introText),
        width: Math.round(page.width * 0.75),
      }
    )
    await editor.insert.add([heading, body], t.history.addTextPairing)
  }

  // Capturar estilos de textos directamente seleccionados en el lienzo
  const handleCaptureFromCanvas = () => {
    const selected = editor.selectedObjects().filter((o): o is IText => o instanceof IText)
    if (selected.length === 0) {
      setIsCreating(true)
      setNewName(`Mi Combinación ${customPairings.length + 1}`)
      return
    }

    const [topObj, bottomObj] = [...selected].sort((a, b) => (a.top ?? 0) - (b.top ?? 0))
    const topFam = primaryFamily(String(topObj.fontFamily || 'Montserrat'))
    const topWeight = Number(topObj.fontWeight) || 700
    const topColor = String(topObj.fill || '#1c1517')

    let botFam = 'DM Sans'
    let botWeight = 400
    let botColor = '#6b6165'

    if (bottomObj) {
      botFam = primaryFamily(String(bottomObj.fontFamily || 'DM Sans'))
      botWeight = Number(bottomObj.fontWeight) || 400
      botColor = String(bottomObj.fill || '#6b6165')
    }

    setNewName(`Diseño Lienzo #${customPairings.length + 1}`)
    setNewHeadingFamily(topFam)
    setNewHeadingWeight(topWeight)
    setNewHeadingColor(topColor)
    setNewBodyFamily(botFam)
    setNewBodyWeight(botWeight)
    setNewBodyColor(botColor)
    setIsCreating(true)
  }

  const handleSaveNewPairing = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim() || `Combinación #${customPairings.length + 1}`
    const headingMeta = AVAILABLE_FONTS.find((f) => f.family === newHeadingFamily)
    const bodyMeta = AVAILABLE_FONTS.find((f) => f.family === newBodyFamily)

    const newPairing: Omit<Pairing, 'id' | 'isCustom'> = {
      name,
      heading: {
        family: newHeadingFamily,
        category: headingMeta?.category || 'sans-serif',
        weight: newHeadingWeight,
        color: newHeadingColor,
      },
      body: {
        family: newBodyFamily,
        category: bodyMeta?.category || 'sans-serif',
        weight: newBodyWeight,
        color: newBodyColor,
      },
      accentColor: newAccentColor,
    }

    saveCustomPairing(newPairing)
    setIsCreating(false)
  }

  const handleDeleteCustom = (e: React.MouseEvent, id: string, name?: string) => {
    e.stopPropagation()
    if (window.confirm(`¿Deseas eliminar la combinación "${name || id}"?`)) {
      deleteCustomPairing(id)
    }
  }

  const list = (style: 'bullet' | 'number'): void => {
    void editor.insert.list(style)
    close()
  }
  const arc = (direction: 'up' | 'down'): void => {
    void editor.insert.curvedText(direction)
    close()
  }

  // Renderizador de tarjeta de combinación
  const renderPairingCard = (p: Pairing) => {
    const isCustom = p.isCustom
    const displayName = isCustom ? p.name || 'Mi Combinación' : ((t.drawers.pairingNames as any)[p.id] || p.id)

    return (
      <div
        key={p.id}
        className={ed.presetBtn}
        style={{
          position: 'relative',
          padding: '10px 12px',
          borderRadius: '10px',
          border: isCustom ? '1px solid #c7d2fe' : '1px solid var(--ed-border)',
          background: isCustom ? '#fcfdff' : undefined,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onClick={() => void addPairing(p)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: isCustom ? '#4f46e5' : '#334155' }}>
            {displayName}
            {isCustom && (
              <span style={{ marginLeft: '6px', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#e0e7ff', color: '#4338ca' }}>
                Personalizada
              </span>
            )}
          </span>

          {isCustom && (
            <button
              type="button"
              onClick={(e) => handleDeleteCustom(e, p.id, p.name)}
              title="Eliminar esta combinación"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              🗑️
            </button>
          )}
        </div>

        {/* Vista previa del Titular / Gancho */}
        <span
          className={styles.pairHead}
          style={{
            fontFamily: fontStack(p.heading.family, p.heading.category),
            fontWeight: p.heading.weight,
            color: p.heading.color,
            fontSize: '18px',
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {(() => {
            const targetHighlight = highlightWord.trim()
            if (!targetHighlight || !hookText.toLowerCase().includes(targetHighlight.toLowerCase())) {
              return hookText
            }
            const start = hookText.toLowerCase().indexOf(targetHighlight.toLowerCase())
            const before = hookText.slice(0, start)
            const match = hookText.slice(start, start + targetHighlight.length)
            const after = hookText.slice(start + targetHighlight.length)
            return (
              <>
                {before}
                <span style={{ color: p.accentColor || '#6366f1', fontWeight: 800 }}>{match}</span>
                {after}
              </>
            )
          })()}
        </span>

        {/* Vista previa del Subtítulo */}
        <span
          className={styles.pairBody}
          style={{
            fontFamily: fontStack(p.body.family, p.body.category),
            fontWeight: p.body.weight,
            fontSize: '11px',
            color: p.body.color || '#64748b',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {introText}
        </span>
      </div>
    )
  }

  return (
    <>
      <p className={ed.sectionTitle}>{t.drawers.addText}</p>
      <button type="button" className={ed.presetBtn} data-testid="text-preset-heading" onClick={() => add('heading')}>
        <span className={ed.presetLabel}>{t.drawers.heading}</span>
        <span className={ed.presetHeading} style={{ fontFamily: TEXT_PRESETS.heading.font }}>
          {rawHook ? rawHook.slice(0, 36) + (rawHook.length > 36 ? '...' : '') : t.drawers.addHeading}
        </span>
      </button>
      <button type="button" className={ed.presetBtn} data-testid="text-preset-subheading" onClick={() => add('subheading')}>
        <span className={ed.presetLabel}>{t.drawers.subheading}</span>
        <span className={ed.presetSub}>
          {rawIntro ? rawIntro.slice(0, 42) + (rawIntro.length > 42 ? '...' : '') : t.drawers.addSubheading}
        </span>
      </button>
      <button type="button" className={ed.presetBtn} data-testid="text-preset-body" onClick={() => add('body')}>
        <span className={ed.presetLabel}>{t.drawers.body}</span>
        <span className={ed.presetBody}>{t.drawers.addBody}</span>
      </button>

      <p className={ed.sectionTitle}>{t.drawers.curvedText}</p>
      <div className={ed.presetRow}>
        <button type="button" className={ed.presetBtn} data-testid="text-arc-up" onClick={() => arc('up')}>
          <span className={ed.presetLabel}>{t.drawers.arcUp}</span>
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" aria-hidden="true">
            {ARC_UP}
          </svg>
        </button>
        <button type="button" className={ed.presetBtn} data-testid="text-arc-down" onClick={() => arc('down')}>
          <span className={ed.presetLabel}>{t.drawers.arcDown}</span>
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" aria-hidden="true">
            {ARC_DOWN}
          </svg>
        </button>
      </div>

      <p className={ed.sectionTitle}>Resaltador visual</p>

      <div className={styles.highlightGrid}>
        {HIGHLIGHT_STYLES.filter((s) => s.kind === 'vector').map((style) => (
          <button
            key={style.id}
            type="button"
            className={styles.highlightCard}
            title={style.description}
            data-testid={`highlight-${style.id}`}
            onClick={async () => {
              await applyTextHighlight(editor, style.id, '#FFE600')
              close()
            }}
          >
            <div
              className={styles.highlightPreview}
              dangerouslySetInnerHTML={{ __html: style.buildSvg('#FFE600') }}
            />
            <span className={styles.highlightLabel}>
              {style.label}
            </span>
          </button>
        ))}
      </div>

      {/* Sección Combinaciones de Fuentes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
        <p className={ed.sectionTitle} style={{ margin: 0 }}>
          {t.drawers.pairings}
        </p>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={handleCaptureFromCanvas}
            title="Capturar estilos de fuentes de los textos seleccionados en el lienzo"
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✨ Capturar Lienzo
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            style={{
              fontSize: '10px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isCreating ? '#f1f5f9' : '#0099ff',
              color: isCreating ? '#475569' : '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isCreating ? 'Cerrar' : '+ Nueva'}
          </button>
        </div>
      </div>

      {/* Creador Interactivo de Combinación de Fuentes */}
      {isCreating && (
        <form
          onSubmit={handleSaveNewPairing}
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: '#ffffff',
            border: '1.5px solid #6366f1',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
            🎨 Diseñar Nueva Combinación
          </div>

          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
              Nombre de la Combinación
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Mi Marca Bold, Tech Minimal..."
              style={{ width: '100%', fontSize: '11px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Fuente Título
              </label>
              <select
                value={newHeadingFamily}
                onChange={(e) => setNewHeadingFamily(e.target.value)}
                style={{ width: '100%', fontSize: '11px', padding: '4px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Peso Título
              </label>
              <select
                value={newHeadingWeight}
                onChange={(e) => setNewHeadingWeight(Number(e.target.value))}
                style={{ width: '100%', fontSize: '11px', padding: '4px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              >
                <option value={400}>Normal (400)</option>
                <option value={600}>Semi-Bold (600)</option>
                <option value={700}>Bold (700)</option>
                <option value={800}>Extra Bold (800)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Fuente Subtítulo
              </label>
              <select
                value={newBodyFamily}
                onChange={(e) => setNewBodyFamily(e.target.value)}
                style={{ width: '100%', fontSize: '11px', padding: '4px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Color Título
              </label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newHeadingColor}
                  onChange={(e) => setNewHeadingColor(e.target.value)}
                  style={{ width: '28px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>{newHeadingColor}</span>
              </div>
            </div>
          </div>

          {/* Color de Acento (Frase Resaltada) */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '3px' }}>
              Color de Frase Resaltada (Impacto)
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {ACCENT_COLOR_PRESETS.map((ac) => (
                <button
                  key={ac.color}
                  type="button"
                  onClick={() => setNewAccentColor(ac.color)}
                  title={ac.label}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: ac.color,
                    border: newAccentColor === ac.color ? '2px solid #000' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    boxShadow: newAccentColor === ac.color ? '0 0 0 1px #fff' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mini Preview de la nueva combinación */}
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vista Previa
            </span>
            <div style={{ fontFamily: newHeadingFamily, fontWeight: newHeadingWeight, color: newHeadingColor, fontSize: '15px', lineHeight: 1.2, marginTop: '2px' }}>
              El secreto para prospectar con <span style={{ color: newAccentColor }}>alto impacto</span>
            </div>
            <div style={{ fontFamily: newBodyFamily, fontWeight: newBodyWeight, color: newBodyColor, fontSize: '10px', marginTop: '2px' }}>
              Framework exacto para cerrar decisores en LinkedIn.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '6px',
                background: '#4f46e5',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Guardar Combinación
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Selector de Resaltado del Gancho */}
      <div style={{ padding: '8px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          <span>✨ Frase Resaltada en Gancho:</span>
          {highlightWord && (
            <button
              type="button"
              onClick={() => setHighlightWord('')}
              style={{ fontSize: '10px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Quitar
            </button>
          )}
        </div>
        <input
          type="text"
          value={highlightWord}
          onChange={(e) => setHighlightWord(e.target.value)}
          placeholder="Ej: cometen el mismo error"
          style={{ width: '100%', fontSize: '11px', padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 500, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
          Esta frase se destacará automáticamente con el color de impacto de cada tipografía.
        </div>
      </div>

      {/* Mis Combinaciones Guardadas */}
      {customPairings.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⭐ Mis Combinaciones Personalizadas ({customPairings.length})</span>
          </div>
          <div className={styles.pairings}>
            {customPairings.map((p) => renderPairingCard(p))}
          </div>
        </div>
      )}

      {/* Combinaciones Predeterminadas del Sistema */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
          Combinaciones Predeterminadas
        </div>
        <div className={styles.pairings}>
          {PAIRINGS.map((p) => renderPairingCard(p))}
        </div>
      </div>

      <p className={ed.sectionTitle} style={{ marginTop: '16px' }}>{t.drawers.lists}</p>
      <div className={ed.presetRow}>
        <button type="button" className={ed.presetBtn} data-testid="text-list-bullet" onClick={() => list('bullet')}>
          <span className={ed.presetLabel}>{t.drawers.bulleted}</span>
          <span className={styles.listGlyph} aria-hidden="true">
            • — • — • —
          </span>
        </button>
        <button type="button" className={ed.presetBtn} data-testid="text-list-number" onClick={() => list('number')}>
          <span className={ed.presetLabel}>{t.drawers.numbered}</span>
          <span className={styles.listGlyph} aria-hidden="true">
            1. 2. 3.
          </span>
        </button>
      </div>
    </>
  )
}
