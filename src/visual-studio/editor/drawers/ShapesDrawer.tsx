import { useState, type ReactNode } from 'react'
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
import styles from './Drawers.module.css'

interface ShapeCard {
  id: string
  label: string
  icon: ReactNode
  run: () => void
}

const chartPreview = (kind: ChartKind): string => `data:image/svg+xml;utf8,${encodeURIComponent(chartSvg(kind))}`

const sv = (children: ReactNode): ReactNode => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    {children}
  </svg>
)

/** Shapes drawer: degradados de contraste, formas básicas, decorativas y herramientas. */
export function ShapesDrawer({ close }: PanelProps) {
  const editor = useEditor()
  const [selectedColor, setSelectedColor] = useState('#0b132b')
  const [coverage, setCoverage] = useState<'half' | 'full'>('half')

  const shape = (kind: ShapeKind) => (): void => void editor.insert.shape(kind)

  const insertChart = (kind: ChartKind): Promise<void> => editor.insert.svgElement(chartSvg(kind), `chart-${kind}`, t.drawers.chartNames[kind])

  const handleInsertOverlay = async (preset: GradientOverlayPreset) => {
    await insertGradientOverlay(editor, preset, { color: selectedColor, coverage, opacity: 1 })
    close()
  }

  const basic: ShapeCard[] = [
    { id: 'rect', label: t.basicShapes.rectangle, icon: sv(<rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />), run: shape('rect') },
    { id: 'ellipse', label: t.basicShapes.circle, icon: sv(<circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />), run: shape('ellipse') },
    { id: 'triangle', label: t.basicShapes.triangle, icon: sv(<path d="M14 4L24 24H4L14 4z" stroke="currentColor" strokeWidth="1.5" />), run: shape('triangle') },
    { id: 'line', label: t.basicShapes.line, icon: sv(<line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="2" />), run: shape('line') },
  ]
  const decorative: ShapeCard[] = [
    { id: 'star', label: t.basicShapes.star, icon: sv(<path d="M14 2l3.5 7.5L25 11l-5.5 5 1.5 8L14 20.5 7 24l1.5-8L3 11l7.5-1.5L14 2z" stroke="currentColor" strokeWidth="1.5" />), run: shape('star') },
    { id: 'diamond', label: t.shapes.diamond, icon: sv(<path d="M14 2L26 14 14 26 2 14z" stroke="currentColor" strokeWidth="1.5" />), run: shape('diamond') },
    { id: 'divider', label: t.drawers.divider, icon: sv(<line x1="2" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />), run: shape('divider') },
    { id: 'frame', label: t.drawers.frame, icon: sv(<rect x="4" y="2" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />), run: shape('frame') },
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
  const moreBasics: ShapeCard[] = [
    { id: 'rounded', label: t.basicShapes.roundedRectangle, icon: sv(<rect x="4" y="6" width="20" height="16" rx="7" stroke="currentColor" strokeWidth="1.5" />), run: shape('rounded') },
    { id: 'polygon', label: t.basicShapes.polygon, icon: sv(<path d="M14 3l9 5v12l-9 5-9-5V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />), run: shape('polygon') },
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
          Crea el contraste perfecto entre tu foto de fondo y el texto del titular.
        </p>

        {/* Selector de Color Base */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ed-text)' }}>Color de Sombra</span>
            <span style={{ fontSize: 10, color: 'var(--ed-text-dim)' }}>
              {OVERLAY_COLORS.find((c) => c.color === selectedColor)?.label.split(' ')[0] ?? selectedColor}
            </span>
          </div>
          <div className={styles.colorPickerRow}>
            {OVERLAY_COLORS.map((c) => (
              <button
                key={c.color}
                type="button"
                className={`${styles.colorDot} ${selectedColor === c.color ? styles.colorDotActive : ''}`}
                style={{ backgroundColor: c.color }}
                title={c.label}
                aria-label={c.label}
                onClick={() => setSelectedColor(c.color)}
              />
            ))}
            <input
              type="color"
              value={selectedColor.startsWith('#') ? selectedColor : '#0b132b'}
              onChange={(e) => setSelectedColor(e.target.value)}
              title="Color personalizado"
              style={{
                width: 24,
                height: 24,
                padding: 0,
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
          </div>
        </div>

        {/* Selector de Cobertura */}
        <div style={{ marginBottom: 12 }}>
          <div className={styles.coverageToggle}>
            <button
              type="button"
              className={`${styles.coverageBtn} ${coverage === 'half' ? styles.coverageBtnActive : ''}`}
              onClick={() => setCoverage('half')}
            >
              Zona Texto (65%)
            </button>
            <button
              type="button"
              className={`${styles.coverageBtn} ${coverage === 'full' ? styles.coverageBtnActive : ''}`}
              onClick={() => setCoverage('full')}
            >
              Lienzo Completo
            </button>
          </div>
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
      {group(t.drawers.moreBasics, moreBasics)}
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
