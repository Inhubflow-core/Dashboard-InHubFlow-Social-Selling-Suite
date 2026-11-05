import type { BackgroundRemover, BgRemovalProgress } from '../bgRemoval'
import { BackgroundRemovalError } from '../bgRemoval'

type LoadedModels = {
  model: any
  processor: any
}

let cachedModelsPromise: Promise<LoadedModels> | null = null

async function getModels(onProgress?: BgRemovalProgress, signal?: AbortSignal): Promise<LoadedModels> {
  if (cachedModelsPromise) {
    return cachedModelsPromise
  }

  cachedModelsPromise = (async () => {
    const { AutoModel, AutoProcessor, env } = await import('@huggingface/transformers')
    // Ensure we don't try to look for local fs models in browser
    env.allowLocalModels = false

    const modelId = 'briaai/RMBG-1.4'

    const handleProgress = (info: any) => {
      if (signal?.aborted) return
      if (info && typeof info.progress === 'number') {
        const pct = Math.min(100, Math.max(0, Math.round(info.progress)))
        onProgress?.('downloading', pct)
      }
    }

    // Load processor
    const processor = await AutoProcessor.from_pretrained(modelId, {
      progress_callback: handleProgress,
    })

    // Try WebGPU first for maximum speed
    let model: any = null
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        model = await AutoModel.from_pretrained(modelId, {
          device: 'webgpu',
          progress_callback: handleProgress,
        })
      } catch (e) {
        console.warn('[InHubFlow BG Remover] WebGPU unavailable, falling back to wasm:', e)
      }
    }

    if (!model) {
      model = await AutoModel.from_pretrained(modelId, {
        device: 'wasm',
        progress_callback: handleProgress,
      })
    }

    return { model, processor }
  })().catch((err) => {
    cachedModelsPromise = null // reset on failure so user can retry
    throw err
  })

  return cachedModelsPromise
}

async function rawImageToBlob(rawImg: any): Promise<Blob> {
  if (typeof rawImg.toBlob === 'function') {
    try {
      const b = await rawImg.toBlob('image/png')
      if (b instanceof Blob) return b
    } catch {
      // Fallback to canvas
    }
  }
  const canvas = rawImg.toCanvas()
  if (typeof canvas.convertToBlob === 'function') {
    return await canvas.convertToBlob({ type: 'image/png' })
  }
  return new Promise<Blob>((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob: Blob | null) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      }, 'image/png')
    } else {
      reject(new Error('Neither convertToBlob nor toBlob is available on canvas'))
    }
  })
}

export class BriaTransformersRemover implements BackgroundRemover {
  async remove(image: Blob, onProgress?: BgRemovalProgress, signal?: AbortSignal): Promise<Blob> {
    if (signal?.aborted) {
      throw new BackgroundRemovalError('Operación cancelada')
    }

    try {
      onProgress?.('downloading', 0)
      const { model, processor } = await getModels(onProgress, signal)

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 15)
      const { RawImage } = await import('@huggingface/transformers')
      const rawImage = await RawImage.fromBlob(image)

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 35)
      const { pixel_values } = await processor(rawImage)

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 60)
      const output = await model({ input: pixel_values })

      if (signal?.aborted) {
        throw new BackgroundRemovalError('Operación cancelada')
      }

      onProgress?.('processing', 80)
      const outTensor = output.output
      const [batch, channels, height, width] = outTensor.dims
      const outData = outTensor.data as Float32Array
      const maskData = new Uint8ClampedArray(height * width)

      for (let i = 0; i < maskData.length; i++) {
        maskData[i] = Math.round(Math.min(1, Math.max(0, outData[i])) * 255)
      }

      const mask = new RawImage(maskData, width, height, 1)
      const resizedMask = await mask.resize(rawImage.width, rawImage.height)
      rawImage.putAlpha(resizedMask)

      onProgress?.('processing', 95)
      const transparentBlob = await rawImageToBlob(rawImage)
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
