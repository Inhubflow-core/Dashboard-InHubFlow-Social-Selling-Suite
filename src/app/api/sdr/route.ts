import { getSocialSellingDb } from "@/lib/persistence/db";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_KEYS = new Set(["config", "knowledge", "pending", "logs"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const db = getSocialSellingDb();

    if (key) {
      if (!ALLOWED_KEYS.has(key)) {
        return NextResponse.json({ ok: false, error: "Clave SDR inválida." }, { status: 400 });
      }
      const row = db
        .prepare("SELECT payload_json FROM sdr_state_v2 WHERE key = ?")
        .get(key) as { payload_json: string } | undefined;
      return NextResponse.json({
        ok: true,
        key,
        data: row ? JSON.parse(row.payload_json) : null,
      });
    }

    const rows = db.prepare("SELECT key, payload_json FROM sdr_state_v2").all() as Array<{
      key: string;
      payload_json: string;
    }>;
    const state: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        state[r.key] = JSON.parse(r.payload_json);
      } catch {
        state[r.key] = null;
      }
    }
    return NextResponse.json({ ok: true, state });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar estado SDR";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = String(body.key || "");
    if (!ALLOWED_KEYS.has(key) || body.data === undefined) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'key' (config|knowledge|pending|logs) y 'data'." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    db.prepare(`
      INSERT OR REPLACE INTO sdr_state_v2 (key, updated_at, payload_json)
      VALUES (?, ?, ?)
    `).run(key, new Date().toISOString(), JSON.stringify(body.data));

    return NextResponse.json({ ok: true, key });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar estado SDR";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
