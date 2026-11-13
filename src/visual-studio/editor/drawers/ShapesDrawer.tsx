import { useRef, useState, type ReactNode } from 'react'
import { useEditor } from '../context'
import { createLine, defaultShapeSize } from '../engine/objects/factories'
import { PATH_SHAPES } from '../engine/objects/shapeGeometry'
import type { ShapeKind } from '../engine/api/insert'
import type { PanelProps } from '../panels/registry'
import { t } from '../strings'
import ed from '../chrome/ed.module.css'
import { CHART_KINDS, type ChartKind, chartSvg } from './charts'
import { pageCentre } from './insertAt'
import {
  GRADIENT_OVERLAYS,
  OVERLAY_COLORS,
  insertGradientOverlay,
  type GradientOverlayPreset,
} from './gradientOverlays'
import { ColorPicker } from '../ui/ColorPicker'
import { Popover } from '../ui/Popover'
import styles from './Drawers.module.css'

interface ShapeCard {
  id: string
  label: string
  icon: ReactNode
  run: () => void
}

const chartPreview = (kind: ChartKind): string => `data:image/svg+xml;utf8,${encodeURIComponent(chartSvg(kind))}`

const sv = (children: ReactNode, viewBox = '0 0 28 28'): ReactNode => (
  <svg width="28" height="28" viewBox={viewBox} fill="none" aria-hidden="true">
    {children}
  </svg>
)

/** Shapes drawer: degradados de contraste, formas básicas, decorativas y herramientas. */
export function ShapesDrawer({ close }: PanelProps) {
  const editor = useEditor()
  const [selectedColor, setSelectedColor] = useState('#000000')
  const colorBtnRef = useRef<HTMLButtonElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const shape = (kind: ShapeKind) => (): void => void editor.insert.shape(kind)

  const insertChart = (kind: ChartKind): Promise<void> => editor.insert.svgElement(chartSvg(kind), `chart-${kind}`, t.drawers.chartNames[kind])

  const handleInsertOverlay = async (preset: GradientOverlayPreset) => {
    // Cobertura por defecto al 65% (Zona Texto)
    await insertGradientOverlay(editor, preset, { color: selectedColor, coverage: 'half', opacity: 1 })
    close()
  }

  const basic: ShapeCard[] = [
    { id: 'rect', label: t.basicShapes.rectangle, icon: sv(<rect x="4" y="6" width="20" height="16" rx="0" stroke="currentColor" strokeWidth="1.5" />), run: shape('rect') },
    { id: 'ellipse', label: t.basicShapes.circle, icon: sv(<circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />), run: shape('ellipse') },
    { id: 'triangle', label: t.basicShapes.triangle, icon: sv(<path d="M14 4L24 24H4L14 4z" stroke="currentColor" strokeWidth="1.5" />), run: shape('triangle') },
    { id: 'line', label: t.basicShapes.line, icon: sv(<line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="2" />), run: shape('line') },
    {
      id: 'speech',
      label: t.shapes.speech,
      icon: sv(
        <path
          d="M16 8 H84 Q92 8 92 16 V56 Q92 64 84 64 H46 L26 86 V64 H16 Q8 64 8 56 V16 Q8 8 16 8 Z"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
        />,
        '0 0 100 100'
      ),
      run: shape('speech'),
    },
    {
      id: 'cloud',
      label: t.shapes.cloud,
      icon: sv(
        <path
          d="M26 80 C10 80 2 68 6 55 C8 45 18 40 25 42 C25 25 41 14 56 21 C64 9 85 14 86 33 C99 35 101 54 91 65 C87 75 79 80 70 80 Z"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
        />,
        '0 0 100 100'
      ),
      run: shape('cloud'),
    },
  ]
  const decorative: ShapeCard[] = [
    { id: 'star', label: t.basicShapes.star, icon: sv(<path d="M14 2l3.5 7.5L25 11l-5.5 5 1.5 8L14 20.5 7 24l1.5-8L3 11l7.5-1.5L14 2z" stroke="currentColor" strokeWidth="1.5" />), run: shape('star') },
    { id: 'diamond', label: t.shapes.diamond, icon: sv(<path d="M14 2L26 14 14 26 2 14z" stroke="currentColor" strokeWidth="1.5" />), run: shape('diamond') },
    { id: 'polygon', label: t.basicShapes.polygon, icon: sv(<path d="M14 3l9 5v12l-9 5-9-5V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />), run: shape('polygon') },
    { id: 'divider', label: t.drawers.divider, icon: sv(<line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />), run: shape('divider') },
    { id: 'frame', label: t.drawers.frame, icon: sv(<rect x="4" y="2" width="20" height="24" rx="0" stroke="currentColor" strokeWidth="1.5" />), run: shape('frame') },
  ]

  const arrowBoth = (): void => {
    const page = editor.pageSizeOf(editor.state.activePageId)
    const line = createLine(pageCentre(editor), { length: defaultShapeSize(page) * 1.4, arrowStart: 'triangle', arrowEnd: 'triangle' })
    void editor.insert.add([line], t.history.addArrow)
  }
  const dotted = (): void => {
    const page = editor.pageSizeOf(editor.state.activePageId)
    const line = createLine(pageCentre(editor), { length: defaultShapeSize(page) * 1.4, width: 6, dash: [0.1, 12] })
    line.set({ strokeLineCap: 'round' })
    void editor.insert.add([line], t.history.addLine)
  }

  const lines: ShapeCard[] = [
    { id: 'arrow', label: t.drawers.arrow, icon: sv(<path d="M4 14h18M16 7l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />), run: shape('arrow') },
    { id: 'arrow-both', label: t.drawers.doubleArrow, icon: sv(<path d="M5 14h18M10 8l-6 6 6 6M18 8l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />), run: arrowBoth },
    { id: 'dotted', label: t.drawers.dottedLine, icon: sv(<path d="M4 14h.01M9 14h.01M14 14h.01M19 14h.01M24 14h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />), run: dotted },
  ]
  const tools: ShapeCard[] = [
    { id: 'qr', label: t.drawers.qrCode, icon: sv(<path d="M4 4h8v8H4zM16 4h8v8h-8zM4 16h8v8H4zM16 16h3v3h-3zM21 21h3v3h-3zM21 16h3M16 21h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />), run: () => void editor.insert.qr() },
    { id: 'placeholder', label: t.drawers.photoPlaceholder, icon: sv(<path d="M5 6h18v16H5zM5 18l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />), run: () => void editor.insert.placeholder() },
  ]

  const card = (c: ShapeCard): ReactNode => (
    <button
      key={c.id}
      type="button"
      className={ed.shapeBtn}
      data-testid={`shape-${c.id}`}
      onClick={() => {
        c.run()
        close()
      }}
    >
      {c.icon}
      {c.label}
    </button>
  )

  const group = (title: string, cards: ShapeCard[]): ReactNode => (
    <>
      <p className={ed.sectionTitle}>{title}</p>
      <div className={ed.shapeGrid}>{cards.map(card)}</div>
    </>
  )

  return (
    <>
      {/* SECCIÓN: DEGRADADOS DE CONTRASTE */}
      <div className={styles.gradientSection}>
        <div className={styles.gradientHeader}>
          <h3 className={styles.gradientTitle}>
            <span>Degradados de Contraste</span>
          </h3>
        </div>
        <p className={styles.gradientDesc}>
          Crea el contraste perfecto entre tu foto de fondo y el titular. Puedes cambiar y personalizar el color del degradado según tu diseño.
        </p>

        {/* Selector de Color Base */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ed-text)' }}>Color de Sombra</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: selectedColor,
                  border: '1px solid var(--ed-border)',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--ed-text-dim)', fontFamily: 'monospace' }}>
                {OVERLAY_COLORS.find((c) => c.color.toLowerCase() === selectedColor.toLowerCase())?.label.split(' ')[0] ?? selectedColor.toUpperCase()}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              ref={colorBtnRef}
              type="button"
              className={`${styles.colorDot} ${pickerOpen ? styles.colorDotActive : ''}`}
              title="Personalizar color de sombra"
              aria-label="Personalizar color de sombra"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              data-testid="gradient-color-trigger"
              onClick={() => setPickerOpen((o) => !o)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                cursor: 'pointer',
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '2px solid #ffffff',
                boxShadow: pickerOpen
                  ? '0 0 0 2px #6366f1, 0 2px 6px rgba(0,0,0,0.3)'
                  : '0 0 0 1px var(--ed-border), 0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </div>

          <Popover
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            anchorRef={colorBtnRef}
            label="Color de Sombra"
            placement="right-start"
            width={330}
            variant="plain"
          >
            <div
              style={{
                width: 330,
                padding: 14,
                boxSizing: 'border-box',
                maxHeight: 'calc(100vh - 80px)',
                overflowY: 'auto',
              }}
              data-testid="gradient-color-picker-popover"
            >
              <ColorPicker
                value={selectedColor}
                onChange={(hex) => setSelectedColor(hex)}
                allowAlpha={false}
                extraSwatches={{
                  label: 'Recomendados LinkedIn',
                  colors: OVERLAY_COLORS.map((c) => c.color),
                }}
              />
            </div>
          </Popover>
        </div>

        {/* Tarjetas de Presets de Degradado */}
        <div className={styles.gradientCardsGrid}>
          {GRADIENT_OVERLAYS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={styles.gradientCard}
              data-testid={`gradient-${preset.id}`}
              onClick={() => void handleInsertOverlay(preset)}
            >
              <div className={styles.checkerPreview}>
                <div
                  className={styles.gradientOverlayLayer}
                  style={{ background: preset.previewCss(selectedColor) }}
                />
              </div>
              <span className={styles.gradientCardName}>{preset.label}</span>
              <span className={styles.gradientCardSub}>{preset.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      {group(t.drawers.basicShapes, basic)}
      {group(t.drawers.decorative, decorative)}
      {group(t.drawers.linesAndArrows, lines)}
      <p className={ed.sectionTitle}>{t.drawers.moreShapes}</p>
      <div className={styles.miniGrid}>
        {PATH_SHAPES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.mini}
            title={p.label}
            aria-label={p.label}
            data-testid={`shape-path-${p.id}`}
            onClick={() => {
              void editor.insert.pathShape(p.id, p.label)
              close()
            }}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d={p.path} fill="currentColor" fillRule={p.evenOdd ? 'evenodd' : 'nonzero'} />
            </svg>
          </button>
        ))}
      </div>
      {group(t.drawers.tools, tools)}
      <p className={ed.sectionTitle}>{t.drawers.charts}</p>
      <div className={ed.shapeGrid}>
        {CHART_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={ed.shapeBtn}
            data-testid={`chart-${kind}`}
            onClick={() => {
              void insertChart(kind)
              close()
            }}
          >
            <img className={styles.chartThumb} src={chartPreview(kind)} alt="" draggable={false} />
            {t.drawers.chartNames[kind]}
          </button>
        ))}
      </div>
    </>
  )
}
