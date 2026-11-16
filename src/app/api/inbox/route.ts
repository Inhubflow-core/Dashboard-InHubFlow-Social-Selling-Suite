import { getSocialSellingDb } from "@/lib/persistence/db";
import type { ChatConversation } from "@/lib/inbox/types";
import { NextRequest, NextResponse } from "next/server";

function rowToConversation(row: any): ChatConversation {
  let metadata: Record<string, any> = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }
  return {
    ...metadata,
    id: row.id,
    leadId: metadata.leadId ?? row.lead_id ?? "",
    leadName: metadata.leadName ?? row.lead_name,
    unipileChatId: metadata.unipileChatId ?? row.unipile_chat_id ?? undefined,
    crmStageId: metadata.crmStageId ?? row.crm_stage_id ?? "in_sequence",
    unread: Boolean(metadata.unread ?? row.unread),
  } as ChatConversation;
}

export async function GET() {
  try {
    const db = getSocialSellingDb();
    const rows = db
      .prepare("SELECT * FROM inbox_conversations_v2 ORDER BY updated_at DESC")
      .all();

    return NextResponse.json({
      ok: true,
      conversations: rows.map(rowToConversation),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar inbox";
    console.error("[Inbox API GET] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incoming: ChatConversation[] = Array.isArray(body.conversations)
      ? body.conversations
      : body.conversation
      ? [body.conversation]
      : [];

    if (incoming.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'conversation' o 'conversations'." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const nowIso = new Date().toISOString();
    const upsertStmt = db.prepare(`
      INSERT OR REPLACE INTO inbox_conversations_v2 (
        id, lead_id, lead_name, unipile_chat_id, crm_stage_id, unread, updated_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let synced = 0;
    const tx = db.transaction((items: ChatConversation[]) => {
      for (const conv of items) {
        if (!conv || typeof conv.id !== "string" || !conv.id.trim()) continue;
        upsertStmt.run(
          conv.id.trim(),
          conv.leadId || "",
          conv.leadName || "Contacto",
          conv.unipileChatId || null,
          conv.crmStageId || "in_sequence",
          conv.unread ? 1 : 0,
          nowIso,
          JSON.stringify(conv)
        );
        synced += 1;
      }
    });

    tx(incoming);

    return NextResponse.json({ ok: true, synced });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar inbox";
    console.error("[Inbox API POST] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
