"use client";

export interface RemoveBgProgress {
  phase: "loading_model" | "processing" | "finalizing";
  message: string;
  percent: number;
}

/**
 * Convierte un Blob a Data URL (base64)
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Error al convertir imagen a base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Remueve el fondo de una imagen usando IA directamente en el navegador (WASM / ONNX)
 * sin requerir servidores externos ni costo por llamada.
 */
export async function removeImageBackground(
  imageSource: string | File | Blob,
  onProgress?: (progress: RemoveBgProgress) => void
): Promise<string> {
  try {
    onProgress?.({
      phase: "loading_model",
      message: "Preparando motor de IA de recorte...",
      percent: 15,
    });

    let inputSource: Blob | File | string = imageSource;

    // Si es una URL externa, la descargamos como Blob (usando proxy si hay CORS)
    if (typeof imageSource === "string" && (imageSource.startsWith("http://") || imageSource.startsWith("https://"))) {
      try {
        const directRes = await fetch(imageSource, { mode: "cors" });
        if (directRes.ok) {
          inputSource = await directRes.blob();
        } else {
          throw new Error("Direct fetch failed");
        }
      } catch {
        onProgress?.({
          phase: "loading_model",
          message: "Optimizando imagen externa...",
          percent: 30,
        });
        const proxyRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageSource)}`);
        if (proxyRes.ok) {
          inputSource = await proxyRes.blob();
        } else {
          throw new Error("No se pudo descargar la imagen para procesarla");
        }
      }
    }

    onProgress?.({
      phase: "loading_model",
      message: "Cargando modelo de segmentación de sujetos...",
      percent: 45,
    });

    // Import dinámico para aislar de SSR
    const { removeBackground } = await import("@imgly/background-removal");

    onProgress?.({
      phase: "processing",
      message: "Identificando y recortando el sujeto...",
      percent: 70,
    });

    const resultBlob = await removeBackground(inputSource, {
      progress: (key: string, current: number, total: number) => {
        const pct = total > 0 ? Math.min(95, Math.round((current / total) * 100)) : 75;
        onProgress?.({
          phase: "processing",
          message: key.includes("fetch")
            ? `Descargando red neuronal (${pct}%)...`
            : `Segmentando sujeto con precisión (${pct}%)...`,
          percent: pct,
        });
      },
      output: {
        format: "image/png",
        quality: 0.92,
      },
    });

    onProgress?.({
      phase: "finalizing",
      message: "Generando PNG transparente...",
      percent: 98,
    });

    const dataUrl = await blobToDataUrl(resultBlob);

    onProgress?.({
      phase: "finalizing",
      message: "¡Recorte completado con éxito!",
      percent: 100,
    });

    return dataUrl;
  } catch (error: any) {
    console.error("Error en removeImageBackground:", error);
    throw new Error(error.message || "Error al remover el fondo de la imagen");
  }
}
