/**
 * Pure operations on brand kits (the Brand sidebar): every function returns a new kit and never mutates its
 * input. Limits mirror what the sidebar can show, not what the server stores.
 */
import { newId } from '@visual-studio/lib/document'
import type { AssetRef } from '@visual-studio/types/adapter'
import type { Asset, BrandFont, BrandKit } from '@visual-studio/types/api'
import { normalizeColor } from '../engine/colors'

export const MAX_BRAND_COLORS = 6
export const MAX_BRAND_LOGOS = 24
export const BRAND_ROLES: readonly BrandFont['role'][] = ['heading', 'subheading', 'body']

export const BRAND_STORAGE_KEY = 'inhubflow_brand_kits'

export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'brand-kit-default',
  name: 'Mi Marca Personal',
  is_default: true,
  colors: [
    { id: 'brand-c1', name: 'Púrpura InHubFlow', hex: '#702FFC' },
    { id: 'brand-c2', name: 'Azul Eléctrico', hex: '#0047FF' },
    { id: 'brand-c3', name: 'Esmeralda', hex: '#10B981' },
    { id: 'brand-c4', name: 'Pizarra Oscura', hex: '#0F172A' },
    { id: 'brand-c5', name: 'Coral Vibrante', hex: '#F43F5E' },
    { id: 'brand-c6', name: 'Ámbar Dorado', hex: '#F59E0B' },
  ],
  fonts: [
    { role: 'heading', family: 'Outfit' },
    { role: 'subheading', family: 'Plus Jakarta Sans' },
    { role: 'body', family: 'Inter' },
  ],
  logos: [],
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

export function loadLocalBrandKits(): BrandKit[] {
  if (typeof window === 'undefined') return [DEFAULT_BRAND_KIT]
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('[BrandKit] Error al leer kits desde localStorage:', err)
  }
  try {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify([DEFAULT_BRAND_KIT]))
  } catch {}
  return [DEFAULT_BRAND_KIT]
}

export function saveLocalBrandKit(kit: BrandKit): BrandKit {
  const current = loadLocalBrandKits()
  const kitToSave: BrandKit = {
    ...kit,
    id: kit.id || newId(),
    colors: kit.colors.slice(0, MAX_BRAND_COLORS),
    updated_at: new Date().toISOString(),
  }
  const next = upsertKit(current, kitToSave)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(next))
    } catch (err) {
      console.warn('[BrandKit] Error al guardar kit en localStorage:', err)
    }
  }
  return kitToSave
}

export function deleteLocalBrandKit(id: string): void {
  const current = loadLocalBrandKits()
  const next = current.filter((k) => k.id !== id)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(next.length > 0 ? next : [DEFAULT_BRAND_KIT]))
    } catch {}
  }
}

export function createLocalBrandService() {
  return {
    async list(): Promise<BrandKit[]> {
      return loadLocalBrandKits()
    },
    async save(kit: BrandKit): Promise<BrandKit> {
      return saveLocalBrandKit(kit)
    },
    async remove(id: string): Promise<void> {
      deleteLocalBrandKit(id)
    },
  }
}

/** A kit that has not been saved yet (empty id: the adapter creates it). */
export function emptyKit(name: string, isDefault: boolean): BrandKit {
  return { id: '', name: name.trim(), is_default: isDefault, colors: [], fonts: [], logos: [], created_at: '', updated_at: '' }
}

/** The kit the sidebar opens with: the default one, otherwise the first. */
export function pickKit(kits: readonly BrandKit[]): BrandKit | null {
  return kits.find((k) => k.is_default) ?? kits[0] ?? null
}

/** Adds a colour (normalised to `#rrggbb`); a colour the kit already has is not added twice. */
export function withColor(kit: BrandKit, color: string): BrandKit {
  const hex = normalizeColor(color)
  if (kit.colors.length >= MAX_BRAND_COLORS || kit.colors.some((c) => c.hex.toLowerCase() === hex.toLowerCase())) return kit
  return { ...kit, colors: [...kit.colors, { id: newId(), name: hex.toUpperCase(), hex }] }
}

export function withoutColor(kit: BrandKit, id: string): BrandKit {
  return { ...kit, colors: kit.colors.filter((c) => c.id !== id) }
}

export function fontOf(kit: BrandKit, role: BrandFont['role']): string | null {
  return kit.fonts.find((f) => f.role === role)?.family ?? null
}

/** Sets the family of one role, keeping the others. */
export function withFont(kit: BrandKit, role: BrandFont['role'], family: string): BrandKit {
  return { ...kit, fonts: [...kit.fonts.filter((f) => f.role !== role), { role, family }] }
}

/** The editor-side shape of a stored asset. */
export function assetToRef(a: Asset): AssetRef {
  return { id: a.id, url: a.url, thumbUrl: a.thumb_url, width: a.width, height: a.height, name: a.name, kind: a.kind }
}

/** An asset the server has not described yet; only its id is sent when the kit is saved. */
export function refToAsset(ref: AssetRef): Asset {
  return { id: ref.id, kind: ref.kind, name: ref.name, url: ref.url, thumb_url: ref.thumbUrl, width: ref.width, height: ref.height, size: 0, mime: '', tags: [], attribution: null, created_at: '' }
}

export function withLogo(kit: BrandKit, logo: Asset): BrandKit {
  if (kit.logos.length >= MAX_BRAND_LOGOS || kit.logos.some((l) => l.id === logo.id)) return kit
  return { ...kit, logos: [...kit.logos, logo] }
}

export function withoutLogo(kit: BrandKit, id: string): BrandKit {
  return { ...kit, logos: kit.logos.filter((l) => l.id !== id) }
}

/** Replaces the kit with the same id (or appends a new one); a default kit makes the others non-default. */
export function upsertKit(kits: readonly BrandKit[], kit: BrandKit): BrandKit[] {
  const next = kits.some((k) => k.id === kit.id) ? kits.map((k) => (k.id === kit.id ? kit : k)) : [...kits, kit]
  return kit.is_default ? next.map((k) => (k.id === kit.id ? k : { ...k, is_default: false })) : next
}
