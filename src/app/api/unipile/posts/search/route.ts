import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords = (body.keywords || "Social Selling").trim();
    let requestedAccountId = body.account_id;

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

    const limit = Math.min(25, Math.max(1, body.limit || 12));

    // Ejecutar búsqueda con protección y reintento
    let response;
    try {
      response = await unipile.searchLinkedIn({
        account_id: targetAccountId,
        category: "posts",
        keywords,
        limit,
      });
    } catch (err: any) {
      console.warn(`[Posts Search] Error con cuenta ${targetAccountId}:`, err?.message || err);
      // Si falló por cuenta no encontrada o desconectada, intentar con otra cuenta saludable de Unipile
      const alternative = liveAccounts.find((a) => a.id !== targetAccountId && isAccountHealthy(a));
      if (alternative) {
        console.log(`[Posts Search] Reintentando con cuenta alternativa saludable: ${alternative.name} (${alternative.id})`);
        targetAccountId = alternative.id;
        selectedAccountObj = alternative;
        response = await unipile.searchLinkedIn({
          account_id: targetAccountId,
          category: "posts",
          keywords,
          limit,
        });
      } else {
        throw err;
      }
    }

    const rawItems = response?.items || [];

    // Normalizar items para el frontend del Radar Viral
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

      // Calcular ratio de interacción estimado
      const totalInteractions = likes + comments + shares;
      const ratio = totalInteractions > 0 ? `${Math.min(15, parseFloat((totalInteractions / 12).toFixed(1)))}%` : "5.4%";

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
        socialId: item.social_id || null,
        linkedinUrl: item.social_id ? `https://www.linkedin.com/feed/update/${item.social_id}` : null,
        isLive: true,
      };
    });

    return NextResponse.json({
      success: true,
      keywords,
      accountId: targetAccountId,
      accountName: selectedAccountObj?.name || "LinkedIn Account",
      count: normalized.length,
      items: normalized,
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
