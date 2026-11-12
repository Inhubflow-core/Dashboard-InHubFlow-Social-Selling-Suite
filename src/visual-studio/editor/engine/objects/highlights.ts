/**
 * Visual Text Highlights: Hand-drawn SVG doodle vectors (circles, fluorescent markers,
 * sketch underlines, squigglies, boxes, pills) that make keywords and hooks pop in social posts.
 */
import { Point, util, type IText, type FabricObject } from 'fabric'
import type { EditorEngine } from '../editor'
import { parseSvgElement } from './elements'
import { asDory } from './dory'
import { newId } from '@visual-studio/lib/document'

export type HighlightStyleId =
  | 'circle-hand'
  | 'marker-fluo'
  | 'underline-hand'
  | 'underline-double'
  | 'squiggly'
  | 'box-hand'
  | 'pill-badge'
  | 'text-color'

export interface HighlightStyleDef {
  id: HighlightStyleId
  label: string
  description: string
  kind: 'vector' | 'text'
  behindText: boolean
  defaultColor: string
  buildSvg(color: string): string
  computePlacement(box: { x: number; y: number; width: number; height: number }): {
    x: number
    y: number
    width: number
    height: number
  }
}

export const HIGHLIGHT_PALETTE = [
  { name: 'Amarillo Neón', hex: '#FFE600' },
  { name: 'Verde Neón', hex: '#00E676' },
  { name: 'Púrpura InHubFlow', hex: '#702FFC' },
  { name: 'Celeste Eléctrico', hex: '#00D2FF' },
  { name: 'Naranja Vibrante', hex: '#FF6B00' },
  { name: 'Rosa Neón', hex: '#FF1493' },
  { name: 'Rojo Coral', hex: '#FF3B30' },
  { name: 'Blanco Puro', hex: '#FFFFFF' },
  { name: 'Negro Tinta', hex: '#1E293B' },
]

export const HIGHLIGHT_STYLES: HighlightStyleDef[] = [
  {
    id: 'circle-hand',
    label: 'Círculo a mano',
    description: 'Óvalo imperfecto dibujado a mano alzada alrededor de la palabra',
    kind: 'vector',
    behindText: false,
    defaultColor: '#FFE600',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80" width="220" height="80">
        <path d="M 35,42 C 28,24 60,12 110,12 C 165,12 195,26 195,44 C 195,62 160,70 108,70 C 48,70 18,58 20,40 C 22,25 68,14 116,14 C 160,14 185,22 192,34"
          fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y,
      width: Math.max(64, box.width * 1.35 + 24),
      height: Math.max(46, box.height * 1.45 + 16),
    }),
  },
  {
    id: 'marker-fluo',
    label: 'Marcador fluorescente',
    description: 'Trazo ancho semitransparente estilo resaltador fluorescente Stabilo',
    kind: 'vector',
    behindText: true,
    defaultColor: '#FFE600',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50">
        <path d="M 6,36 C 45,34 110,38 194,33 C 197,22 196,15 193,12 C 120,16 65,11 6,17 C 4,24 4,30 6,36 Z"
          fill="${color}" opacity="0.55" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y + box.height * 0.05,
      width: box.width * 1.1 + 16,
      height: Math.max(26, box.height * 0.78),
    }),
  },
  {
    id: 'underline-hand',
    label: 'Subrayado a mano',
    description: 'Trazo orgánico e imperfecto bajo la palabra',
    kind: 'vector',
    behindText: false,
    defaultColor: '#702FFC',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 30" width="200" height="30">
        <path d="M 6,18 C 50,14 120,24 194,16"
          fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y + box.height * 0.5 + 8,
      width: box.width * 1.1 + 14,
      height: Math.max(16, box.height * 0.35),
    }),
  },
  {
    id: 'underline-double',
    label: 'Doble subrayado',
    description: 'Dos trazos dinámicos paralelos dibujados a mano',
    kind: 'vector',
    behindText: false,
    defaultColor: '#FF6B00',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">
        <path d="M 6,14 C 60,10 130,20 194,14" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 14,28 C 70,24 140,32 188,26" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y + box.height * 0.5 + 12,
      width: box.width * 1.12 + 16,
      height: Math.max(22, box.height * 0.45),
    }),
  },
  {
    id: 'squiggly',
    label: 'Onda zigzag',
    description: 'Línea ondulada expresiva para enfatizar ideas clave',
    kind: 'vector',
    behindText: false,
    defaultColor: '#00D2FF',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 30" width="200" height="30">
        <path d="M 6,16 C 18,8 28,8 40,16 C 52,24 62,24 74,16 C 86,8 96,8 108,16 C 120,24 130,24 142,16 C 154,8 164,8 176,16 C 184,21 190,20 195,17"
          fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y + box.height * 0.5 + 10,
      width: box.width * 1.1 + 14,
      height: Math.max(18, box.height * 0.35),
    }),
  },
  {
    id: 'box-hand',
    label: 'Recuadro a mano',
    description: 'Caja con esquinas sueltas y trazo imperfecto',
    kind: 'vector',
    behindText: false,
    defaultColor: '#00E676',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80" width="220" height="80">
        <path d="M 18,22 C 60,18 150,16 202,20 C 206,21 207,35 205,58 C 204,64 160,66 105,68 C 50,70 16,67 15,62 C 14,50 15,30 17,16 C 18,14 45,15 90,17"
          fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y,
      width: Math.max(64, box.width * 1.25 + 20),
      height: Math.max(42, box.height * 1.35 + 14),
    }),
  },
  {
    id: 'pill-badge',
    label: 'Píldora / Fondo',
    description: 'Cápsula suave de realce detrás de la palabra o cifra',
    kind: 'vector',
    behindText: true,
    defaultColor: '#FFE600',
    buildSvg: (color) => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
        <rect x="6" y="8" width="188" height="44" rx="22" ry="22"
          fill="${color}" opacity="0.32" stroke="${color}" stroke-width="2" stroke-opacity="0.75" />
      </svg>
    `,
    computePlacement: (box) => ({
      x: box.x,
      y: box.y,
      width: box.width + 24,
      height: box.height + 14,
    }),
  },
  {
    id: 'text-color',
    label: 'Color de texto',
    description: 'Cambia directamente el color tipográfico de la palabra seleccionada',
    kind: 'text',
    behindText: false,
    defaultColor: '#702FFC',
    buildSvg: () => '',
    computePlacement: (box) => box,
  },
]

/**
 * Calculates the bounding box of the active text selection or full text box in canvas coordinates.
 */
export function getTargetTextBoundingBox(textObj: IText | null | undefined): {
  x: number
  y: number
  width: number
  height: number
  selectedText?: string
} | null {
  if (!textObj) return null

  // Ensure line metrics are ready
  const anyText = textObj as any
  if (Array.isArray(anyText._textLines)) {
    for (let l = 0; l < anyText._textLines.length; l++) {
      if (!anyText.__charBounds?.[l]) anyText._measureLine(l)
    }
  }

  // 1. If actively editing a character range
  if (textObj.isEditing && textObj.selectionStart !== textObj.selectionEnd) {
    const start = Math.min(textObj.selectionStart, textObj.selectionEnd)
    const end = Math.max(textObj.selectionStart, textObj.selectionEnd)
    const charBounds = anyText.__charBounds

    if (charBounds && charBounds.length > 0) {
      let minLeft = Infinity
      let minTop = Infinity
      let maxRight = -Infinity
      let maxBottom = -Infinity

      for (let i = start; i < end; i++) {
        const loc = textObj.get2DCursorLocation(i)
        const b = charBounds[loc.lineIndex]?.[loc.charIndex]
        if (b) {
          minLeft = Math.min(minLeft, b.left)
          minTop = Math.min(minTop, b.top)
          maxRight = Math.max(maxRight, b.left + b.width)
          maxBottom = Math.max(maxBottom, b.top + b.height)
        }
      }

      if (minLeft !== Infinity) {
        const localW = maxRight - minLeft
        const localH = maxBottom - minTop
        const localCenterX = (minLeft + maxRight) / 2
        const localCenterY = (minTop + maxBottom) / 2

        // Offset relative to center-origin in Fabric
        const ptX = -textObj.width / 2 + localCenterX
        const ptY = -textObj.height / 2 + localCenterY

        const matrix = textObj.calcTransformMatrix()
        const canvasPoint = util.transformPoint(new Point(ptX, ptY), matrix)

        const scaleX = textObj.scaleX || 1
        const scaleY = textObj.scaleY || 1
        const selectedText = textObj.text.slice(start, end)

        return {
          x: canvasPoint.x,
          y: canvasPoint.y,
          width: localW * scaleX,
          height: localH * scaleY,
          selectedText,
        }
      }
    }
  }

  // 2. Fallback: Full text object center and dimensions
  const center = textObj.getCenterPoint()
  return {
    x: center.x,
    y: center.y,
    width: textObj.getScaledWidth(),
    height: textObj.getScaledHeight(),
    selectedText: textObj.text,
  }
}

/**
 * Applies a visual highlight (vector or color) to the active text selection or active page.
 */
export async function applyTextHighlight(
  editor: EditorEngine,
  styleId: HighlightStyleId,
  color: string,
): Promise<FabricObject | null> {
  const style = HIGHLIGHT_STYLES.find((s) => s.id === styleId)
  if (!style) return null

  const view = editor.activeView()
  if (!view) return null

  // Find active IText / Textbox object
  const selected = view.selectedObjects()
  const textObj = selected.find((o): o is IText => o instanceof (IText as any) || (o as any).type === 'textbox' || (o as any).type === 'text')

  // Case 1: Simple text color highlight
  if (style.kind === 'text') {
    editor.style.text({ fill: { type: 'solid', color } }, 'Resaltar texto con color')
    editor.toast('Color de resaltado aplicado al texto', 'success')
    return null
  }

  // Case 2: Vector Doodle Highlight
  const targetBox = getTargetTextBoundingBox(textObj) ?? {
    x: editor.pageSizeOf(editor.state.activePageId).width / 2,
    y: editor.pageSizeOf(editor.state.activePageId).height / 2,
    width: 220,
    height: 60,
  }

  const placement = style.computePlacement(targetBox)

  // Exit text editing if user was selecting characters
  if (textObj?.isEditing) {
    textObj.exitEditing()
  }

  // Generate SVG and parse into Fabric vector element
  const svgText = style.buildSvg(color)
  const { object, width, height } = await parseSvgElement(svgText)

  const scaleX = placement.width / Math.max(width, 1)
  const scaleY = placement.height / Math.max(height, 1)

  object.set({
    left: placement.x,
    top: placement.y,
    originX: 'center',
    originY: 'center',
    scaleX,
    scaleY,
  })

  // Assign metadata and properties
  const elementId = `highlight-${style.id}-${newId()}`
  const d = asDory(object)
  d.id = newId()
  d.elementId = elementId
  d.name = `Resaltador (${style.label})`

  view.configure(object)

  // Determine Z-Index
  if (style.behindText && textObj) {
    const textIndex = view.canvas.getObjects().indexOf(textObj)
    view.canvas.insertAt(Math.max(0, textIndex), object)
  } else {
    view.canvas.add(object)
  }

  object.setCoords()
  view.selectObjects([object])
  view.canvas.requestRenderAll()

  editor.commit(editor.state.activePageId, { label: `Resaltador: ${style.label}` })
  editor.toast(`Resaltador «${style.label}» aplicado`, 'success')

  return object
}
