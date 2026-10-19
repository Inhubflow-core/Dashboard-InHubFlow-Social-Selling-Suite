import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, attachments } = body;
    let requestedAccountId = body.account_id;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "El cuerpo del post (texto) es obligatorio para publicar en LinkedIn." },
        { status: 400 }
      );
    }

    // 1. Obtener estado en vivo de las cuentas en Unipile
    let liveAccounts: any[] = [];
    try {
      const res = await unipile.listAccounts();
      liveAccounts = res.items || [];
    } catch (err) {
      console.warn("[Publish Post] Error consultando cuentas Unipile:", err);
    }

    const isAccountHealthy = (acc: any) => {
      if (!acc) return false;
      if (acc.status === "OK" || acc.status === "CONNECTED") return true;
      if (Array.isArray(acc.sources) && acc.sources.some((s: any) => s.status === "OK")) return true;
      return false;
    };

    let targetAccountId = requestedAccountId;
    let selectedAccountObj = liveAccounts.find((a) => a.id === targetAccountId);

    if (!selectedAccountObj || !isAccountHealthy(selectedAccountObj)) {
      const healthyLive = liveAccounts.find(isAccountHealthy);
      if (healthyLive) {
        targetAccountId = healthyLive.id;
        selectedAccountObj = healthyLive;
      }
    }

    if (!targetAccountId) {
      const stored = getStoredAccounts();
      const healthyStored = stored.find((a) => a.status === "OK");
      if (healthyStored) targetAccountId = healthyStored.id;
    }

    if (!targetAccountId) {
      return NextResponse.json(
        { error: "No hay una cuenta de LinkedIn conectada y activa (OK) para publicar." },
        { status: 400 }
      );
    }

    // Despachar publicación a LinkedIn a través de Unipile
    const result = await unipile.createPost({
      account_id: targetAccountId,
      text: text.trim(),
      attachments,
    });

    const postId = result.post_id || result.id || `up_post_${Date.now()}`;

    return NextResponse.json({
      success: true,
      postId,
      accountId: targetAccountId,
      accountName: selectedAccountObj?.name || "LinkedIn Account",
      publishedAt: new Date().toISOString(),
      message: "Publicación emitida exitosamente en LinkedIn.",
    });
  } catch (error: any) {
    console.error("[Publish Post API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al emitir publicación en LinkedIn a través del motor InHubFlow." },
      { status: 500 }
    );
  }
}
