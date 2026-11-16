import { getSocialSellingDb } from "@/lib/persistence/db";
import type { LinearSequenceCampaign } from "@/lib/campaigns/types";
import { NextRequest, NextResponse } from "next/server";

function rowToLinearCampaign(row: any): LinearSequenceCampaign {
  let metadata: Record<string, any> = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }
  return {
    ...metadata,
    id: row.id,
    name: metadata.name ?? row.name,
    code: metadata.code ?? row.code,
    status: metadata.status ?? row.status ?? "active",
    createdAt: metadata.createdAt ?? row.created_at,
    updatedAt: metadata.updatedAt ?? row.updated_at,
  } as LinearSequenceCampaign;
}

export async function GET() {
  try {
    const db = getSocialSellingDb();
    const rows = db
      .prepare("SELECT * FROM linear_campaigns ORDER BY code ASC")
      .all();

    return NextResponse.json({
      ok: true,
      campaigns: rows.map(rowToLinearCampaign),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar campañas";
    console.error("[Campaigns API GET] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const incoming: LinearSequenceCampaign[] = Array.isArray(body.campaigns)
      ? body.campaigns
      : body.campaign
      ? [body.campaign]
      : [];

    if (incoming.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'campaign' o 'campaigns'." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const nowIso = new Date().toISOString();

    const upsertStmt = db.prepare(`
      INSERT OR REPLACE INTO linear_campaigns (
        id, name, code, status, created_at, updated_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let synced = 0;
    const tx = db.transaction((items: LinearSequenceCampaign[]) => {
      for (const camp of items) {
        if (!camp || typeof camp.id !== "string" || !camp.id.trim()) continue;
        upsertStmt.run(
          camp.id.trim(),
          camp.name || "Secuencia",
          camp.code || "01_lists",
          camp.status || "active",
          camp.createdAt || nowIso,
          camp.updatedAt || nowIso,
          JSON.stringify(camp)
        );
        synced += 1;
      }
    });

    tx(incoming);

    return NextResponse.json({ ok: true, synced });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar campañas";
    console.error("[Campaigns API POST] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
