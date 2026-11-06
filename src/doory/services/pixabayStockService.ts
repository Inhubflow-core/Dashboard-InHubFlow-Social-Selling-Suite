import { newId } from '@doory/lib/document'
import type { AssetRef } from '@doory/types/adapter'
import type { StockPage, StockPhoto, StockProviders } from '@doory/types/api'
import { fetchPixabayResources } from '@/lib/viral-posts/pixabay-client'

export function createPixabayStockService(
  onAssetCreated?: (ref: AssetRef) => void
) {
  return {
    async providers(): Promise<StockProviders> {
      return {
        providers: [
          {
            name: 'photos',
            label: 'Fotos',
            attribution: 'Fotos por Pixabay',
            url: 'https://pixabay.com',
          },
          {
            name: 'illustrations',
            label: 'Ilustraciones',
            attribution: 'Ilustraciones por Pixabay',
            url: 'https://pixabay.com',
          },
          {
            name: 'vectors',
            label: 'Vectores',
            attribution: 'Vectores por Pixabay',
            url: 'https://pixabay.com',
          },
          {
            name: 'backgrounds',
            label: 'Fondos',
            attribution: 'Fondos por Pixabay',
            url: 'https://pixabay.com',
          },
        ],
        all: ['photos', 'illustrations', 'vectors', 'backgrounds'],
        default: 'photos',
      }
    },

    async search(q: string, page: number | string, provider?: string): Promise<StockPage> {
      const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1
      const effectiveProvider = (provider && provider !== 'all' ? provider : 'photos') as
        | 'photos'
        | 'vectors'
        | 'illustrations'
        | 'backgrounds'

      try {
        const data = await fetchPixabayResources({
          resource: effectiveProvider,
          query: q || '',
          page: pageNum,
          perPage: 28,
        })

        const results: StockPhoto[] = (data.items || []).map((item) => {
          return {
            id: String(item.id),
            provider: effectiveProvider,
            thumb_url: item.previewUrl,
            preview_url: item.regularUrl || item.previewUrl,
            width: item.width || 1280,
            height: item.height || 720,
            author: item.author || 'Pixabay Creator',
            author_url: `https://pixabay.com/users/${encodeURIComponent(item.author || '')}`,
            source_url: item.fullUrl || item.regularUrl || item.previewUrl,
          }
        })

        const perPage = data.per_page || 28
        const hasNext = data.total > pageNum * perPage

        return {
          configured: data.configured,
          provider: effectiveProvider,
          total: data.total,
          next_page: hasNext ? pageNum + 1 : null,
          results,
        }
      } catch (err: any) {
        console.error('[PixabayStockService] Error fetching stock:', err)
        return {
          configured: false,
          provider: effectiveProvider,
          total: 0,
          next_page: null,
          results: [],
        }
      }
    },

    async importPhoto(photo: StockPhoto): Promise<AssetRef> {
      const ref: AssetRef = {
        id: newId(),
        url: photo.preview_url,
        thumbUrl: photo.thumb_url,
        width: photo.width,
        height: photo.height,
        name: photo.author ? `Foto por ${photo.author}` : 'Stock photo',
        kind: 'image',
      }
      onAssetCreated?.(ref)
      return ref
    },
  }
}
