import { Registry } from '../engine/registry'

export interface Palette {
  id: string
  label: string
  colors: readonly string[]
  /** Lower comes first. */
  order?: number
}

/** Preset swatch palettes shown in the colour picker. Extensions (brand kits…) can add their own. */
export const palettes = new Registry<Palette>((a, b) => (a.order ?? 100) - (b.order ?? 100))

export function registerPalette(palette: Palette): () => void {
  return palettes.register(palette)
}

registerPalette({
  id: 'vivid',
  label: 'Vivid',
  order: 10,
  colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'],
})
registerPalette({
  id: 'mono',
  label: 'Grayscale',
  order: 40,
  colors: ['#000000', '#262626', '#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5', '#f5f5f5', '#ffffff'],
})

export const GRADIENT_PRESETS: readonly { id: string; label: string; stops: { offset: number; color: string }[]; angle: number }[] = [
  { id: 'sunset', label: 'Sunset', angle: 45, stops: [{ offset: 0, color: '#f43f5e' }, { offset: 1, color: '#f59e0b' }] },
  { id: 'ocean', label: 'Ocean', angle: 60, stops: [{ offset: 0, color: '#2563eb' }, { offset: 1, color: '#06b6d4' }] },
  { id: 'berry', label: 'Berry', angle: 35, stops: [{ offset: 0, color: '#be123c' }, { offset: 1, color: '#7c3aed' }] },
  { id: 'mint', label: 'Mint', angle: 90, stops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#bbf7d0' }] },
  { id: 'dusk', label: 'Dusk', angle: 135, stops: [{ offset: 0, color: '#1e1b4b' }, { offset: 1, color: '#9f1239' }] },
  { id: 'cream', label: 'Cream', angle: 90, stops: [{ offset: 0, color: '#fff7ed' }, { offset: 1, color: '#fecdd3' }] },
]
