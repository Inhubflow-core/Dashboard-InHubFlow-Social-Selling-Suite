import { newId } from '@doory/lib/document'
import type { AssetRef, VideoService, VideoUploadOptions } from '@doory/types/adapter'
import type { Page, StockVideo, StockVideoPage, VideoInfo, VideoLength, VideoOrientation } from '@doory/types/api'
import { fetchPixabayResources } from '@/lib/viral-posts/pixabay-client'

export function createPixabayVideoService(
  uploadAsset?: (file: File | Blob, opts?: { name?: string }) => Promise<AssetRef>
): VideoService {
  const videoUploads: AssetRef[] = []

  return {
    async info(): Promise<VideoInfo> {
      return {
        enabled: true,
        max_upload_bytes: 200 * 1024 * 1024,
        max_duration_ms: 600_000,
        providers: [
          {
            name: 'pixabay',
            label: 'Pixabay Videos',
            attribution: 'Videos por Pixabay',
            url: 'https://pixabay.com',
          },
        ],
        all: ['pixabay'],
        default: 'pixabay',
      }
    },

    async list(page = 1): Promise<Page<AssetRef>> {
      const pageSize = 20
      const start = (page - 1) * pageSize
      const slice = videoUploads.slice(start, start + pageSize)
      return {
        count: videoUploads.length,
        next: start + pageSize < videoUploads.length ? String(page + 1) : null,
        previous: page > 1 ? String(page - 1) : null,
        results: slice,
      }
    },

    async get(id: string): Promise<AssetRef> {
      const found = videoUploads.find((v) => v.id === id)
      if (!found) throw new Error('Video clip no encontrado')
      return found
    },

    async upload(file: File, options?: VideoUploadOptions): Promise<AssetRef> {
      if (uploadAsset) {
        const baseRef = await uploadAsset(file, { name: file.name })
        const ref: AssetRef = {
          ...baseRef,
          kind: 'video',
          video: {
            status: 'ready',
            error: '',
            posterUrl: baseRef.url,
            audioUrl: '',
            durationMs: 15_000,
            fps: 30,
            filmstrip: null,
          },
        }
        videoUploads.unshift(ref)
        return ref
      }

      const id = newId()
      const blobUrl = URL.createObjectURL(file)
      const ref: AssetRef = {
        id,
        url: blobUrl,
        thumbUrl: blobUrl,
        width: 1280,
        height: 720,
        name: file.name || 'Video subido',
        kind: 'video',
        video: {
          status: 'ready',
          error: '',
          posterUrl: blobUrl,
          audioUrl: '',
          durationMs: 15_000,
          fps: 30,
          filmstrip: null,
        },
      }
      videoUploads.unshift(ref)
      return ref
    },

    async search(
      q: string,
      page: number | string,
      options: {
        provider?: string
        orientation?: VideoOrientation
        length?: VideoLength
        signal?: AbortSignal
      }
    ): Promise<StockVideoPage> {
      const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10) || 1
      try {
        const data = await fetchPixabayResources({
          resource: 'videos',
          query: q || '',
          page: pageNum,
          perPage: 20,
          orientation:
            options.orientation === 'landscape'
              ? 'horizontal'
              : options.orientation === 'portrait'
                ? 'vertical'
                : 'all',
        })

        const seenIds = new Set<string>()
        const results: StockVideo[] = []
        for (const item of data.items || []) {
          const idStr = String(item.id)
          if (seenIds.has(idStr)) continue
          seenIds.add(idStr)
          const durationSeconds = item.duration || 12
          results.push({
            id: idStr,
            provider: 'pixabay',
            thumb_url: item.previewUrl,
            preview_url: item.videoUrl || item.regularUrl,
            width: item.width || 1280,
            height: item.height || 720,
            duration_ms: durationSeconds * 1000,
            author: item.author || 'Pixabay Creator',
            author_url: `https://pixabay.com/users/${encodeURIComponent(item.author || '')}`,
            source_url: item.videoUrl || item.previewUrl,
          })
        }

        const perPage = data.per_page || 20
        const hasNext = data.total > pageNum * perPage

        return {
          configured: data.configured,
          provider: 'pixabay',
          total: data.total,
          next_page: hasNext ? pageNum + 1 : null,
          results,
        }
      } catch (err: any) {
        console.error('[PixabayVideoService] Error fetching videos:', err)
        return {
          configured: false,
          provider: 'pixabay',
          total: 0,
          next_page: null,
          results: [],
        }
      }
    },

    async importVideo(video: StockVideo): Promise<AssetRef> {
      const ref: AssetRef = {
        id: newId(),
        url: video.preview_url || video.thumb_url,
        thumbUrl: video.thumb_url,
        width: video.width,
        height: video.height,
        name: video.author ? `Video por ${video.author}` : 'Video Pixabay',
        kind: 'video',
        video: {
          status: 'ready',
          error: '',
          posterUrl: video.thumb_url,
          audioUrl: '',
          durationMs: video.duration_ms,
          fps: 30,
          filmstrip: null,
        },
      }
      videoUploads.unshift(ref)
      return ref
    },
  }
}
