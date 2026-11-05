import { Images, LayoutTemplate, Layers, PaintBucket, Palette, Shapes, Sticker, Type } from 'lucide-react'
import { ImageDrawer } from '../drawers/ImageDrawer'
import { ShapesDrawer } from '../drawers/ShapesDrawer'
import { TextDrawer } from '../drawers/TextDrawer'
import { BackgroundPanel } from '../panels/BackgroundPanel'
import { LayersPanel } from '../panels/LayersPanel'
import { registerPanel } from '../panels/registry'
import { StickerPanel } from '../panels/StickerPanel'
import { t } from '../strings'
import { loadable } from '../ui/loadable'

// Tools that most sessions never open live in chunks of their own: the rail entry starts
// the download when it is hovered or focused, so the panel is usually there by the time it is clicked.
const TemplatesPanel = loadable(() => import('../panels/TemplatesPanel').then((m) => m.TemplatesPanel))
const BrandPanel = loadable(() => import('../panels/BrandPanel').then((m) => m.BrandPanel))

/** Rail icons: lucide at 20 px, so the rail reads as one set. */
const icon = (Glyph: typeof Type) => <Glyph size={20} strokeWidth={1.8} aria-hidden="true" />

/**
 * The graphic design tools for InHubFlow social posts and carousels:
 * Templates, Text, Shapes, Elements (stickers & vectors), Images, Background, Brand, and Layers.
 * Audio and external video gates are excluded to keep the workspace focused and clean.
 */
export function registerBuiltinPanels(): void {
  const editable = ({ state }: { state: { readOnly: boolean } }): boolean => !state.readOnly
  registerPanel({ id: 'templates', label: t.rail.templates, icon: icon(LayoutTemplate), order: 5, placement: 'sidebar', component: TemplatesPanel, preload: TemplatesPanel.preload, requires: editable })
  registerPanel({ id: 'text', label: t.rail.text, icon: icon(Type), order: 10, placement: 'drawer', component: TextDrawer, requires: editable, shortcut: 'T' })
  registerPanel({ id: 'shapes', label: t.rail.shapes, icon: icon(Shapes), order: 20, placement: 'drawer', component: ShapesDrawer, requires: editable })
  registerPanel({ id: 'elements', label: t.rail.elements, title: t.stickers.title, icon: icon(Sticker), order: 30, placement: 'sidebar', component: StickerPanel, requires: editable })
  registerPanel({ id: 'image', label: t.rail.image, icon: icon(Images), order: 40, placement: 'drawer', component: ImageDrawer, requires: editable })
  registerPanel({ id: 'background', label: t.rail.background, icon: icon(PaintBucket), order: 60, placement: 'drawer', component: BackgroundPanel, requires: editable })
  registerPanel({ id: 'brand', label: t.rail.brand, icon: icon(Palette), order: 70, placement: 'sidebar', component: BrandPanel, preload: BrandPanel.preload, requires: ({ state }) => !state.readOnly && state.mode !== 'shared-edit' })
  registerPanel({ id: 'layers', label: t.rail.layers, icon: icon(Layers), order: 80, placement: 'sidebar', component: LayersPanel, readOnly: true })
}

registerBuiltinPanels()
