import { registerPalette } from '../ui/swatches'
import type { BrandKit } from '@visual-studio/types/api'
import { loadLocalBrandKits, pickKit } from './brandOps'

let unregister: (() => void) | null = null

/**
 * Makes the colours of the active brand kit available as a prioritized "Color Brand" row in every colour picker,
 * or removes the row when there is no kit (or it has no colours).
 */
export function setBrandPalette(kit: BrandKit | null): void {
  unregister?.()
  unregister = null
  if (!kit || kit.colors.length === 0) return
  unregister = registerPalette({
    id: 'brand',
    label: 'Color Brand',
    order: -100,
    colors: kit.colors.slice(0, 6).map((c) => c.hex),
  })
}

/**
 * Pre-registers the brand palette on launch from localStorage so that all color tools
 * (Text, Shapes, Backgrounds, Gradients, Highlights) have access to "Color Brand" immediately.
 */
export function initBrandPalette(): void {
  if (typeof window === 'undefined') return
  try {
    const kits = loadLocalBrandKits()
    const active = pickKit(kits)
    if (active) {
      setBrandPalette(active)
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  initBrandPalette()
}
