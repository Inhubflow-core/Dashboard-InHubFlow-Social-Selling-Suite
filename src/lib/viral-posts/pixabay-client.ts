export interface PixabayItem {
  id: string | number;
  type: "photo" | "vector" | "illustration" | "background" | "video";
  title: string;
  tags: string[];
  previewUrl: string;
  regularUrl: string;
  fullUrl: string;
  videoUrl?: string;
  width?: number;
  height?: number;
  author: string;
  source: "pixabay" | "curated";
}

export interface FetchPixabayOptions {
  resource: "photos" | "vectors" | "illustrations" | "backgrounds" | "videos";
  query?: string;
  category?: string;
  orientation?: "all" | "horizontal" | "vertical";
  page?: number;
  perPage?: number;
  apiKey?: string;
}

export interface PixabayApiResponse {
  configured: boolean;
  source: "pixabay" | "curated" | "fallback";
  total: number;
  page?: number;
  per_page?: number;
  items: PixabayItem[];
  warning?: string;
  message?: string;
}

export const PIXABAY_STORAGE_KEY = "inhubflow_pixabay_key";

export function getStoredPixabayKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PIXABAY_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredPixabayKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key.trim()) {
      localStorage.setItem(PIXABAY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(PIXABAY_STORAGE_KEY);
    }
  } catch {}
}

export async function testPixabayKey(key: string): Promise<{ ok: boolean; message: string; totalHits?: number }> {
  try {
    const res = await fetch(`/api/pixabay?test=true&key=${encodeURIComponent(key.trim())}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, message: err.message || "Error al conectar con Pixabay" };
  }
}

export async function fetchPixabayResources(options: FetchPixabayOptions): Promise<PixabayApiResponse> {
  const params = new URLSearchParams({
    resource: options.resource,
    q: options.query || "",
    category: options.category || "",
    orientation: options.orientation || "all",
    page: String(options.page || 1),
    per_page: String(options.perPage || 28),
  });

  const headers: Record<string, string> = {};
  const activeKey = options.apiKey ?? getStoredPixabayKey();
  if (activeKey) {
    headers["x-pixabay-key"] = activeKey;
  }

  const res = await fetch(`/api/pixabay?${params.toString()}`, { headers });
  if (!res.ok) {
    throw new Error(`Error en el servicio de Pixabay (${res.status})`);
  }
  return res.json();
}
