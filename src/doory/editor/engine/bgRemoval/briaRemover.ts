import type { BackgroundRemover, BgRemovalProgress } from '../bgRemoval'
import { BackgroundRemovalError } from '../bgRemoval'

type SegmenterPipeline = any

let cachedPipeline: Promise<SegmenterPipeline> | null = null

async function getPipeline(onProgress?: BgRemovalProgress, signal?: AbortSignal): Promise<SegmenterPipeline> {
  if (cachedPipeline) {
    return cachedPipeline
  }

  cachedPipeline = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers')
    // Ensure we don't try to look for local fs models in browser
    env.allowLocalModels = false

    const handleProgress = (info: any) => {
      if (signal?.aborted) return
      if (info && typeof info.progress === 'number') {
        const pct = Math.min(100, Math.max(0, Math.round(info.progress)))
        onProgress?.('downloading', pct)
      }
    }

    // Try WebGPU first for maximum speed
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        return await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
          device: 'webgpu',
          progress_callback: handleProgress,
        })
      } catch (e) {
        console.warn('[InHubFlow BG Remover] WebGPU unavailable, falling back to wasm:', e)
      }
    }

    // Fallback to WASM
    return await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
      device: 'wasm',
      progress_callback: handleProgress,
    })
  })().catch((err) => {
    cachedPipeline = null // reset on failure so the user can retry
    throw err
  })

  return cachedPipeline
}

export class BriaTransformersRemover implements BackgroundRemover {
  async remove(image: Blob, onProgress?: BgRemovalProgress, signal?: AbortSignal): Promise<Blob> {
    if (signal?.aborted) {
      throw new BackgroundRemovalError('Operación cancelada')
    }

    try {
      onProgress?.('downloading', 0)
      const pipe = await getPipeline(onProgress, signal)

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 15)
      const { RawImage } = await import('@huggingface/transformers')
      const rawImage = await RawImage.fromBlob(image)

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 40)
      const output = await pipe(rawImage)

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 85)
      const resultImage = Array.isArray(output) ? output[0] : output

      if (!resultImage || typeof resultImage.toBlob !== 'function') {
        throw new BackgroundRemovalError('No se pudo generar el recorte transparente')
      }

      const transparentBlob = await resultImage.toBlob('image/png')
      onProgress?.('processing', 100)

      return transparentBlob
    } catch (err: any) {
      if (signal?.aborted) {
        throw err
      }
      console.error('[InHubFlow BG Remover] Error during background removal:', err)
      throw new BackgroundRemovalError(err instanceof Error ? err.message : 'Error al eliminar el fondo.')
    }
  }
}
