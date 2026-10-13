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

      // Detectar formato
      const lower = text.toLowerCase();
      let format: "text" | "image" | "carousel" = "text";
      if (lower.includes("desliza") || lower.includes("carrusel") || lower.includes("slide") || lower.includes("pdf")) {
        format = "carousel";
      } else if (item.attachments?.length > 0 || lower.includes("imagen") || lower.includes("infografía") || lower.includes("foto")) {
        format = "image";
      }

      const likes = item.reaction_counter ?? 0;
      const comments = item.comment_counter ?? 0;
      const shares = item.repost_counter ?? 0;

      // Algoritmo Ponderado de Viralidad InHubFlow:
      // - Likes (x1): Reacciones de lectura rápida en el feed
      // - Comentarios (x3.5): Retención y distribución exponencial por algoritmo de LinkedIn
      // - Reposts (x5): Máxima amplificación orgánica y difusión externa
      const viralityScore = Math.round((likes * 1) + (comments * 3.5) + (shares * 5));

      // Asignación de Tier y Badge de Viralidad
      let viralityTier: "mega" | "high" | "discussed" | "growing" | "emerging" = "emerging";
      let viralityBadge = "📈 En Crecimiento";

      if (viralityScore >= 100 || (likes >= 50 && comments >= 15)) {
        viralityTier = "mega";
        viralityBadge = "🚀 Mega Viral";
      } else if (viralityScore >= 35 || (likes >= 20 && comments >= 5)) {
        viralityTier = "high";
        viralityBadge = "🔥 Alta Tracción";
      } else if (comments >= 8) {
        viralityTier = "discussed";
        viralityBadge = "💬 Gran Debate";
      } else if (viralityScore >= 10 || (likes + comments + shares) >= 4) {
        viralityTier = "growing";
        viralityBadge = "⭐ En Tendencia";
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
        socialId: item.social_id || null,
        linkedinUrl: item.social_id ? `https://www.linkedin.com/feed/update/${item.social_id}` : null,
        isLive: true,
      };
    });

    // 2. Filtro Anti-Cero y Calidad de Contenido
    let qualifiedPosts = normalized;
    if (filterZero) {
      qualifiedPosts = normalized.filter((item) => {
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

      // Si tras el filtro estricto la lista quedó vacía, mostrar los encontrados para no dejar la pantalla en blanco
      if (qualifiedPosts.length === 0 && normalized.length > 0) {
        qualifiedPosts = normalized;
      }
    }

    // 3. Ordenación Estricta Descendente por Score de Viralidad (Lo más viral siempre primero)
    qualifiedPosts.sort((a, b) => (b.viralityScore ?? 0) - (a.viralityScore ?? 0));

    return NextResponse.json({
      success: true,
      keywords,
      accountId: targetAccountId,
      accountName: selectedAccountObj?.name || "LinkedIn Account",
      totalFound: normalized.length,
      count: qualifiedPosts.length,
      filteredOutZeroCount: normalized.length - qualifiedPosts.length,
      items: qualifiedPosts,
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

