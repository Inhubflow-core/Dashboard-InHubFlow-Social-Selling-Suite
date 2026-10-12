import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const keywords = (body.keywords || "Social Selling").trim();
    let accountId = body.account_id;

    // Si no se especifica cuenta, buscar la primera cuenta activa de Unipile
    if (!accountId) {
      try {
        const liveAccounts = await unipile.listAccounts();
        const activeAcc = liveAccounts.items?.find((a) => a.status === "OK");
        if (activeAcc) {
          accountId = activeAcc.id;
        }
      } catch (err) {
        console.warn("[Posts Search] Error consultando cuentas activas en vivo:", err);
      }
    }

    // Fallback con cuentas almacenadas si sigue sin accountId
    if (!accountId) {
      const stored = getStoredAccounts();
      const active = stored.find((a) => a.status === "OK");
      if (active) accountId = active.id;
    }

    if (!accountId) {
      return NextResponse.json(
        {
          error: "No hay cuentas de LinkedIn conectadas y activas para realizar la búsqueda.",
          items: [],
        },
        { status: 400 }
      );
    }

    const limit = Math.min(25, Math.max(1, body.limit || 12));

    const response = await unipile.searchLinkedIn({
      account_id: accountId,
      category: "posts",
      keywords,
      limit,
    });

    const rawItems = response.items || [];

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
      accountId,
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
