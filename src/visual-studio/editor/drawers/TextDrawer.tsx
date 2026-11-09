import { useEffect, useState } from 'react'
import { IText } from 'fabric'
import { useEditor } from '../context'
import { TEXT_PRESETS, createTextbox } from '../engine/objects/factories'
import { fontStack, primaryFamily } from '../engine/text/fontStack'
import type { PanelProps } from '../panels/registry'
import { t } from '../strings'
import ed from '../chrome/ed.module.css'
import { pageCentre } from './insertAt'
import { PAIRINGS, type Pairing, faceOptions } from './pairings'
import styles from './Drawers.module.css'

const ARC_UP = <path d="M2 18 Q20 0 38 18" stroke="currentColor" strokeWidth="2" fill="none" />
const ARC_DOWN = <path d="M2 2 Q20 20 38 2" stroke="currentColor" strokeWidth="2" fill="none" />

/** Text drawer: starter styles, arcs, and font pairings with dynamic hook, intro & highlight. */
export function TextDrawer({ close }: PanelProps) {
  const editor = useEditor()

  // The cards preview the fonts they insert.
  useEffect(() => {
    for (const spec of Object.values(TEXT_PRESETS)) void editor.fonts.load(primaryFamily(spec.font), spec.weight)
    for (const p of PAIRINGS) {
      void editor.fonts.load(p.heading.family, p.heading.weight)
      void editor.fonts.load(p.body.family, p.body.weight)
    }
  }, [editor])

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

  const list = (style: 'bullet' | 'number'): void => {
    void editor.insert.list(style)
    close()
  }
  const arc = (direction: 'up' | 'down'): void => {
    void editor.insert.curvedText(direction)
    close()
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

      <p className={ed.sectionTitle}>{t.drawers.pairings}</p>
      
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
          style={{ width: '100%', fontSize: '11px', padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#4f46e5', fontWeight: 600, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
          Esta frase se destacará automáticamente con el color de impacto de cada tipografía.
        </div>
      </div>

      <div className={styles.pairings}>
        {PAIRINGS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={ed.presetBtn}
            aria-label={t.drawers.addPairing(t.drawers.pairingNames[p.id])}
            data-testid={`text-pairing-${p.id}`}
            onClick={() => void addPairing(p)}
          >
            <span className={ed.presetLabel}>{t.drawers.pairingNames[p.id]}</span>
            <span
              className={styles.pairHead}
              style={{
                fontFamily: fontStack(p.heading.family, p.heading.category),
                fontWeight: p.heading.weight,
                color: p.heading.color,
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
                    <span style={{ color: p.accentColor || '#6366f1', fontWeight: 800 }}>
                      {match}
                    </span>
                    {after}
                  </>
                )
              })()}
            </span>
            <span
              className={styles.pairBody}
              style={{
                fontFamily: fontStack(p.body.family, p.body.category),
                fontWeight: p.body.weight,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {introText}
            </span>
          </button>
        ))}
      </div>

      <p className={ed.sectionTitle}>{t.drawers.lists}</p>
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
