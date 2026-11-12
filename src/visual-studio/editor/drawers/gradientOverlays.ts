import { IText } from 'fabric'
import type { EditorEngine } from '../engine/editor'
import { createRect } from '../engine/objects/factories'
import { buildFill } from '../engine/objects/fills'
import { asDory } from '../engine/objects/dory'

export type GradientOverlayId =
  | 'fade-right'
  | 'fade-left'
  | 'fade-bottom'
  | 'fade-top'
  | 'vignette-sides'
  | 'fade-diagonal'

export interface GradientOverlayPreset {
  id: GradientOverlayId
  label: string
  sublabel: string
  angle: number
  previewCss: (color: string) => string
}

export const GRADIENT_OVERLAYS: readonly GradientOverlayPreset[] = [
  {
    id: 'fade-right',
    label: 'Lateral Derecho',
    sublabel: 'Texto a la derecha (Foto a la izq.)',
    angle: 0,
    previewCss: (color) => `linear-gradient(to right, transparent, ${color})`,
  },
  {
    id: 'fade-left',
    label: 'Lateral Izquierdo',
    sublabel: 'Texto a la izquierda (Foto a la der.)',
    angle: 180,
    previewCss: (color) => `linear-gradient(to left, transparent, ${color})`,
  },
  {
    id: 'fade-bottom',
    label: 'Inferior / Pie',
    sublabel: 'Texto al pie (Foto centrada/arriba)',
    angle: 90,
    previewCss: (color) => `linear-gradient(to bottom, transparent, ${color})`,
  },
  {
    id: 'fade-top',
    label: 'Superior / Encabezado',
    sublabel: 'Texto arriba (Foto abajo)',
    angle: 270,
    previewCss: (color) => `linear-gradient(to top, transparent, ${color})`,
  },
  {
    id: 'vignette-sides',
    label: 'Viñeta Doble',
    sublabel: 'Bordes oscuros (Foto al centro)',
    angle: 0,
    previewCss: (color) => `linear-gradient(to right, ${color}, transparent 50%, ${color})`,
  },
  {
    id: 'fade-diagonal',
    label: 'Diagonal',
    sublabel: 'Contraste dinámico en esquina',
    angle: 45,
    previewCss: (color) => `linear-gradient(135deg, transparent, ${color})`,
  },
]

export const OVERLAY_COLORS: { color: string; label: string }[] = [
  { color: '#0b132b', label: 'Azul Noche (Recomendado LinkedIn)' },
  { color: '#000000', label: 'Negro Profundo' },
  { color: '#18181b', label: 'Gris Carbón' },
  { color: '#0047ff', label: 'Azul InHubFlow' },
  { color: '#4f46e5', label: 'Violeta Índigo' },
  { color: '#4c0519', label: 'Vino Tinto' },
  { color: '#064e3b', label: 'Verde Esmeralda' },
  { color: '#ffffff', label: 'Blanco / Fondos Claros' },
]

export function hexToRgba(hex: string, alpha = 1): string {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (c.length === 6) {
    const r = parseInt(c.slice(0, 2), 16) || 0
    const g = parseInt(c.slice(2, 4), 16) || 0
    const b = parseInt(c.slice(4, 6), 16) || 0
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return alpha === 0 ? 'rgba(0, 0, 0, 0)' : hex
}

export interface InsertOverlayOptions {
  color: string
  coverage: 'half' | 'full'
  opacity: number
}

/** Inserta un cuadro degradé pre-configurado para fotos de fondo en LinkedIn */
export async function insertGradientOverlay(
  editor: EditorEngine,
  preset: GradientOverlayPreset,
  opts: InsertOverlayOptions,
): Promise<void> {
  const page = editor.pageSizeOf(editor.state.activePageId)
  const color = opts.color || '#0b132b'
  const opacity = Math.min(1, Math.max(0.1, opts.opacity || 1))
  const isFull = opts.coverage === 'full'

  let width = page.width
  let height = page.height
  let left = Math.round(page.width / 2)
  let top = Math.round(page.height / 2)

  if (!isFull) {
    if (preset.id === 'fade-right') {
      width = Math.round(page.width * 0.65)
      height = page.height
      left = Math.round(page.width - width / 2)
      top = Math.round(page.height / 2)
    } else if (preset.id === 'fade-left') {
      width = Math.round(page.width * 0.65)
      height = page.height
      left = Math.round(width / 2)
      top = Math.round(page.height / 2)
    } else if (preset.id === 'fade-bottom') {
      width = page.width
      height = Math.round(page.height * 0.65)
      left = Math.round(page.width / 2)
      top = Math.round(page.height - height / 2)
    } else if (preset.id === 'fade-top') {
      width = page.width
      height = Math.round(page.height * 0.65)
      left = Math.round(page.width / 2)
      top = Math.round(height / 2)
    }
  }

  // Generar stops con curva de transición suave
  let stops: { offset: number; color: string }[]
  if (preset.id === 'vignette-sides') {
    stops = [
      { offset: 0, color: hexToRgba(color, 0.95) },
      { offset: 0.5, color: hexToRgba(color, 0) },
      { offset: 1, color: hexToRgba(color, 0.95) },
    ]
  } else if (preset.id === 'fade-left' || preset.id === 'fade-top') {
    stops = [
      { offset: 0, color: hexToRgba(color, 0.98) },
      { offset: 0.45, color: hexToRgba(color, 0.45) },
      { offset: 1, color: hexToRgba(color, 0) },
    ]
  } else {
    // fade-right, fade-bottom, fade-diagonal
    stops = [
      { offset: 0, color: hexToRgba(color, 0) },
      { offset: 0.45, color: hexToRgba(color, 0.45) },
      { offset: 1, color: hexToRgba(color, 0.98) },
    ]
  }

  const fill = buildFill({
    type: 'gradient',
    kind: 'linear',
    angle: preset.angle,
    stops,
  })

  // Crear el rectángulo
  const rect = createRect({ x: left, y: top }, width, 0, height)
  rect.set({
    fill,
    stroke: null,
    strokeWidth: 0,
    opacity,
  })
  asDory(rect).name = `Degradado (${preset.label})`

  await editor.insert.add([rect], `Añadir ${preset.label}`)

  // Ajuste inteligente de capas: si ya existen textos en el lienzo, ubicar el degradado DETRÁS del texto
  const canvas = editor.activeView()?.canvas
  if (canvas) {
    const all = canvas.getObjects()
    const textObjects = all.filter((o) => o instanceof IText)
    if (textObjects.length > 0) {
      const lowestTextIndex = Math.min(...textObjects.map((t) => all.indexOf(t)))
      const rectIndex = all.indexOf(rect)
      if (rectIndex > lowestTextIndex) {
        canvas.moveObjectTo(rect, lowestTextIndex)
        canvas.requestRenderAll()
      }
    }
  }

  editor.toast(`✨ ${preset.label} añadido (puedes ajustar su opacidad y color arriba)`, 'info')
}
