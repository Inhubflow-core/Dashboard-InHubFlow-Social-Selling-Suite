/**
 * Letter spacing, complex scripts, and robust multi-style text run layout.
 * Fabric's default _renderChars accumulates position iteratively in local coordinates, which
 * drifts and causes character overlap when lines contain multiple styled spans (such as highlighted words).
 * This patch anchors each run strictly to its exact pre-measured `__charBounds[lineIndex][runStart].left`
 * and forces `ctx.textAlign = isLtr ? 'left' : 'right'` so text alignment never collapses spans.
 *
 * Imported for its side effect by serialization.ts, which every page canvas, export and preview goes through.
 */
import { FabricText, util } from 'fabric'
import { hasComplexScript } from '../text/direction'

type RenderChars = (method: 'fillText' | 'strokeText', ctx: CanvasRenderingContext2D, line: string[], left: number, top: number, lineIndex: number) => void

interface TextInternals {
  path?: unknown
  charSpacing: number
  textAlign: string
  direction: CanvasDirection
  __charBounds: { width: number; kernedWidth: number; left?: number }[][]
  getHeightOfLineImpl(lineIndex: number): number
  _fontSizeFraction: number
  getCompleteStyleDeclaration(lineIndex: number, charIndex: number): Record<string, unknown> & { fontSize: number }
  _renderChar(method: string, ctx: CanvasRenderingContext2D, lineIndex: number, charIndex: number, chars: string, left: number, top: number): void
}

const PATCHED = Symbol.for('doory.complexText')
/** Browsers without `ctx.letterSpacing` (and test environments) keep Fabric's letter-by-letter drawing. */
const LETTER_SPACING = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype
const proto = FabricText.prototype as unknown as { _renderChars: RenderChars; [PATCHED]?: boolean }

export function usesRunSpacing(text: Pick<TextInternals, 'path' | 'charSpacing' | 'textAlign'>, line: readonly string[]): boolean {
  return !text.path && text.charSpacing !== 0 && !text.textAlign.includes('justify') && LETTER_SPACING && hasComplexScript(line.join(''))
}

if (!proto[PATCHED]) {
  proto[PATCHED] = true
  const original = proto._renderChars
  proto._renderChars = function (this: TextInternals, method, ctx, line, left, top, lineIndex) {
    if (this.path) {
      original.call(this, method, ctx, line, left, top, lineIndex)
      return
    }

    const isLtr = this.direction !== 'rtl'
    const sign = isLtr ? 1 : -1
    ctx.save()
    if (ctx.canvas && typeof ctx.canvas.setAttribute === 'function') {
      ctx.canvas.setAttribute('dir', isLtr ? 'ltr' : 'rtl')
    }
    ctx.direction = isLtr ? 'ltr' : 'rtl'
    ctx.textAlign = isLtr ? 'left' : 'right'

    top -= this.getHeightOfLineImpl(lineIndex) * this._fontSizeFraction
    const lineStart = left

    let run = ''
    let runStart = 0
    let style = this.getCompleteStyleDeclaration(lineIndex, 0)

    for (let i = 0; i < line.length; i++) {
      run += line[i]
      const isLast = i === line.length - 1
      const next = isLast ? null : this.getCompleteStyleDeclaration(lineIndex, i + 1)
      if (next && !util.hasStyleChanged(style as never, next as never, false)) continue

      const box = this.__charBounds?.[lineIndex]?.[runStart]
      const runLeft = lineStart + sign * (box && typeof box.left === 'number' ? box.left : 0)

      if (this.charSpacing !== 0 && LETTER_SPACING) {
        const target = ctx as CanvasRenderingContext2D & { letterSpacing: string }
        const before = target.letterSpacing
        target.letterSpacing = `${(this.charSpacing / 1000) * style.fontSize}px`
        this._renderChar(method, ctx, lineIndex, runStart, run, runLeft, top)
        target.letterSpacing = before
      } else {
        this._renderChar(method, ctx, lineIndex, runStart, run, runLeft, top)
      }

      run = ''
      runStart = i + 1
      if (next) style = next
    }
    ctx.restore()
  }
}
