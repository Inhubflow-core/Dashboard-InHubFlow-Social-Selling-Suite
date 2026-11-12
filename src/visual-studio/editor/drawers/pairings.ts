import type { FontCategory } from '@visual-studio/types/api'
import { fontStack } from '../engine/text/fontStack'
import type { TextOptions } from '../engine/objects/factories'

export interface Face {
  family: string
  category: FontCategory
  weight: number
  color: string
}

export type PairingId = string

/** A heading face and a body face that look good together. */
export interface Pairing {
  id: PairingId
  name?: string
  heading: Face
  body: Face
  accentColor?: string
  isCustom?: boolean
  createdAt?: string
}

export const PAIRINGS: readonly Pairing[] = [
  { id: 'classic', heading: { family: 'Playfair Display', category: 'serif', weight: 700, color: '#1c1517' }, body: { family: 'DM Sans', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#d97706' },
  { id: 'modern', heading: { family: 'Montserrat', category: 'sans-serif', weight: 800, color: '#1c1517' }, body: { family: 'Open Sans', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#6366f1' },
  { id: 'editorial', heading: { family: 'Lora', category: 'serif', weight: 700, color: '#5b43c4' }, body: { family: 'Lato', category: 'sans-serif', weight: 400, color: '#1c1517' }, accentColor: '#7c3aed' },
  { id: 'playful', heading: { family: 'Pacifico', category: 'handwriting', weight: 400, color: '#e05a86' }, body: { family: 'Poppins', category: 'sans-serif', weight: 400, color: '#1c1517' }, accentColor: '#ec4899' },
  { id: 'poster', heading: { family: 'Bebas Neue', category: 'sans-serif', weight: 400, color: '#1c1517' }, body: { family: 'Roboto', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#ef4444' },
  { id: 'elegant', heading: { family: 'Cormorant Garamond', category: 'serif', weight: 600, color: '#7f1034' }, body: { family: 'Montserrat', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#be123c' },
]

export const AVAILABLE_FONTS: { family: string; category: FontCategory; label: string }[] = [
  { family: 'Montserrat', category: 'sans-serif', label: 'Montserrat (Moderno / Impacto)' },
  { family: 'Playfair Display', category: 'serif', label: 'Playfair Display (Editorial Clásico)' },
  { family: 'Outfit', category: 'sans-serif', label: 'Outfit (Tecnológico / SaaS)' },
  { family: 'Poppins', category: 'sans-serif', label: 'Poppins (Geométrico Limpio)' },
  { family: 'Inter', category: 'sans-serif', label: 'Inter (UI / Ejecutivo)' },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', label: 'Plus Jakarta Sans (Corporativo)' },
  { family: 'Bebas Neue', category: 'sans-serif', label: 'Bebas Neue (Titular / Póster)' },
  { family: 'Lora', category: 'serif', label: 'Lora (Serif / Autoridad)' },
  { family: 'Cormorant Garamond', category: 'serif', label: 'Cormorant Garamond (Elegante)' },
  { family: 'DM Sans', category: 'sans-serif', label: 'DM Sans (Minimalista)' },
  { family: 'Open Sans', category: 'sans-serif', label: 'Open Sans (Alta Lectura)' },
  { family: 'Roboto', category: 'sans-serif', label: 'Roboto (Neutro)' },
  { family: 'Lato', category: 'sans-serif', label: 'Lato (Equilibrado)' },
  { family: 'Pacifico', category: 'handwriting', label: 'Pacifico (Creativo)' },
]

export const ACCENT_COLOR_PRESETS = [
  { color: '#6366f1', label: 'Violeta Eléctrico' },
  { color: '#d97706', label: 'Dorado / Ámbar' },
  { color: '#0099ff', label: 'Azul InHubFlow' },
  { color: '#ec4899', label: 'Rosa Neón' },
  { color: '#10b981', label: 'Verde Esmeralda' },
  { color: '#ef4444', label: 'Rojo Coral' },
  { color: '#be123c', label: 'Vino Elegante' },
  { color: '#8b5cf6', label: 'Púrpura' },
]

export const CUSTOM_PAIRINGS_STORAGE_KEY = 'inhubflow_custom_font_pairings'

export function getCustomPairings(): Pairing[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_PAIRINGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomPairing(pairing: Omit<Pairing, 'id' | 'isCustom'> & { id?: string }): Pairing[] {
  if (typeof window === 'undefined') return []
  const current = getCustomPairings()
  const id = pairing.id || `custom_${Date.now()}`
  const newPairing: Pairing = {
    ...pairing,
    id,
    isCustom: true,
    createdAt: new Date().toISOString(),
  }
  const filtered = current.filter((p) => p.id !== id)
  const updated = [newPairing, ...filtered]
  try {
    window.localStorage.setItem(CUSTOM_PAIRINGS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('inhubflow:pairings_updated'))
  } catch (e) {
    console.error('Error guardando combinación de fuentes personalizada:', e)
  }
  return updated
}

export function deleteCustomPairing(id: string): Pairing[] {
  if (typeof window === 'undefined') return []
  const current = getCustomPairings()
  const updated = current.filter((p) => p.id !== id)
  try {
    window.localStorage.setItem(CUSTOM_PAIRINGS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('inhubflow:pairings_updated'))
  } catch (e) {
    console.error('Error eliminando combinación de fuentes:', e)
  }
  return updated
}

/** Factory options for one half of a pairing (the heading is the large half). */
export function faceOptions(face: Face, role: 'heading' | 'body', text: string): TextOptions {
  return { text, preset: role === 'heading' ? 'heading' : 'body', fontFamily: fontStack(face.family, face.category), fontWeight: face.weight, fill: face.color, lineHeight: 1 }
}
