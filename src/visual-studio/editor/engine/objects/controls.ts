/**
 * Selection handles per kind of object:
 * - Photos & Images: All 8 handles active (Canva style).
 *     * Corner handles (tl, tr, bl, br): Circular white handles with proportional scaling (never deform).
 *     * Edge handles (mt, mb, ml, mr): Horizontal/vertical white pills that crop when dragged inward,
 *       restore when dragged outward, and proportionally enlarge when dragged past bounds.
 *     * Rotate handle (mtr): Floating circular button below bottom edge (no connecting line).
 * - Shapes: All 8 handles for independent width/height resizing.
 * - Text boxes: Side handles (ml, mr) adjust wrap width; corner handles scale font.
 * - Lines: End handles.
 */
import {
  ActiveSelection,
  Circle,
  controlsUtils,
  Ellipse,
  FabricImage,
  type FabricObject,
  IText,
  Path,
  Polygon,
  Polyline,
  Rect,
  Textbox,
  Triangle,
} from 'fabric'
import { DoryLine, installLineControls } from './DoryLine'
import { asDory } from './dory'

const ROTATE_RADIUS = 13
export const ROTATE_OFFSET = 32
const EDGES = ['ml', 'mr', 'mt', 'mb'] as const

const SHAPE_CLASSES: readonly (abstract new (...args: never[]) => FabricObject)[] = [
  Rect,
  Circle,
  Ellipse,
  Triangle,
  Polygon,
  Polyline,
  Path,
]

function isShape(obj: FabricObject): boolean {
  return SHAPE_CLASSES.some((cls) => obj instanceof cls)
}

function isImage(obj: FabricObject): obj is FabricImage {
  return obj instanceof FabricImage || obj.type === 'image' || (obj as any).isType?.('image')
}

/** Draws Canva-style horizontal or vertical white capsule/pill handle, rotated to match object angle */
function paintPillHandle(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  orientation: 'horizontal' | 'vertical',
  accent: string,
  targetObj?: FabricObject,
): void {
  ctx.save()
  ctx.translate(left, top)
  let angleDeg = 0
  try {
    angleDeg =
      typeof (targetObj as any)?.getTotalAngle === 'function'
        ? (targetObj as any).getTotalAngle()
        : (targetObj?.angle ?? 0)
  } catch {
    angleDeg = targetObj?.angle ?? 0
  }
  if (angleDeg) {
    ctx.rotate((angleDeg * Math.PI) / 180)
  }

  const w = orientation === 'horizontal' ? 16 : 6
  const h = orientation === 'horizontal' ? 6 : 16
  const r = 3
  const x = -w / 2
  const y = -h / 2

  ctx.beginPath()
  if (typeof (ctx as any).roundRect === 'function') {
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

/** Draws Canva-style circular corner handle */
function paintCircleHandle(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  accent: string,
  _targetObj?: FabricObject,
): void {
  ctx.save()
  ctx.translate(left, top)
  const radius = 5.5
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

/** Draws Canva-style floating rotate button with soft drop shadow and dual circular arrows */
function paintRotateGlyph(ctx: CanvasRenderingContext2D, left: number, top: number, _accent: string): void {
  ctx.save()
  // Drop shadow for the white badge
  ctx.shadowColor = 'rgba(15, 23, 42, 0.16)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  // Badge background circle
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(left, top, ROTATE_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Reset shadow for the rotate icon inside
  ctx.shadowColor = 'transparent'
  const glyphColor = '#1e293b' // Elegant high-contrast slate (Canva style)
  ctx.fillStyle = glyphColor
  ctx.strokeStyle = glyphColor
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const r = 5.2
  const L = 2.4
  const W = 1.7

  // Helper to draw clean directional arrowhead at arc endpoint
  const drawArrowhead = (theta: number) => {
    const tipX = left + r * Math.cos(theta)
    const tipY = top + r * Math.sin(theta)
    const dx = -Math.sin(theta)
    const dy = Math.cos(theta)
    const nx = Math.cos(theta)
    const ny = Math.sin(theta)

    const bx = tipX - dx * (L * 0.9)
    const by = tipY - dy * (L * 0.9)

    ctx.beginPath()
    ctx.moveTo(tipX + dx * 0.4, tipY + dy * 0.4)
    ctx.lineTo(bx + nx * W, by + ny * W)
    ctx.lineTo(bx - nx * W, by - ny * W)
    ctx.closePath()
    ctx.fill()
  }

  // 1. Top arc (curves clockwise from top-left ~212° to top-right ~342°)
  ctx.beginPath()
  ctx.arc(left, top, r, Math.PI * 1.18, Math.PI * 1.90)
  ctx.stroke()
  drawArrowhead(Math.PI * 1.90)

  // 2. Bottom arc (curves clockwise from bottom-right ~32° to bottom-left ~162°)
  ctx.beginPath()
  ctx.arc(left, top, r, Math.PI * 0.18, Math.PI * 0.90)
  ctx.stroke()
  drawArrowhead(Math.PI * 0.90)

  ctx.restore()
}

// =========================================================================
// ACTION HANDLERS DE RECORTE SIN DEFORMACIÓN ESTILO CANVA (mt, mb, ml, mr)
// =========================================================================

export const cropTopAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage
    if (!target) return false

    const sy = Math.abs(target.scaleY) || 1
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height }
    const natH = originalSize.height || target.height || 1

    const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, 'bottom', x, y)
    const wantedScreenH = -localPoint.y
    const wantedImageH = wantedScreenH / sy

    const curCropY = target.cropY || 0
    const curH = target.height || 1
    const bottomInImage = curCropY + curH

    if (wantedImageH <= bottomInImage) {
      const clampedCropY = Math.max(0, Math.min(bottomInImage - wantedImageH, bottomInImage - 20))
      const clampedH = bottomInImage - clampedCropY

      if (Math.abs((target.cropY || 0) - clampedCropY) < 0.5 && Math.abs(target.height - clampedH) < 0.5) {
        return false
      }

      target.set({
        cropY: Math.round(clampedCropY),
        height: Math.round(clampedH),
      })
      return true
    } else {
      // Hacia afuera pasado el tope superior: agrandar proporcionalmente para rellenar
      const scaleFactor = Math.max(1, wantedImageH / bottomInImage)
      const newScaleY = sy * scaleFactor
      const newScaleX = (Math.abs(target.scaleX) || 1) * scaleFactor
      target.set({
        cropY: 0,
        height: bottomInImage,
        scaleY: newScaleY,
        scaleX: newScaleX,
      })
      return true
    }
  },
)

export const cropBottomAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage
    if (!target) return false

    const sy = Math.abs(target.scaleY) || 1
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height }
    const natH = originalSize.height || target.height || 1

    const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, 'top', x, y)
    const wantedScreenH = localPoint.y
    const wantedImageH = wantedScreenH / sy

    const curCropY = target.cropY || 0
    const maxAvailableH = natH - curCropY

    if (wantedImageH <= maxAvailableH) {
      const clampedH = Math.max(20, Math.min(wantedImageH, maxAvailableH))
      if (Math.abs(target.height - clampedH) < 0.5) return false
      target.set({ height: Math.round(clampedH) })
      return true
    } else {
      // Hacia afuera pasado el fondo: agrandar proporcionalmente
      const scaleFactor = Math.max(1, wantedImageH / maxAvailableH)
      const newScaleY = sy * scaleFactor
      const newScaleX = (Math.abs(target.scaleX) || 1) * scaleFactor
      target.set({
        height: maxAvailableH,
        scaleY: newScaleY,
        scaleX: newScaleX,
      })
      return true
    }
  },
)

export const cropLeftAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage
    if (!target) return false

    const sx = Math.abs(target.scaleX) || 1
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height }
    const natW = originalSize.width || target.width || 1

    const localPoint = controlsUtils.getLocalPoint(transform, 'right', transform.originY, x, y)
    const wantedScreenW = -localPoint.x
    const wantedImageW = wantedScreenW / sx

    const curCropX = target.cropX || 0
    const curW = target.width || 1
    const rightInImage = curCropX + curW

    if (wantedImageW <= rightInImage) {
      const clampedCropX = Math.max(0, Math.min(rightInImage - wantedImageW, rightInImage - 20))
      const clampedW = rightInImage - clampedCropX
      if (Math.abs((target.cropX || 0) - clampedCropX) < 0.5 && Math.abs(target.width - clampedW) < 0.5) {
        return false
      }
      target.set({
        cropX: Math.round(clampedCropX),
        width: Math.round(clampedW),
      })
      return true
    } else {
      // Hacia afuera pasado el margen izquierdo: agrandar proporcionalmente
      const scaleFactor = Math.max(1, wantedImageW / rightInImage)
      const newScaleX = sx * scaleFactor
      const newScaleY = (Math.abs(target.scaleY) || 1) * scaleFactor
      target.set({
        cropX: 0,
        width: rightInImage,
        scaleX: newScaleX,
        scaleY: newScaleY,
      })
      return true
    }
  },
)

export const cropRightAction = controlsUtils.wrapWithFixedAnchor(
  (eventData: MouseEvent | TouchEvent, transform: any, x: number, y: number): boolean => {
    const target = transform.target as FabricImage
    if (!target) return false

    const sx = Math.abs(target.scaleX) || 1
    const originalSize = target.getOriginalSize ? target.getOriginalSize() : { width: target.width, height: target.height }
    const natW = originalSize.width || target.width || 1

    const localPoint = controlsUtils.getLocalPoint(transform, 'left', transform.originY, x, y)
    const wantedScreenW = localPoint.x
    const wantedImageW = wantedScreenW / sx

    const curCropX = target.cropX || 0
    const maxAvailableW = natW - curCropX

    if (wantedImageW <= maxAvailableW) {
      const clampedW = Math.max(20, Math.min(wantedImageW, maxAvailableW))
      if (Math.abs(target.width - clampedW) < 0.5) return false
      target.set({ width: Math.round(clampedW) })
      return true
    } else {
      // Hacia afuera pasado el margen derecho: agrandar proporcionalmente
      const scaleFactor = Math.max(1, wantedImageW / maxAvailableW)
      const newScaleX = sx * scaleFactor
      const newScaleY = (Math.abs(target.scaleY) || 1) * scaleFactor
      target.set({
        width: maxAvailableW,
        scaleX: newScaleX,
        scaleY: newScaleY,
      })
      return true
    }
  },
)

/** Applies the handle set that belongs to `obj`'s kind. Safe to call repeatedly. */
export function customizeControls(obj: FabricObject): void {
  if (obj instanceof ActiveSelection) return
  if (obj instanceof DoryLine) {
    installLineControls(obj)
    return
  }

  const accent = typeof obj.borderColor === 'string' ? obj.borderColor : '#7a64e0'
  const isImg = isImage(obj)
  const imageGrid = asDory(obj).imageGrid !== undefined

  if (isImg) {
    obj.set({
      lockUniScaling: true,
      lockSkewingX: true,
      lockSkewingY: true,
      lockScalingFlip: true,
    })
  } else if (imageGrid) {
    obj.set({ lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true })
  }

  const controls = obj.controls as Record<
    string,
    | {
        visible: boolean
        x?: number
        y?: number
        offsetY?: number
        offsetX?: number
        sizeX?: number
        sizeY?: number
        touchSizeX?: number
        touchSizeY?: number
        render?: unknown
        actionHandler?: unknown
        actionName?: string
        getActionName?: unknown
        cursorStyle?: string
        cursorStyleHandler?: unknown
        withConnection?: boolean
      }
    | undefined
  >

  // Custom Corner Handles (tl, tr, bl, br)
  const corners = ['tl', 'tr', 'bl', 'br'] as const
  for (const cName of corners) {
    const c = controls[cName]
    if (!c) continue
    c.visible = true
    c.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
      paintCircleHandle(ctx, left, top, accent, fabricObject ?? obj)
    }
    if (isImg) {
      c.actionHandler = controlsUtils.scalingEqually
    }
  }

  // Edge Handles (ml, mr, mt, mb)
  const sidesOnly = obj instanceof IText
  const wrapWidth =
    obj instanceof Textbox &&
    !(typeof (obj as { curveAmount?: number }).curveAmount === 'number' && (obj as { curveAmount?: number }).curveAmount !== 0)

  for (const name of EDGES) {
    const control = controls[name]
    if (!control) continue

    if (isImg) {
      control.visible = true
      control.cursorStyleHandler = controlsUtils.scaleSkewCursorStyleHandler
      if (name === 'mt') {
        control.actionHandler = cropTopAction
        control.actionName = 'cropY'
        control.sizeX = 16
        control.sizeY = 8
        control.touchSizeX = 24
        control.touchSizeY = 20
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'horizontal', accent, fabricObject ?? obj)
        }
      } else if (name === 'mb') {
        control.actionHandler = cropBottomAction
        control.actionName = 'cropY'
        control.sizeX = 16
        control.sizeY = 8
        control.touchSizeX = 24
        control.touchSizeY = 20
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'horizontal', accent, fabricObject ?? obj)
        }
      } else if (name === 'ml') {
        control.actionHandler = cropLeftAction
        control.actionName = 'cropX'
        control.sizeX = 8
        control.sizeY = 16
        control.touchSizeX = 20
        control.touchSizeY = 24
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'vertical', accent, fabricObject ?? obj)
        }
      } else if (name === 'mr') {
        control.actionHandler = cropRightAction
        control.actionName = 'cropX'
        control.sizeX = 8
        control.sizeY = 16
        control.touchSizeX = 20
        control.touchSizeY = 24
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'vertical', accent, fabricObject ?? obj)
        }
      }
    } else if (sidesOnly) {
      control.visible = wrapWidth && (name === 'ml' || name === 'mr')
      if (name === 'ml' || name === 'mr') {
        control.cursorStyleHandler = controlsUtils.scaleSkewCursorStyleHandler
        control.sizeX = 8
        control.sizeY = 16
        control.touchSizeX = 20
        control.touchSizeY = 24
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'vertical', accent, fabricObject ?? obj)
        }
      }
    } else {
      control.visible = isShape(obj) || imageGrid
      control.cursorStyleHandler = controlsUtils.scaleSkewCursorStyleHandler
      if (name === 'ml' || name === 'mr') {
        control.sizeX = 8
        control.sizeY = 16
        control.touchSizeX = 20
        control.touchSizeY = 24
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'vertical', accent, fabricObject ?? obj)
        }
      } else {
        control.sizeX = 16
        control.sizeY = 8
        control.touchSizeX = 24
        control.touchSizeY = 20
        control.render = (ctx: CanvasRenderingContext2D, left: number, top: number, _styleOverride?: unknown, fabricObject?: FabricObject) => {
          paintPillHandle(ctx, left, top, 'horizontal', accent, fabricObject ?? obj)
        }
      }
      if (imageGrid && (name === 'ml' || name === 'mr')) {
        control.actionHandler = controlsUtils.scalingX
        control.actionName = 'scaleX'
        control.getActionName = () => 'scaleX'
      } else if (imageGrid && (name === 'mt' || name === 'mb')) {
        control.actionHandler = controlsUtils.scalingY
        control.actionName = 'scaleY'
        control.getActionName = () => 'scaleY'
      }
    }
  }

  // Rotate handle (floating below bottom center in Canva style)
  const rotate = controls.mtr
  if (rotate) {
    rotate.x = 0
    rotate.y = 0.5
    rotate.offsetY = ROTATE_OFFSET
    rotate.withConnection = false
    rotate.sizeX = ROTATE_RADIUS * 2 + 4
    rotate.sizeY = ROTATE_RADIUS * 2 + 4
    rotate.touchSizeX = ROTATE_RADIUS * 2 + 16
    rotate.touchSizeY = ROTATE_RADIUS * 2 + 16
    rotate.render = (ctx: CanvasRenderingContext2D, left: number, top: number) => {
      paintRotateGlyph(ctx, left, top, accent)
    }
  }
}
