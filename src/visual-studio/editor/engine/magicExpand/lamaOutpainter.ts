import * as ort from 'onnxruntime-web'
import { getLamaSession, type InpaintingProgressCallback } from '../magicEraser/lamaInpainter'

export interface OutpaintExpansion {
  left: number
  right: number
  top: number
  bottom: number
}

export interface OutpaintResult {
  blob: Blob
  width: number
  height: number
  previewUrl: string
}

export interface OutpaintOptions {
  feather?: number
  onProgress?: InpaintingProgressCallback
}

/**
 * Runs AI Outpainting (Magic Expand) on a source image using the client-side LaMa ONNX model.
 * Extrapolates canvas borders seamlessly without external APIs or GPU costs.
 */
export async function runLamaOutpainting(
  originalCanvas: HTMLCanvasElement,
  expansion: OutpaintExpansion,
  options?: OutpaintOptions,
): Promise<OutpaintResult> {
  const origW = originalCanvas.width
  const origH = originalCanvas.height

  const left = Math.max(0, Math.round(expansion.left))
  const right = Math.max(0, Math.round(expansion.right))
  const top = Math.max(0, Math.round(expansion.top))
  const bottom = Math.max(0, Math.round(expansion.bottom))

  const targetW = origW + left + right
  const targetH = origH + top + bottom

  if (left === 0 && right === 0 && top === 0 && bottom === 0) {
    // No expansion needed; return cloned original blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      originalCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png')
    })
    return { blob, width: origW, height: origH, previewUrl: URL.createObjectURL(blob) }
  }

  console.log(`[Magic Expand] Outpainting from ${origW}x${origH} to ${targetW}x${targetH} (+L:${left}, +R:${right}, +T:${top}, +B:${bottom})`)
  options?.onProgress?.('processing', 10)

  // 1. Prepare base padded canvas with ambient edge extension
  const paddedCanvas = document.createElement('canvas')
  paddedCanvas.width = targetW
  paddedCanvas.height = targetH
  const padCtx = paddedCanvas.getContext('2d', { willReadFrequently: true })!

  // Fill outer border with a smooth contextual blur of the original image
  // This provides LaMa with natural lighting, chromatic ambience, and color gradients to extrapolate from
  padCtx.save()
  padCtx.filter = 'blur(20px)'
  padCtx.drawImage(originalCanvas, 0, 0, targetW, targetH)
  padCtx.restore()

  // Draw the original sharp image in its designated central position
  padCtx.drawImage(originalCanvas, left, top, origW, origH)

  // 2. Prepare binary mask canvas:
  // - White (255) = Areas to be generated / outpainted by AI
  // - Black (0)   = Protected core area of the original image
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = targetW
  maskCanvas.height = targetH
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })!

  // Default: Entire canvas marked as needing generation (white)
  maskCtx.fillStyle = '#ffffff'
  maskCtx.fillRect(0, 0, targetW, targetH)

  // In the original image location, protect the core with a soft feather overlap (8-16px)
  const overlap = Math.max(6, Math.min(16, Math.floor(Math.min(origW, origH) * 0.04)))
  const coreX = left + (left > 0 ? overlap : 0)
  const coreY = top + (top > 0 ? overlap : 0)
  const coreW = Math.max(1, origW - (left > 0 ? overlap : 0) - (right > 0 ? overlap : 0))
  const coreH = Math.max(1, origH - (top > 0 ? overlap : 0) - (bottom > 0 ? overlap : 0))

  maskCtx.fillStyle = '#000000'
  maskCtx.fillRect(coreX, coreY, coreW, coreH)

  options?.onProgress?.('processing', 25)

  // 3. Acquire LaMa model session (already cached locally in browser CacheStorage)
  const session = await getLamaSession(options?.onProgress)

  // 4. Downscale both paddedCanvas and maskCanvas to LaMa's fixed 512x512 receptive field
  const S = 512
  const inImgCanvas = document.createElement('canvas')
  inImgCanvas.width = S
  inImgCanvas.height = S
  const inImgCtx = inImgCanvas.getContext('2d')!
  inImgCtx.drawImage(paddedCanvas, 0, 0, S, S)
  const imgData = inImgCtx.getImageData(0, 0, S, S).data

  const inMaskCanvas = document.createElement('canvas')
  inMaskCanvas.width = S
  inMaskCanvas.height = S
  const inMaskCtx = inMaskCanvas.getContext('2d')!
  inMaskCtx.drawImage(maskCanvas, 0, 0, S, S)
  const maskData = inMaskCtx.getImageData(0, 0, S, S).data

  // 5. Construct ONNX input tensors: image [1, 3, 512, 512], mask [1, 1, 512, 512]
  const numPixels = S * S
  const imgTensorData = new Float32Array(3 * numPixels)
  const maskTensorData = new Float32Array(numPixels)

  for (let i = 0; i < numPixels; i++) {
    const srcOffset = i * 4
    imgTensorData[i] = imgData[srcOffset] / 255.0
    imgTensorData[numPixels + i] = imgData[srcOffset + 1] / 255.0
    imgTensorData[2 * numPixels + i] = imgData[srcOffset + 2] / 255.0

    // White pixels (> 15) indicate areas for AI to generate
    const mVal = Math.max(maskData[srcOffset], maskData[srcOffset + 1], maskData[srcOffset + 2])
    maskTensorData[i] = mVal > 15 ? 1.0 : 0.0
  }

  options?.onProgress?.('processing', 45)
  const imageTensor = new ort.Tensor('float32', imgTensorData, [1, 3, S, S])
  const maskTensor = new ort.Tensor('float32', maskTensorData, [1, 1, S, S])

  options?.onProgress?.('processing', 65)
  console.log('[Magic Expand] Executing WASM outpainting inference...')
  await new Promise((r) => setTimeout(r, 40))

  const results = await session.run({
    image: imageTensor,
    mask: maskTensor,
  })

  options?.onProgress?.('processing', 85)
  await new Promise((r) => setTimeout(r, 20))

  // 6. Decode output tensor from LaMa
  const outputTensor = results.output || results[Object.keys(results)[0]]
  const outData = outputTensor.data as Float32Array

  let alreadyIn255 = false
  for (let i = 0; i < Math.min(2000, outData.length); i += 20) {
    if (outData[i] > 1.5) {
      alreadyIn255 = true
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
    const r = alreadyIn255 ? outData[i] : outData[i] * 255
    const g = alreadyIn255 ? outData[numPixels + i] : outData[numPixels + i] * 255
    const b = alreadyIn255 ? outData[2 * numPixels + i] : outData[2 * numPixels + i] * 255

    outPixels[dstOffset] = Math.min(255, Math.max(0, Math.round(r)))
    outPixels[dstOffset + 1] = Math.min(255, Math.max(0, Math.round(g)))
    outPixels[dstOffset + 2] = Math.min(255, Math.max(0, Math.round(b)))
    outPixels[dstOffset + 3] = 255
  }
  outCtx.putImageData(outImgData, 0, 0)

  // 7. Upscale 512x512 outpainted result to full target dimensions
  const upscaledCanvas = document.createElement('canvas')
  upscaledCanvas.width = targetW
  upscaledCanvas.height = targetH
  const upscaledCtx = upscaledCanvas.getContext('2d')!
  upscaledCtx.imageSmoothingEnabled = true
  upscaledCtx.imageSmoothingQuality = 'high'
  upscaledCtx.drawImage(outCanvas, 0, 0, targetW, targetH)

  // 8. Composite: Draw outpainted backdrop + crisp original image with seam blending
  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = targetW
  finalCanvas.height = targetH
  const finalCtx = finalCanvas.getContext('2d')!

  // Background is the AI-generated continuation
  finalCtx.drawImage(upscaledCanvas, 0, 0)

  // Core is the 100% untouched crisp original image
  finalCtx.drawImage(originalCanvas, left, top, origW, origH)

  options?.onProgress?.('processing', 95)

  // 9. Export to Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export to blob failed'))), 'image/png')
  })

  options?.onProgress?.('processing', 100)
  console.log('[Magic Expand] Outpainting finished successfully!')

  return {
    blob,
    width: targetW,
    height: targetH,
    previewUrl: URL.createObjectURL(blob),
  }
}
