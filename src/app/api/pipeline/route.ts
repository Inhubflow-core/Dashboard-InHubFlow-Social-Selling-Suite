import { getSocialSellingDb } from "@/lib/persistence/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getSocialSellingDb();
    const rows = db
      .prepare("SELECT payload_json FROM pipeline_deals_v2 ORDER BY updated_at DESC")
      .all() as Array<{ payload_json: string }>;

    const deals = rows
      .map((r) => {
        try {
          return JSON.parse(r.payload_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, deals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar pipeline";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const list = Array.isArray(body.deals)
      ? body.deals
      : body.deal && typeof body.deal === "object"
        ? [body.deal]
        : null;

    if (!list) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'deals[]' o 'deal'." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const now = new Date().toISOString();

    const tx = db.transaction((items: Array<Record<string, unknown>>) => {
      if (Array.isArray(body.deals)) {
        db.prepare("DELETE FROM pipeline_deals_v2").run();
      }
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO pipeline_deals_v2 (
          id, lead_id, stage_id, updated_at, payload_json
        ) VALUES (?, ?, ?, ?, ?)
      `);
      for (const deal of items) {
        if (!deal || typeof deal.id !== "string" || !deal.id.trim()) continue;
        stmt.run(
          deal.id,
          typeof deal.leadId === "string" ? deal.leadId : null,
          String(deal.stageId || "lead_captured"),
          now,
          JSON.stringify(deal)
        );
      }
    });

    tx(list);
    return NextResponse.json({ ok: true, count: list.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar pipeline";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Se requiere 'id'." }, { status: 400 });
    }
    const db = getSocialSellingDb();
    db.prepare("DELETE FROM pipeline_deals_v2 WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar deal";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
