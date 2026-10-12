import { unipile } from "@/lib/unipile/client";
import { getStoredAccounts } from "@/lib/unipile/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, attachments } = body;
    let accountId = body.account_id;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "El cuerpo del post (texto) es obligatorio para publicar en LinkedIn." },
        { status: 400 }
      );
    }

    // Resolver cuenta de LinkedIn activa si no se proporcionó
    if (!accountId) {
      try {
        const liveAccounts = await unipile.listAccounts();
        const activeAcc = liveAccounts.items?.find((a) => a.status === "OK");
        if (activeAcc) accountId = activeAcc.id;
      } catch (err) {
        console.warn("[Publish Post] Error consultando cuentas en vivo:", err);
      }
    }

    if (!accountId) {
      const stored = getStoredAccounts();
      const active = stored.find((a) => a.status === "OK");
      if (active) accountId = active.id;
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "No hay una cuenta de LinkedIn conectada y activa para publicar." },
        { status: 400 }
      );
    }

    // Despachar publicación a LinkedIn a través de Unipile
    const result = await unipile.createPost({
      account_id: accountId,
      text: text.trim(),
      attachments,
    });

    const postId = result.post_id || result.id || `up_post_${Date.now()}`;

    return NextResponse.json({
      success: true,
      postId,
      accountId,
      publishedAt: new Date().toISOString(),
      message: "Publicación emitida exitosamente en LinkedIn.",
    });
  } catch (error: any) {
    console.error("[Publish Post API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al emitir publicación en LinkedIn a través de Unipile." },
      { status: 500 }
    );
  }
}
