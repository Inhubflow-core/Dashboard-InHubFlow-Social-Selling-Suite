import { getSocialSellingDb } from "@/lib/persistence/db";
import { NextRequest, NextResponse } from "next/server";

type SignalMonitorLevel = "level_1" | "level_2" | "level_3_groups" | "level_4";

const VALID_LEVELS = new Set<SignalMonitorLevel>([
  "level_1",
  "level_2",
  "level_3_groups",
  "level_4",
]);

function extractMonitorTitle(level: string, monitor: Record<string, any>): string {
  if (typeof monitor.postTitle === "string" && monitor.postTitle.trim()) {
    return monitor.postTitle.trim();
  }
  if (typeof monitor.competitorName === "string" && monitor.competitorName.trim()) {
    return monitor.competitorName.trim();
  }
  if (typeof monitor.groupName === "string" && monitor.groupName.trim()) {
    return monitor.groupName.trim();
  }
  if (typeof monitor.searchQuery === "string" && monitor.searchQuery.trim()) {
    return monitor.searchQuery.trim();
  }
  if (typeof monitor.title === "string" && monitor.title.trim()) {
    return monitor.title.trim();
  }
  return `Monitor ${level}`;
}

function extractMonitorLeadsCount(monitor: Record<string, any>): number {
  const candidates = [
    monitor.leadsCapturedCount,
    monitor.leadsIdentifiedCount,
    monitor.leadsExtractedCount,
    monitor.leadsCount,
  ];
  for (const val of candidates) {
    if (typeof val === "number" && Number.isFinite(val)) {
      return Math.max(0, Math.round(val));
    }
  }
  return 0;
}

function rowToMonitorPayload(row: any) {
  let metadata: Record<string, any> = {};
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
  } catch {
    metadata = {};
  }

  return {
    ...metadata,
    id: row.id,
    level: row.level,
    status: row.status,
    lastScanAt: metadata.lastScanAt ?? row.last_scan_at ?? undefined,
    lastScanAtIso: metadata.lastScanAtIso ?? row.last_scan_at_iso ?? undefined,
    createdAt: metadata.createdAt ?? row.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    const db = getSocialSellingDb();

    if (level) {
      if (!VALID_LEVELS.has(level as SignalMonitorLevel)) {
        return NextResponse.json(
          { ok: false, error: "Nivel de monitor inválido." },
          { status: 400 }
        );
      }
      const rows = db
        .prepare("SELECT * FROM signal_monitors WHERE level = ? ORDER BY updated_at DESC")
        .all(level);
      return NextResponse.json({
        ok: true,
        level,
        monitors: rows.map(rowToMonitorPayload),
      });
    }

    const rows = db
      .prepare("SELECT * FROM signal_monitors ORDER BY updated_at DESC")
      .all();

    return NextResponse.json({
      ok: true,
      monitors: rows.map(rowToMonitorPayload),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar monitores";
    console.error("[Signal Monitors API GET] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const level = String(body.level || "level_1") as SignalMonitorLevel;

    if (!VALID_LEVELS.has(level)) {
      return NextResponse.json(
        { ok: false, error: "Nivel de monitor inválido (usa level_1, level_2, level_3_groups o level_4)." },
        { status: 400 }
      );
    }

    const incoming: Record<string, any>[] = Array.isArray(body.monitors)
      ? body.monitors
      : body.monitor
      ? [body.monitor]
      : [];

    if (incoming.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'monitor' o 'monitors' para sincronizar." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const nowIso = new Date().toISOString();

    const upsertStmt = db.prepare(`
      INSERT OR REPLACE INTO signal_monitors (
        id,
        level,
        title,
        status,
        leads_count,
        last_scan_at,
        last_scan_at_iso,
        created_at,
        updated_at,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let synced = 0;
    const syncTx = db.transaction((items: Record<string, any>[]) => {
      for (const mon of items) {
        if (!mon || typeof mon.id !== "string" || !mon.id.trim()) continue;
        const title = extractMonitorTitle(level, mon);
        const status = typeof mon.status === "string" && mon.status ? mon.status : "active";
        const leadsCount = extractMonitorLeadsCount(mon);
        const lastScanAt = typeof mon.lastScanAt === "string" ? mon.lastScanAt : null;
        const lastScanAtIso = typeof mon.lastScanAtIso === "string" ? mon.lastScanAtIso : null;
        const createdAt = typeof mon.createdAt === "string" && mon.createdAt ? mon.createdAt : nowIso;

        upsertStmt.run(
          mon.id.trim(),
          level,
          title,
          status,
          leadsCount,
          lastScanAt,
          lastScanAtIso,
          createdAt,
          nowIso,
          JSON.stringify(mon)
        );
        synced += 1;
      }
    });

    syncTx(incoming);

    return NextResponse.json({
      ok: true,
      level,
      synced,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al sincronizar monitores";
    console.error("[Signal Monitors API POST] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = typeof body.id === "string" ? body.id : null;
    }

    if (!id || !id.trim()) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'id' para eliminar el monitor." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    const info = db.prepare("DELETE FROM signal_monitors WHERE id = ?").run(id.trim());

    return NextResponse.json({
      ok: true,
      deleted: info.changes > 0,
      id: id.trim(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar monitor";
    console.error("[Signal Monitors API DELETE] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
