import type { FontCategory } from '@visual-studio/types/api'
import { fontStack } from '../engine/text/fontStack'
import type { TextOptions } from '../engine/objects/factories'

interface Face {
  family: string
  category: FontCategory
  weight: number
  color: string
}

export type PairingId = 'classic' | 'modern' | 'editorial' | 'playful' | 'poster' | 'elegant'

/** A heading face and a body face that look good together. */
export interface Pairing {
  id: PairingId
  heading: Face
  body: Face
  accentColor?: string
}

export const PAIRINGS: readonly Pairing[] = [
  { id: 'classic', heading: { family: 'Playfair Display', category: 'serif', weight: 700, color: '#1c1517' }, body: { family: 'DM Sans', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#d97706' },
  { id: 'modern', heading: { family: 'Montserrat', category: 'sans-serif', weight: 800, color: '#1c1517' }, body: { family: 'Open Sans', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#6366f1' },
  { id: 'editorial', heading: { family: 'Lora', category: 'serif', weight: 700, color: '#5b43c4' }, body: { family: 'Lato', category: 'sans-serif', weight: 400, color: '#1c1517' }, accentColor: '#7c3aed' },
  { id: 'playful', heading: { family: 'Pacifico', category: 'handwriting', weight: 400, color: '#e05a86' }, body: { family: 'Poppins', category: 'sans-serif', weight: 400, color: '#1c1517' }, accentColor: '#ec4899' },
  { id: 'poster', heading: { family: 'Bebas Neue', category: 'sans-serif', weight: 400, color: '#1c1517' }, body: { family: 'Roboto', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#ef4444' },
  { id: 'elegant', heading: { family: 'Cormorant Garamond', category: 'serif', weight: 600, color: '#7f1034' }, body: { family: 'Montserrat', category: 'sans-serif', weight: 400, color: '#6b6165' }, accentColor: '#be123c' },
]

/** Factory options for one half of a pairing (the heading is the large half). */
export function faceOptions(face: Face, role: 'heading' | 'body', text: string): TextOptions {
  return { text, preset: role === 'heading' ? 'heading' : 'body', fontFamily: fontStack(face.family, face.category), fontWeight: face.weight, fill: face.color }
}
