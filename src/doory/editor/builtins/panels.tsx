import { Clapperboard, Images, LayoutTemplate, Layers, Music, PaintBucket, Palette, Shapes, Sparkles, Type } from 'lucide-react'
import { ImageDrawer } from '../drawers/ImageDrawer'
import { ShapesDrawer } from '../drawers/ShapesDrawer'
import { TextDrawer } from '../drawers/TextDrawer'
import { BackgroundPanel } from '../panels/BackgroundPanel'
import { LayersPanel } from '../panels/LayersPanel'
import { registerPanel } from '../panels/registry'
import { t } from '../strings'
import { loadable } from '../ui/loadable'

// Tools loaded on demand
const TemplatesPanel = loadable(() => import('../panels/TemplatesPanel').then((m) => m.TemplatesPanel))
const VideosPanel = loadable(() => import('../panels/VideosPanel').then((m) => m.VideosPanel))
const AudioPanel = loadable(() => import('../panels/AudioPanel').then((m) => m.AudioPanel))
const AnimatePanel = loadable(() => import('../panels/AnimatePanel').then((m) => m.AnimatePanel))
const BrandPanel = loadable(() => import('../panels/BrandPanel').then((m) => m.BrandPanel))

/** Rail icons: lucide at 20 px, so the rail reads as one set. */
const icon = (Glyph: typeof Type) => <Glyph size={20} strokeWidth={1.8} aria-hidden="true" />

/**
 * Rail tools in the exact requested order:
 * 1. Templates
 * 2. Texto
 * 3. Elementos (shapes) — Stickers eliminado
 * 4. Imagen
 * 5. Video
 * 6. Audio
 * 7. Background
 * 8. Animate
 * 9. Brand
 * 10. Layers
 */
export function registerBuiltinPanels(): void {
  const editable = ({ state }: { state: { readOnly: boolean } }): boolean => !state.readOnly

  // 1. Templates
  registerPanel({ 
    id: 'templates', 
    label: t.rail.templates, 
    icon: icon(LayoutTemplate), 
    order: 10, 
    placement: 'sidebar', 
    component: TemplatesPanel, 
    preload: TemplatesPanel.preload, 
    requires: editable 
  })

  // 2. Texto
  registerPanel({ 
    id: 'text', 
    label: t.rail.text, 
    icon: icon(Type), 
    order: 20, 
    placement: 'drawer', 
    component: TextDrawer, 
    requires: editable, 
    shortcut: 'T' 
  })

  // 3. Elementos (shapes)
  registerPanel({ 
    id: 'shapes', 
    label: t.rail.shapes, 
    title: t.rail.shapes, 
    icon: icon(Shapes), 
    order: 30, 
    placement: 'drawer', 
    component: ShapesDrawer, 
    requires: editable 
  })

  // 4. Imagen
  registerPanel({ 
    id: 'image', 
    label: t.rail.image, 
    icon: icon(Images), 
    order: 40, 
    placement: 'drawer', 
    component: ImageDrawer, 
    requires: editable 
  })

  // 5. Video
  registerPanel({ 
    id: 'videos', 
    label: t.rail.videos, 
    icon: icon(Clapperboard), 
    order: 50, 
    placement: 'drawer', 
    component: VideosPanel, 
    preload: VideosPanel.preload, 
    requires: editable 
  })

  // 6. Audio
  registerPanel({ 
    id: 'audio', 
    label: t.rail.audio, 
    title: t.audio.title, 
    icon: icon(Music), 
    order: 60, 
    placement: 'sidebar', 
    component: AudioPanel, 
    preload: AudioPanel.preload, 
    readOnly: true 
  })

  // 7. Background
  registerPanel({ 
    id: 'background', 
    label: t.rail.background, 
    icon: icon(PaintBucket), 
    order: 70, 
    placement: 'drawer', 
    component: BackgroundPanel, 
    requires: editable 
  })

  // 8. Animate
  registerPanel({ 
    id: 'animate', 
    label: t.rail.animate, 
    title: t.animation.panel.title, 
    icon: icon(Sparkles), 
    order: 80, 
    placement: 'sidebar', 
    component: AnimatePanel, 
    preload: AnimatePanel.preload, 
    requires: editable 
  })

  // 9. Brand
  registerPanel({ 
    id: 'brand', 
    label: t.rail.brand, 
    icon: icon(Palette), 
    order: 90, 
    placement: 'sidebar', 
    component: BrandPanel, 
    preload: BrandPanel.preload, 
    requires: ({ state }) => !state.readOnly && state.mode !== 'shared-edit' 
  })

  // 10. Layers
  registerPanel({ 
    id: 'layers', 
    label: t.rail.layers, 
    icon: icon(Layers), 
    order: 100, 
    placement: 'sidebar', 
    component: LayersPanel, 
    readOnly: true 
  })
}

registerBuiltinPanels()
