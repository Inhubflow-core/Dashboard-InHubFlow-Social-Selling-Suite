import { getSocialSellingDb } from "@/lib/persistence/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getSocialSellingDb();
    const rows = db
      .prepare("SELECT payload_json FROM linkedin_accounts_v2 ORDER BY updated_at DESC")
      .all() as Array<{ payload_json: string }>;

    const accounts = rows
      .map((r) => {
        try {
          return JSON.parse(r.payload_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, accounts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar cuentas";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const db = getSocialSellingDb();
    const now = new Date().toISOString();

    const list = Array.isArray(body.accounts)
      ? body.accounts
      : body.account && typeof body.account === "object"
        ? [body.account]
        : null;

    if (!list) {
      return NextResponse.json(
        { ok: false, error: "Se requiere 'account' o 'accounts[]'." },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO linkedin_accounts_v2 (
        id, unipile_account_id, name, status, updated_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction((items: Array<Record<string, unknown>>) => {
      for (const acc of items) {
        if (!acc || typeof acc.id !== "string" || !acc.id.trim()) continue;
        stmt.run(
          acc.id,
          typeof acc.unipileAccountId === "string" ? acc.unipileAccountId : null,
          String(acc.name || "LinkedIn Account"),
          String(acc.status || "OK"),
          now,
          JSON.stringify(acc)
        );
      }
    });

    tx(list);
    return NextResponse.json({ ok: true, count: list.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar cuentas";
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
    db.prepare("DELETE FROM linkedin_accounts_v2 WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar cuenta";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
