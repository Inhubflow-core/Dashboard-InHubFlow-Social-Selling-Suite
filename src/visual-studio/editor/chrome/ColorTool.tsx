import { useRef, useState } from 'react'
import { type FillSpec, fillCssPreview } from '../engine/objects/fills'
import { t } from '../strings'
import { ColorPicker } from '../ui/ColorPicker'
import { FillEditor } from '../ui/FillEditor'
import { Popover } from '../ui/Popover'
import { Tooltip } from '../ui/Tooltip'
import ed from './ed.module.css'

interface ColorToolProps {
  label: string
  value: FillSpec
  onChange: (fill: FillSpec, key?: string) => void
  /** Offers a "No fill" tile (fills of shapes, borders). */
  allowNone?: boolean
  /** Offers gradients (fills of shapes and text); borders are solid only. */
  allowGradient?: boolean
  /** Draw the swatch as a ring in the colour (a border swatch). */
  ring?: boolean
  testId: string
  extraSwatches?: { label: string; colors: readonly string[] }
}

const isNone = (c: string): boolean => c === 'transparent' || c === ''

/**
 * The round colour swatch of the toolbar and its popover:
 * Unified ColorPicker / FillEditor model matching the highlight/recolor tools.
 */
export function ColorTool({ label, value, onChange, allowNone, allowGradient, ring, testId, extraSwatches }: ColorToolProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [keyboard, setKeyboard] = useState(false)
  const none = value.type === 'solid' && isNone(value.color)
  const css = value.type === 'solid' ? (none ? undefined : value.color) : fillCssPreview(value)
  const solidOnly = !allowGradient

  return (
    <>
      <Tooltip label={label} disabled={open}>
        <button
          ref={ref}
          type="button"
          className={`${ed.swatch} ${none ? ed.swatchNone : ''}`}
          style={ring ? { background: 'transparent', border: `3px solid ${css ?? 'var(--ed-border)'}` } : css ? { background: css } : undefined}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-testid={testId}
          onClick={(e) => {
            setKeyboard(e.detail === 0)
            setOpen((o) => !o)
          }}
        />
      </Tooltip>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} label={label} placement="bottom-start" width={330} variant="plain" cover focusOnOpen={keyboard}>
        <div style={{ width: 330, padding: 14, boxSizing: 'border-box', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }} data-testid={`${testId}-popover`}>
          {allowNone ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--ed-border)' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ed-text)' }}>{t.swatches.noFill}</span>
              <button
                type="button"
                className={`${ed.cpSwatch} ${ed.cpNoFill} ${none ? ed.cpOn : ''}`}
                style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', position: 'relative' }}
                title={t.swatches.noFill}
                aria-label={t.swatches.noFill}
                data-testid={`${testId}-none`}
                onClick={() => onChange({ type: 'solid', color: 'transparent' })}
              />
            </div>
          ) : null}
          {solidOnly && value.type === 'solid' ? (
            <ColorPicker
              value={none ? '#ffffff' : value.color}
              onChange={(color) => onChange({ type: 'solid', color })}
              extraSwatches={extraSwatches}
            />
          ) : (
            <FillEditor
              value={none ? { type: 'solid', color: '#ffffff' } : value}
              onChange={(f) => onChange(f)}
              solidOnly={solidOnly}
              extraSwatches={extraSwatches}
            />
          )}
        </div>
      </Popover>
    </>
  )
}
