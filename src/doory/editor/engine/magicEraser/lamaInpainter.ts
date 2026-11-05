import * as ort from 'onnxruntime-web'

const LAMA_MODEL_URL = 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx'
const CACHE_NAME = 'inhubflow-lama-cache-v1'

let cachedSessionPromise: Promise<ort.InferenceSession> | null = null

export type InpaintingProgressCallback = (phase: 'downloading' | 'processing', percent: number) => void

/**
 * Downloads the LaMa ONNX model with stream progress and caches it in CacheStorage.
 */
async function fetchModelWithProgress(url: string, onProgress?: InpaintingProgressCallback): Promise<ArrayBuffer> {
  // Check browser cache first
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const cachedResponse = await cache.match(url)
      if (cachedResponse) {
        onProgress?.('downloading', 100)
        return await cachedResponse.arrayBuffer()
      }
    } catch (e) {
      console.warn('[Magic Eraser] CacheStorage check failed, continuing with direct fetch:', e)
    }
  }

  // Fetch with progress reporting
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Error al descargar el modelo de borrado (${response.status} ${response.statusText})`)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (!response.body || total === 0) {
    const buffer = await response.arrayBuffer()
    onProgress?.('downloading', 100)
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      receivedBytes += value.length
      if (total > 0) {
        const pct = Math.min(100, Math.round((receivedBytes / total) * 100))
        onProgress?.('downloading', pct)
      }
    }
  }

  const combined = new Uint8Array(receivedBytes)
  let position = 0
  for (const chunk of chunks) {
    combined.set(chunk, position)
    position += chunk.length
  }

  // Save to CacheStorage for instant future use
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(
        url,
        new Response(combined.buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(receivedBytes),
          },
        }),
      )
    } catch (e) {
      console.warn('[Magic Eraser] Could not persist model into CacheStorage:', e)
    }
  }

  return combined.buffer
}

/**
 * Initializes and caches the ONNX InferenceSession for LaMa.
 */
export async function getLamaSession(onProgress?: InpaintingProgressCallback): Promise<ort.InferenceSession> {
  if (cachedSessionPromise) {
    return cachedSessionPromise
  }

  cachedSessionPromise = (async () => {
    onProgress?.('downloading', 0)
    const buffer = await fetchModelWithProgress(LAMA_MODEL_URL, onProgress)

    onProgress?.('processing', 5)
    // Configure ONNX Web session: WebGPU if available, else WASM
    const session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
    })

    return session
  })().catch((err) => {
    cachedSessionPromise = null // allow retry on error
    throw err
  })

  return cachedSessionPromise
}

/**
 * Runs LaMa inpainting on a high-resolution image using a user-painted binary mask.
 * 
 * @param originalCanvas Canvas holding the source image at full native resolution
 * @param maskCanvas Canvas holding the binary/painted mask (white/semi-white = pixels to erase)
 * @param onProgress Callback for download/processing progress
 */
export async function runLamaInpainting(
  originalCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  onProgress?: InpaintingProgressCallback,
): Promise<Blob> {
  const origW = originalCanvas.width
  const origH = originalCanvas.height

  onProgress?.('processing', 10)
  const session = await getLamaSession(onProgress)

  onProgress?.('processing', 25)
  // LaMa works with fixed 512x512 inputs
  const S = 512
  const inImgCanvas = document.createElement('canvas')
  inImgCanvas.width = S
  inImgCanvas.height = S
  const inImgCtx = inImgCanvas.getContext('2d')!
  inImgCtx.drawImage(originalCanvas, 0, 0, S, S)
  const imgData = inImgCtx.getImageData(0, 0, S, S).data

  const inMaskCanvas = document.createElement('canvas')
  inMaskCanvas.width = S
  inMaskCanvas.height = S
  const inMaskCtx = inMaskCanvas.getContext('2d')!
  inMaskCtx.drawImage(maskCanvas, 0, 0, S, S)
  const maskData = inMaskCtx.getImageData(0, 0, S, S).data

  // Build image tensor: shape [1, 3, 512, 512] planar RGB normalized 0..1
  const numPixels = S * S
  const imgTensorData = new Float32Array(3 * numPixels)
  const maskTensorData = new Float32Array(numPixels)

  for (let i = 0; i < numPixels; i++) {
    const srcOffset = i * 4
    // Red, Green, Blue
    imgTensorData[i] = imgData[srcOffset] / 255.0
    imgTensorData[numPixels + i] = imgData[srcOffset + 1] / 255.0
    imgTensorData[2 * numPixels + i] = imgData[srcOffset + 2] / 255.0

    // Mask: check alpha or color intensity of painted strokes
    const maskVal = Math.max(maskData[srcOffset], maskData[srcOffset + 1], maskData[srcOffset + 2], maskData[srcOffset + 3])
    maskTensorData[i] = maskVal > 20 ? 1.0 : 0.0
  }

  onProgress?.('processing', 45)
  const imageTensor = new ort.Tensor('float32', imgTensorData, [1, 3, S, S])
  const maskTensor = new ort.Tensor('float32', maskTensorData, [1, 1, S, S])

  // Run model inference
  onProgress?.('processing', 65)
  const feeds: Record<string, ort.Tensor> = {
    image: imageTensor,
    mask: maskTensor,
  }

  const results = await session.run(feeds)
  onProgress?.('processing', 85)

  // Extract inpaint result
  const outputTensor = results.output || results[Object.keys(results)[0]]
  const outData = outputTensor.data as Float32Array

  // Check if output is in 0..1 or 0..255 range
  let isNormalized = true
  for (let i = 0; i < Math.min(100, outData.length); i++) {
    if (outData[i] > 1.5) {
      isNormalized = false
      break
    }
  }

  const outCanvas = document.createElement('canvas')
  outCanvas.width = S
  outCanvas.height = S
  const outCtx = outCanvas.getContext('2d')!
  const outImgData = outCtx.createImageData(S, S)
  const outPixels = outImgData.data

  for (let i = 0; i < numPixels; i++) {
    const dstOffset = i * 4
    const r = isNormalized ? outData[i] * 255 : outData[i]
    const g = isNormalized ? outData[numPixels + i] * 255 : outData[numPixels + i]
    const b = isNormalized ? outData[2 * numPixels + i] * 255 : outData[2 * numPixels + i]

    outPixels[dstOffset] = Math.min(255, Math.max(0, Math.round(r)))
    outPixels[dstOffset + 1] = Math.min(255, Math.max(0, Math.round(g)))
    outPixels[dstOffset + 2] = Math.min(255, Math.max(0, Math.round(b)))
    outPixels[dstOffset + 3] = 255
  }
  outCtx.putImageData(outImgData, 0, 0)

  // Upscale inpainted 512x512 result back to original image dimensions
  const upscaledCanvas = document.createElement('canvas')
  upscaledCanvas.width = origW
  upscaledCanvas.height = origH
  const upscaledCtx = upscaledCanvas.getContext('2d')!
  upscaledCtx.imageSmoothingEnabled = true
  upscaledCtx.imageSmoothingQuality = 'high'
  upscaledCtx.drawImage(outCanvas, 0, 0, origW, origH)

  // Create composite canvas: 100% of original pixels kept, only masked area replaced with soft feathering
  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = origW
  finalCanvas.height = origH
  const finalCtx = finalCanvas.getContext('2d')!

  // 1. Draw original pristine image
  finalCtx.drawImage(originalCanvas, 0, 0)

  // 2. Blend the inpainted regions over the masked spots using destination-over / source-over with mask
  const origMaskCtx = maskCanvas.getContext('2d')!
  const fullMaskData = origMaskCtx.getImageData(0, 0, origW, origH).data
  const upscaledData = upscaledCtx.getImageData(0, 0, origW, origH).data
  const finalData = finalCtx.getImageData(0, 0, origW, origH)
  const finalPixels = finalData.data

  for (let i = 0; i < origW * origH; i++) {
    const offset = i * 4
    const alpha = fullMaskData[offset + 3] / 255.0
    if (alpha > 0.01) {
      // Soft alpha blend between original and inpainted
      finalPixels[offset] = Math.round(finalPixels[offset] * (1 - alpha) + upscaledData[offset] * alpha)
      finalPixels[offset + 1] = Math.round(finalPixels[offset + 1] * (1 - alpha) + upscaledData[offset + 1] * alpha)
      finalPixels[offset + 2] = Math.round(finalPixels[offset + 2] * (1 - alpha) + upscaledData[offset + 2] * alpha)
    }
  }

  finalCtx.putImageData(finalData, 0, 0)
  onProgress?.('processing', 100)

  // Convert final canvas to PNG Blob
  return new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo exportar la imagen limpia.'))
    }, 'image/png')
  })
}
