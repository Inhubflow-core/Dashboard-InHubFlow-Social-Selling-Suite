import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords = (body.keywords || "Social Selling").trim();
    let requestedAccountId = body.account_id;
    const filterZero = body.filter_zero !== false;
    const sortBy = body.sort_by || "RELEVANCE";
    const datePosted = body.date_posted || "PAST_MONTH";
    const requestLimit = Math.min(50, Math.max(25, body.limit || 35));

    // 1. Obtener estado en vivo de las cuentas directamente de Unipile
    let liveAccounts: any[] = [];
    try {
      const res = await unipile.listAccounts();
      liveAccounts = res.items || [];
    } catch (err) {
      console.warn("[Posts Search] Error consultando cuentas Unipile:", err);
    }

    // Identificar cuenta activa y saludable (status === "OK" o fuente "OK")
    const isAccountHealthy = (acc: any) => {
      if (!acc) return false;
      if (acc.status === "OK" || acc.status === "CONNECTED") return true;
      if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK")) return true;
      return false;
    };

    let targetAccountId = requestedAccountId;
    let selectedAccountObj = liveAccounts.find((a) => a.id === targetAccountId);

    // Si la cuenta solicitada no existe en Unipile o no está saludable, buscar una alternativa saludable
    if (!selectedAccountObj || !isAccountHealthy(selectedAccountObj)) {
      const healthyLive = liveAccounts.find(isAccountHealthy);
      if (healthyLive) {
        targetAccountId = healthyLive.id;
        selectedAccountObj = healthyLive;
      }
    }

    // Fallback secundario con cuentas almacenadas localmente
    if (!targetAccountId) {
      const stored = getStoredAccounts();
      const healthyStored = stored.find((a) => a.status === "OK");
      if (healthyStored) targetAccountId = healthyStored.id;
    }

    if (!targetAccountId) {
      return NextResponse.json(
        {
          error: "No hay cuentas de LinkedIn conectadas y con sesión activa (OK) para realizar la búsqueda.",
          items: [],
        },
        { status: 400 }
      );
    }

    // Preparar parámetros de búsqueda avanzada
    const searchParams: any = {
      account_id: targetAccountId,
      category: "posts",
      keywords,
      limit: requestLimit,
      sort_by: sortBy,
    };

    if (datePosted && datePosted !== "ANY") {
      searchParams.date_posted = datePosted;
    }

    // Ejecutar búsqueda con protección y reintento resiliente
    let response;
    try {
      response = await unipile.searchLinkedIn(searchParams);
    } catch (err: any) {
      console.warn(`[Posts Search] Intento inicial con cuenta ${targetAccountId} falló:`, err?.message || err);
      // Reintento 1: Parámetros básicos sin filtros temporales si la API los rechaza
      try {
        response = await unipile.searchLinkedIn({
          account_id: targetAccountId,
          category: "posts",
          keywords,
          limit: requestLimit,
        });
      } catch (innerErr) {
        // Reintento 2: Probar con otra cuenta saludable de Unipile
        const alternative = liveAccounts.find((a) => a.id !== targetAccountId && isAccountHealthy(a));
        if (alternative) {
          console.log(`[Posts Search] Reintentando con cuenta alternativa saludable: ${alternative.name} (${alternative.id})`);
          targetAccountId = alternative.id;
          selectedAccountObj = alternative;
          response = await unipile.searchLinkedIn({
            account_id: targetAccountId,
            category: "posts",
            keywords,
            limit: requestLimit,
          });
        } else {
          throw innerErr;
        }
      }
    }

    const rawItems = response?.items || [];

    // Normalizar items y calcular métricas de viralidad ponderadas
    const normalized = rawItems.map((item: any, idx: number) => {
      const text = item.text || "";
      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const hook = lines[0] || "Publicación destacada en LinkedIn";

      // Extraer imagen o adjunto multimedia si existe
      let mediaUrl: string | null = null;
      if (Array.isArray(item.attachments) && item.attachments.length > 0) {
        for (const att of item.attachments) {
          if (typeof att === "string" && att.startsWith("http")) {
            mediaUrl = att;
            break;
          } else if (att && typeof att === "object") {
            const found =
              att.url ||
              att.preview_url ||
              att.image_url ||
              att.media_url ||
              att.thumbnail_url ||
              att.file_url ||
              att.picture_url ||
              att.src ||
              null;
            if (found && typeof found === "string" && found.startsWith("http")) {
              mediaUrl = found;
              break;
            }
          }
        }
      }

      if (!mediaUrl) {
        const directMedia =
          item.image_url ||
          item.media_url ||
          item.thumbnail_url ||
          item.article?.thumbnail_url ||
          item.article?.image_url ||
          item.media?.url ||
          null;
        if (directMedia && typeof directMedia === "string" && directMedia.startsWith("http")) {
          mediaUrl = directMedia;
        }
      }

      // Detectar formato técnico real (Carrusel / Imagen / Video / Solo Texto)
      const lower = text.toLowerCase();
      let format: "text" | "image" | "carousel" | "video" = "text";
      let isCarousel = false;
      let isVideo = false;
      let isImage = false;

      // A. Inspeccionar adjuntos de Unipile
      const attachments = Array.isArray(item.attachments) ? item.attachments : [];

      // Si tiene múltiples adjuntos en LinkedIn -> Carrusel interactivo / Galería de slides
      if (attachments.length > 1) {
        isCarousel = true;
      }

      // B. Inspeccionar tipos de adjunto y mimetypes de Unipile
      for (const att of attachments) {
        const attType = String(att?.type || "").toUpperCase();
        const mime = String(att?.mimetype || att?.mime_type || "").toLowerCase();
        const urlStr = String(att?.url || att?.file_url || "").toLowerCase();
        const titleStr = String(att?.title || att?.name || "").toLowerCase();

        // LinkedIn procesa los Carruseles nativamente como DOCUMENT (PDF o presentación de diapositivas)
        if (
          attType === "DOCUMENT" ||
          attType === "CAROUSEL" ||
          attType === "PRESENTATION" ||
          mime.includes("pdf") ||
          mime.includes("document") ||
          mime.includes("presentation") ||
          urlStr.endsWith(".pdf") ||
          urlStr.includes("/pdf/") ||
          titleStr.endsWith(".pdf") ||
          titleStr.endsWith(".pptx") ||
          titleStr.endsWith(".ppt") ||
          (att?.page_count && Number(att.page_count) > 1) ||
          (att?.pages && Number(att.pages) > 1)
        ) {
          isCarousel = true;
          break;
        }

        // Detección de Video
        if (
          attType === "VIDEO" ||
          mime.startsWith("video/") ||
          urlStr.endsWith(".mp4") ||
          urlStr.includes("/video/")
        ) {
          isVideo = true;
        }

        // Detección de Imagen
        if (
          attType === "IMAGE" ||
          attType === "PHOTO" ||
          mime.startsWith("image/") ||
          att?.preview_url ||
          att?.image_url
        ) {
          isImage = true;
        }
      }

      // C. Inspeccionar propiedades directas en el objeto raíz de Unipile
      const postType = String(item.post_type || item.media_type || item.type || "").toUpperCase();
      if (
        postType === "DOCUMENT" ||
        postType === "CAROUSEL" ||
        item.document ||
        item.document_url ||
        item.is_carousel ||
        item.is_document
      ) {
        isCarousel = true;
      } else if (postType === "VIDEO" || item.video_url || item.video) {
        isVideo = true;
      }

      // D. Heurística lingüística multilingüe (Inglés, Español y Portugués)
      // Los creadores de carruseles usan activadores para incitar a pasar diapositivas
      const hasCarouselKeywords =
        lower.includes("swipe") ||
        lower.includes("carousel") ||
        lower.includes("carrusel") ||
        lower.includes("carrossel") ||
        lower.includes("desliza") ||
        lower.includes("deslize") ||
        lower.includes("arraste") ||
        lower.includes("slide") ||
        lower.includes("slides") ||
        lower.includes("diapositiva") ||
        lower.includes("diapositivas") ||
        lower.includes("pdf adjunto") ||
        lower.includes("pdf below") ||
        lower.includes("full pdf") ||
        lower.includes("document below") ||
        lower.includes("download the guide") ||
        lower.includes("playbook");

      if (hasCarouselKeywords && (attachments.length > 0 || mediaUrl || isImage)) {
        isCarousel = true;
      } else if (hasCarouselKeywords && !isCarousel && !isVideo) {
        // Si no tiene adjunto extraído pero el texto es explícitamente un carrusel
        isCarousel = true;
      }

      // E. Decisión final del Formato con jerarquía estricta
      if (isCarousel) {
        format = "carousel";
      } else if (isVideo) {
        format = "video";
      } else if (isImage || mediaUrl || attachments.length > 0 || lower.includes("imagen") || lower.includes("infografía") || lower.includes("infographic") || lower.includes("photo")) {
        format = "image";
      } else {
        format = "text";
      }

      const hasMedia = Boolean(mediaUrl || attachments.length > 0 || format !== "text");

      const likes = item.reaction_counter ?? 0;
      const comments = item.comment_counter ?? 0;
      const shares = item.repost_counter ?? 0;

      // Algoritmo Ponderado de Viralidad InHubFlow:
      // - Likes (x1): Reacciones de lectura rápida en el feed
      // - Comentarios (x3.5): Retención y distribución exponencial por algoritmo de LinkedIn
      // - Reposts (x5): Máxima amplificación orgánica y difusión externa
      const viralityScore = Math.round((likes * 1) + (comments * 3.5) + (shares * 5));

      // Asignación de Tier y Badge de Viralidad (Estrictamente los 3 tipos oficiales requeridos)
      let viralityTier: "mega" | "high" | "trending" = "trending";
      let viralityBadge = "En Tendencia 🔥";

      if (viralityScore >= 100 || (likes >= 50 && comments >= 15)) {
        viralityTier = "mega";
        viralityBadge = "Mega Viral 🔥🔥🔥";
      } else if (viralityScore >= 35 || (likes >= 20 && comments >= 5) || comments >= 8) {
        viralityTier = "high";
        viralityBadge = "Alta Tracción 🔥🔥";
      } else {
        viralityTier = "trending";
        viralityBadge = "En Tendencia 🔥";
      }

      // Ratio de interacción calculado dinámicamente
      const totalInteractions = likes + comments + shares;
      const ratio = totalInteractions > 0
        ? `${Math.min(25, Math.max(1.2, parseFloat((4.0 + Math.log10(totalInteractions + 1) * 3.5).toFixed(1))))}%`
        : "0.0%";

      return {
        id: item.id || `live-post-${idx}`,
        author: item.author?.name || "Líder de Industria B2B",
        authorHeadline: item.author?.headline || "Especialista en LinkedIn & B2B",
        authorAvatar: item.author?.picture_url || null,
        publicIdentifier: item.author?.public_identifier || null,
        publishedDate: item.date || "Reciente",
        topic: keywords,
        format,
        hook,
        fullContent: text,
        likes,
        comments,
        shares,
        engagementRatio: ratio,
        viralityScore,
        viralityBadge,
        viralityTier,
        mediaUrl: mediaUrl || undefined,
        hasMedia,
        socialId: item.social_id || null,
        linkedinUrl: item.social_id ? `https://www.linkedin.com/feed/update/${item.social_id}` : null,
        isLive: true,
      };
    });

    // Lista de autores corporativos/institucionales a omitir de los resultados
    const EXCLUDED_AUTHORS = [
      "linkedin for marketing",
      "linkedin marketing solutions",
      "linkedin marketing",
      "linkedin for business",
      "linkedin business",
    ];

    const isExcludedAuthorPost = (item: any) => {
      const authorLower = String(item.author || "").toLowerCase();
      const publicIdLower = String(item.publicIdentifier || "").toLowerCase();
      return EXCLUDED_AUTHORS.some(
        (term) => authorLower.includes(term) || publicIdLower.includes(term)
      );
    };

    // 2. Filtro de Exclusión de Cuentas Corporativas, Anti-Cero y Calidad de Contenido
    let nonCorporatePosts = normalized.filter((item) => !isExcludedAuthorPost(item));
    let qualifiedPosts = nonCorporatePosts;

    if (filterZero) {
      qualifiedPosts = nonCorporatePosts.filter((item) => {
        const total = item.likes + item.comments + item.shares;
        // Descartar publicaciones sin tracción (0 interacciones)
        if (total === 0) return false;

        // Descartar ofertas de empleo que no aportan valor ni estructura viral
        const lower = item.fullContent.toLowerCase();
        const isJobOffer =
          lower.startsWith("we're hiring") ||
          lower.startsWith("hiring!") ||
          lower.startsWith("estamos contratando") ||
          lower.includes("we are looking for a") ||
          lower.includes("oferta de empleo");
        if (isJobOffer && total < 5) return false;

        return true;
      });

      // Si tras el filtro estricto la lista quedó vacía, mostrar los encontrados (respetando la exclusión)
      if (qualifiedPosts.length === 0 && nonCorporatePosts.length > 0) {
        qualifiedPosts = nonCorporatePosts;
      }
    }

    // 3. Ordenación Estricta Descendente por Score de Viralidad (Lo más viral siempre primero)
    qualifiedPosts.sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0));

    // 4. Limitar estrictamente a los 12 mejores posts (Top 12)
    const top12Posts = qualifiedPosts.slice(0, 12);

    return NextResponse.json({
      success: true,
      keywords,
      accountId: targetAccountId,
      accountName: selectedAccountObj?.name || "LinkedIn Account",
      totalFound: normalized.length,
      count: top12Posts.length,
      filteredOutZeroCount: normalized.length - qualifiedPosts.length,
      items: top12Posts,
    });
  } catch (error: any) {
    console.error("[Posts Search API] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Error al buscar publicaciones en LinkedIn",
        items: [],
      },
      { status: 500 }
    );
  }
}

