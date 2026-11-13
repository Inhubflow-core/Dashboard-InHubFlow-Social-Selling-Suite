import { useState, useMemo } from 'react'
import { Sparkles, Palette } from 'lucide-react'
import { useEditor, useSelection } from '../../context'
import {
  HIGHLIGHT_STYLES,
  HIGHLIGHT_PALETTE,
  type HighlightStyleId,
  applyTextHighlight,
  getTargetTextBoundingBox,
} from '../../engine/objects/highlights'
import type { IText } from 'fabric'
import ed from '../../chrome/ed.module.css'

interface HighlightPopoverProps {
  close: () => void
}

export function HighlightPopover({ close }: HighlightPopoverProps) {
  const editor = useEditor()
  const sel = useSelection()
  const textObj = sel.objects[0] as IText | undefined

  const [selectedStyleId, setSelectedStyleId] = useState<HighlightStyleId>('circle-hand')
  const [selectedColor, setSelectedColor] = useState<string>('#FFE600')

  const targetInfo = useMemo(() => {
    return getTargetTextBoundingBox(textObj)
  }, [textObj])

  const selectedStyle = useMemo(
    () => HIGHLIGHT_STYLES.find((s) => s.id === selectedStyleId) ?? HIGHLIGHT_STYLES[0],
    [selectedStyleId]
  )

  const handleApply = async (styleId: HighlightStyleId = selectedStyleId, color: string = selectedColor) => {
    await applyTextHighlight(editor, styleId, color)
    close()
  }

  return (
    <div style={{ width: 320, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--ed-text)' }}>
            <Sparkles size={16} color="#702FFC" />
            <span>Resaltador Visual (Doodles & Neón)</span>
          </div>
          <span style={{ fontSize: 10, background: '#702FFC1A', color: '#702FFC', padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
            Vector SVG
          </span>
        </div>

        {targetInfo?.selectedText ? (
          <div
            style={{
              fontSize: 11,
              background: 'var(--ed-surface-2, #f1f5f9)',
              padding: '4px 8px',
              borderRadius: 6,
              color: 'var(--ed-text-muted, #64748b)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Texto objetivo:</span>
            <strong style={{ color: 'var(--ed-text, #0f172a)' }}>«{targetInfo.selectedText}»</strong>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ed-text-muted, #64748b)', lineHeight: 1.3 }}>
            Selecciona un modelo para resaltar tu palabra clave con vectores dibujados a mano o marcador fluorescente.
          </p>
        )}
      </div>

      {/* Grid de Modelos de Resaltado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ed-text-muted, #64748b)' }}>
          Modelo de resaltado:
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 6,
            maxHeight: 210,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {HIGHLIGHT_STYLES.map((style) => {
            const isSelected = selectedStyleId === style.id
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyleId(style.id)}
                onDoubleClick={() => handleApply(style.id, selectedColor)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                  width: '100%',
                  padding: '8px 6px',
                  borderRadius: 8,
                  border: isSelected ? '2px solid #702FFC' : '1px solid var(--ed-border, #e2e8f0)',
                  background: isSelected ? '#702FFC0D' : 'var(--ed-surface-1, #ffffff)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                  outline: 'none',
                }}
                title={style.description}
              >
                {/* SVG Preview */}
                <div
                  style={{
                    width: '100%',
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                    overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      style.kind === 'text'
                        ? `<div style="font-weight: 800; font-size: 15px; color: ${selectedColor};">Abc</div>`
                        : style
                            .buildSvg(selectedColor)
                            .replace(
                              /<svg\b/,
                              '<svg style="width:100%;max-width:76px;height:24px;max-height:100%;display:block;margin:0 auto;"'
                            ),
                  }}
                />
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#702FFC' : 'var(--ed-text, #1e293b)',
                    lineHeight: 1.2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}
                >
                  {style.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Paleta de Colores Neón / Vibrantes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ed-text-muted, #64748b)' }}>
            Color del resaltador:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Palette size={12} color="var(--ed-text-muted)" />
            <input
              type="color"
              value={selectedColor.startsWith('#') && selectedColor.length === 7 ? selectedColor : '#FFE600'}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                width: 20,
                height: 20,
                padding: 0,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
              }}
              title="Personalizar color exacto"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {HIGHLIGHT_PALETTE.map((c) => {
            const isColorActive = selectedColor.toLowerCase() === c.hex.toLowerCase()
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c.hex,
                  border: isColorActive ? '2px solid #702FFC' : '1px solid rgba(0,0,0,0.15)',
                  boxShadow: isColorActive ? '0 0 0 2px rgba(112,47,252,0.35)' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transform: isColorActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
                title={`${c.name} (${c.hex})`}
              />
            )
          })}
        </div>
      </div>

      {/* Botón de Aplicar */}
      <button
        type="button"
        className={`${ed.btn} ${ed.primary}`}
        onClick={() => handleApply()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: '#702FFC',
          color: '#ffffff',
          fontWeight: 700,
          padding: '8px 12px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        <Sparkles size={15} />
        <span>Aplicar {selectedStyle.label}</span>
      </button>
    </div>
  )
}
