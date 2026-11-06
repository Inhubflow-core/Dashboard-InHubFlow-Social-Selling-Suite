import { NextRequest, NextResponse } from "next/server";

export interface PixabayNormalizedItem {
  id: string | number;
  type: "photo" | "vector" | "illustration" | "background" | "video";
  title: string;
  tags: string[];
  previewUrl: string;
  regularUrl: string;
  fullUrl: string;
  videoUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  author: string;
  source: "pixabay" | "curated";
}

// Catálogo de respaldo de alta calidad (cuando no hay API Key o ante fallos de red)
const CURATED_FALLBACK_RESOURCES: Record<string, PixabayNormalizedItem[]> = {
  photos: [
    {
      id: "cur-p1",
      type: "photo",
      title: "Ejecutivo B2B & Tablet",
      tags: ["business", "executive", "office", "b2b"],
      previewUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=90",
      author: "Hunters Race",
      source: "curated",
    },
    {
      id: "cur-p2",
      type: "photo",
      title: "Oficina Corporativa Moderna",
      tags: ["office", "corporate", "modern", "minimal"],
      previewUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=90",
      author: "Slidebean",
      source: "curated",
    },
    {
      id: "cur-p3",
      type: "photo",
      title: "Sala de Juntas de Cristal",
      tags: ["meeting", "boardroom", "glass", "architecture"],
      previewUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1920&q=90",
      author: "Alesia Kazantceva",
      source: "curated",
    },
    {
      id: "cur-p4",
      type: "photo",
      title: "Lounge Corporativo Dark",
      tags: ["lounge", "dark", "interior", "design"],
      previewUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1920&q=90",
      author: "Dan Gold",
      source: "curated",
    },
    {
      id: "cur-p5",
      type: "photo",
      title: "Equipo Tecnológico & Laptop",
      tags: ["technology", "team", "laptop", "startup"],
      previewUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=90",
      author: "Annie Spratt",
      source: "curated",
    },
    {
      id: "cur-p6",
      type: "photo",
      title: "Métricas y Análisis Financiero",
      tags: ["metrics", "growth", "charts", "analytics"],
      previewUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=90",
      author: "Luke Chesser",
      source: "curated",
    },
    {
      id: "cur-p7",
      type: "photo",
      title: "Rascacielos & Fachada Vidrio",
      tags: ["skyscraper", "architecture", "city", "building"],
      previewUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=90",
      author: "Sean Pollock",
      source: "curated",
    },
    {
      id: "cur-p8",
      type: "photo",
      title: "Reunión de Estrategia B2B",
      tags: ["strategy", "workshop", "team", "meeting"],
      previewUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=90",
      author: "Annie Spratt",
      source: "curated",
    },
    {
      id: "cur-p9",
      type: "photo",
      title: "Líder de Negocios Retrato",
      tags: ["leader", "founder", "portrait", "suit"],
      previewUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
      regularUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1920&q=90",
      author: "Ali Morshedlou",
      source: "curated",
    },
    {
      id: "cur-p10",
      type: "photo",
      title: "Mujer Ejecutiva & Pitch",
      tags: ["woman", "leader", "executive", "speaker"],
      previewUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=400&q=80",
      regularUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1920&q=90",
      author: "Christina @ wocintechchat.com",
      source: "curated",
    },
  ],
  vectors: [
    {
      id: "cur-v1",
      type: "vector",
      title: "Insignia de Crecimiento & Cohete",
      tags: ["rocket", "startup", "growth", "vector", "icon"],
      previewUrl: "https://cdn.pixabay.com/photo/2017/01/31/13/14/rocket-2024011_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2017/01/31/13/14/rocket-2024011_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2017/01/31/13/14/rocket-2024011_1280.png",
      author: "Pixabay Vectors",
      source: "curated",
    },
    {
      id: "cur-v2",
      type: "vector",
      title: "Gráfico de Barras & Tendencia",
      tags: ["chart", "bars", "analytics", "vector", "business"],
      previewUrl: "https://cdn.pixabay.com/photo/2016/11/27/21/42/stock-1863880_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2016/11/27/21/42/stock-1863880_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2016/11/27/21/42/stock-1863880_1280.png",
      author: "Pixabay Vectors",
      source: "curated",
    },
    {
      id: "cur-v3",
      type: "vector",
      title: "Escudo de Seguridad & Confianza",
      tags: ["shield", "security", "b2b", "trust", "badge"],
      previewUrl: "https://cdn.pixabay.com/photo/2016/03/31/14/37/check-1292787_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2016/03/31/14/37/check-1292787_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2016/03/31/14/37/check-1292787_1280.png",
      author: "Pixabay Vectors",
      source: "curated",
    },
    {
      id: "cur-v4",
      type: "vector",
      title: "Medalla Estrella de Oro",
      tags: ["medal", "gold", "star", "award", "authority"],
      previewUrl: "https://cdn.pixabay.com/photo/2016/12/17/18/51/sparks-1914166_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2016/12/17/18/51/sparks-1914166_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2016/12/17/18/51/sparks-1914166_1280.png",
      author: "Pixabay Vectors",
      source: "curated",
    },
    {
      id: "cur-v5",
      type: "vector",
      title: "Flecha de Avance Dinámica",
      tags: ["arrow", "next", "direction", "pointer"],
      previewUrl: "https://cdn.pixabay.com/photo/2016/03/31/18/22/arrows-1294246_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2016/03/31/18/22/arrows-1294246_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2016/03/31/18/22/arrows-1294246_1280.png",
      author: "Pixabay Vectors",
      source: "curated",
    },
    {
      id: "cur-v6",
      type: "vector",
      title: "Bombilla de Ideas & Innovación",
      tags: ["idea", "bulb", "innovation", "creativity"],
      previewUrl: "https://cdn.pixabay.com/photo/2017/01/31/14/14/light-bulb-2024467_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2017/01/31/14/14/light-bulb-2024467_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2017/01/31/14/14/light-bulb-2024467_1280.png",
      author: "Pixabay Vectors",
      source: "curated",
    },
  ],
  illustrations: [
    {
      id: "cur-i1",
      type: "illustration",
      title: "Análisis de Datos & Dashboard",
      tags: ["dashboard", "illustration", "analytics", "infographic"],
      previewUrl: "https://cdn.pixabay.com/photo/2018/05/18/15/30/web-design-3411373_640.jpg",
      regularUrl: "https://cdn.pixabay.com/photo/2018/05/18/15/30/web-design-3411373_1280.jpg",
      fullUrl: "https://cdn.pixabay.com/photo/2018/05/18/15/30/web-design-3411373_1280.jpg",
      author: "Pixabay Graphics",
      source: "curated",
    },
    {
      id: "cur-i2",
      type: "illustration",
      title: "Trabajo Remoto & Conexión Global",
      tags: ["remote", "work", "global", "networking"],
      previewUrl: "https://cdn.pixabay.com/photo/2020/05/18/16/17/social-media-5187243_640.png",
      regularUrl: "https://cdn.pixabay.com/photo/2020/05/18/16/17/social-media-5187243_1280.png",
      fullUrl: "https://cdn.pixabay.com/photo/2020/05/18/16/17/social-media-5187243_1280.png",
      author: "Pixabay Graphics",
      source: "curated",
    },
    {
      id: "cur-i3",
      type: "illustration",
      title: "Inteligencia Artificial & Cerebro Tech",
      tags: ["ai", "brain", "technology", "machine learning"],
      previewUrl: "https://cdn.pixabay.com/photo/2021/08/04/13/06/software-developer-6521720_640.jpg",
      regularUrl: "https://cdn.pixabay.com/photo/2021/08/04/13/06/software-developer-6521720_1280.jpg",
      fullUrl: "https://cdn.pixabay.com/photo/2021/08/04/13/06/software-developer-6521720_1280.jpg",
      author: "Pixabay Graphics",
      source: "curated",
    },
  ],
  backgrounds: [
    {
      id: "cur-b1",
      type: "background",
      title: "Degradado Azul Oscuro B2B",
      tags: ["gradient", "blue", "dark", "minimal", "texture"],
      previewUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=90",
      author: "Gradient Studio",
      source: "curated",
    },
    {
      id: "cur-b2",
      type: "background",
      title: "Textura Dark Cyberpunk Sutil",
      tags: ["dark", "abstract", "modern", "grid"],
      previewUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=90",
      author: "Milad Fakurian",
      source: "curated",
    },
    {
      id: "cur-b3",
      type: "background",
      title: "Ondas Abstractas Índigo",
      tags: ["indigo", "waves", "abstract", "fluid"],
      previewUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=90",
      author: "Eva Blue",
      source: "curated",
    },
    {
      id: "cur-b4",
      type: "background",
      title: "Malla 3D Geométrica Minimal",
      tags: ["mesh", "3d", "geometric", "clean"],
      previewUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=70",
      regularUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=85",
      fullUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=90",
      author: "Lorenzo Herrera",
      source: "curated",
    },
  ],
  videos: [
    {
      id: "cur-vid1",
      type: "video",
      title: "Partículas Tecnológicas B2B",
      tags: ["particles", "technology", "loop", "motion"],
      previewUrl: "https://cdn.pixabay.com/photo/2016/11/29/06/18/network-1867761_640.jpg",
      regularUrl: "https://cdn.pixabay.com/photo/2016/11/29/06/18/network-1867761_1280.jpg",
      fullUrl: "https://cdn.pixabay.com/photo/2016/11/29/06/18/network-1867761_1280.jpg",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      author: "Pixabay Motion",
      source: "curated",
    },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const testMode = searchParams.get("test") === "true";
  const userKey =
    process.env.PIXABAY_API_KEY ||
    req.headers.get("x-pixabay-key") ||
    searchParams.get("key") ||
    "58409897-b3c110054005d6f3e0f80eabc";

  // Endpoint de test de conexión para validar la clave ingresada
  if (testMode) {
    if (!userKey) {
      return NextResponse.json({
        ok: false,
        message: "No se proporcionó API Key de Pixabay",
      }, { status: 400 });
    }

    try {
      const testRes = await fetch(`https://pixabay.com/api/?key=${userKey}&per_page=3&safesearch=true`);
      if (!testRes.ok) {
        const text = await testRes.text();
        return NextResponse.json({
          ok: false,
          status: testRes.status,
          message: text || "API Key inválida o cuota superada en Pixabay",
        }, { status: 401 });
      }
      const data = await testRes.json();
      return NextResponse.json({
        ok: true,
        message: "¡Conexión exitosa con Pixabay!",
        totalHits: data.totalHits,
      });
    } catch (err: any) {
      return NextResponse.json({
        ok: false,
        message: err.message || "Error al conectar con los servidores de Pixabay",
      }, { status: 500 });
    }
  }

  const resource = searchParams.get("resource") || "photos"; // photos | vectors | illustrations | backgrounds | videos
  const query = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const orientation = searchParams.get("orientation") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = Math.min(60, Math.max(10, parseInt(searchParams.get("per_page") || "28", 10)));

  // Si no hay API Key configurada, devolvemos el catálogo curado enriquecido
  if (!userKey) {
    const list = CURATED_FALLBACK_RESOURCES[resource] || CURATED_FALLBACK_RESOURCES.photos;
    let filtered = [...list];

    if (query) {
      const qLower = query.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(qLower) ||
          item.tags.some((t) => t.toLowerCase().includes(qLower))
      );
    }

    return NextResponse.json({
      configured: false,
      source: "curated",
      message: "Pixabay API Key no detectada. Mostrando recursos de catálogo base.",
      total: filtered.length,
      page: 1,
      per_page: perPage,
      items: filtered,
    });
  }

  // Si hay API Key, consultamos la API oficial de Pixabay en tiempo real
  try {
    let pixabayUrl = "";
    const isVideo = resource === "videos";

    if (isVideo) {
      const params = new URLSearchParams({
        key: userKey,
        q: query || "business technology abstract",
        safesearch: "true",
        per_page: perPage.toString(),
        page: page.toString(),
      });
      if (category) params.append("category", category);
      pixabayUrl = `https://pixabay.com/api/videos/?${params.toString()}`;
    } else {
      let imageType = "photo";
      if (resource === "vectors") imageType = "vector";
      else if (resource === "illustrations") imageType = "illustration";
      else if (resource === "backgrounds") imageType = "all";

      const effectiveQuery = resource === "backgrounds" && !query ? "background texture dark abstract" : query;

      const params = new URLSearchParams({
        key: userKey,
        q: effectiveQuery,
        image_type: imageType,
        safesearch: "true",
        per_page: perPage.toString(),
        page: page.toString(),
      });

      if (resource === "backgrounds" && !category) {
        params.append("category", "backgrounds");
      } else if (category && category !== "all") {
        params.append("category", category);
      }

      if (orientation && orientation !== "all") {
        params.append("orientation", orientation);
      }

      // Si la búsqueda contiene caracteres españoles, activamos lang=es
      if (/[áéíóúñÁÉÍÓÚÑ]/.test(effectiveQuery)) {
        params.append("lang", "es");
      }

      pixabayUrl = `https://pixabay.com/api/?${params.toString()}`;
    }

    const pixabayRes = await fetch(pixabayUrl, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "InHubFlow-Social-Selling-Suite/2.4",
      },
    });

    if (!pixabayRes.ok) {
      const errText = await pixabayRes.text();
      console.warn("Pixabay API error response:", pixabayRes.status, errText);
      // Fallback a los recursos curados en caso de cuota excedida
      const fallbackList = CURATED_FALLBACK_RESOURCES[resource] || CURATED_FALLBACK_RESOURCES.photos;
      return NextResponse.json({
        configured: true,
        source: "fallback",
        warning: `Pixabay API respondió con status ${pixabayRes.status}. Mostrando recursos alternativos.`,
        total: fallbackList.length,
        items: fallbackList,
      });
    }

    const data = await pixabayRes.json();

    if (isVideo) {
      const seenVideoIds = new Set<string | number>();
      const normalizedVideos: PixabayNormalizedItem[] = [];
      for (const hit of data.hits || []) {
        if (seenVideoIds.has(hit.id)) continue;
        seenVideoIds.add(hit.id);
        const videoFiles = hit.videos || {};
        const chosen = videoFiles.medium || videoFiles.large || videoFiles.small || videoFiles.tiny || {};
        const thumb =
          chosen.thumbnail ||
          videoFiles.tiny?.thumbnail ||
          videoFiles.small?.thumbnail ||
          videoFiles.medium?.thumbnail ||
          (hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg` : "");
        normalizedVideos.push({
          id: hit.id,
          type: "video",
          title: (hit.tags || "Video corporativo").split(",")[0].trim(),
          tags: (hit.tags || "").split(",").map((t: string) => t.trim()),
          previewUrl: thumb,
          regularUrl: thumb,
          fullUrl: chosen.thumbnail || thumb,
          videoUrl: chosen.url || "",
          duration: hit.duration || 10,
          width: chosen.width || 1280,
          height: chosen.height || 720,
          author: hit.user || "Pixabay Creator",
          source: "pixabay",
        });
      }

      return NextResponse.json({
        configured: true,
        source: "pixabay",
        total: data.totalHits || data.total || normalizedVideos.length,
        page,
        per_page: perPage,
        items: normalizedVideos,
      });
    }

    const seenImageIds = new Set<string | number>();
    const normalizedImages: PixabayNormalizedItem[] = [];
    for (const hit of data.hits || []) {
      if (seenImageIds.has(hit.id)) continue;
      seenImageIds.add(hit.id);
      let itemType: "photo" | "vector" | "illustration" | "background" = "photo";
      if (resource === "vectors" || hit.type === "vector") itemType = "vector";
      else if (resource === "illustrations" || hit.type === "illustration") itemType = "illustration";
      else if (resource === "backgrounds") itemType = "background";

      normalizedImages.push({
        id: hit.id,
        type: itemType,
        title: (hit.tags || "Recurso Pixabay").split(",")[0].trim(),
        tags: (hit.tags || "").split(",").map((t: string) => t.trim()),
        previewUrl: hit.webformatURL || hit.previewURL,
        regularUrl: hit.largeImageURL || hit.webformatURL,
        fullUrl: hit.largeImageURL || hit.webformatURL,
        width: hit.imageWidth,
        height: hit.imageHeight,
        author: hit.user || "Pixabay Artist",
        source: "pixabay",
      });
    }

    return NextResponse.json({
      configured: true,
      source: "pixabay",
      total: data.totalHits || normalizedImages.length,
      page,
      per_page: perPage,
      items: normalizedImages,
    });
  } catch (err: any) {
    console.error("Error connecting to Pixabay:", err);
    const fallbackList = CURATED_FALLBACK_RESOURCES[resource] || CURATED_FALLBACK_RESOURCES.photos;
    return NextResponse.json({
      configured: true,
      source: "fallback",
      error: err.message || "Error al conectar con Pixabay",
      total: fallbackList.length,
      items: fallbackList,
    });
  }
}
