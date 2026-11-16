import { getSocialSellingDb } from "@/lib/persistence/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || "default";
    const db = getSocialSellingDb();

    const memberRows = db
      .prepare("SELECT payload_json FROM team_members_v2 WHERE workspace_id = ? ORDER BY updated_at DESC")
      .all(workspaceId) as Array<{ payload_json: string }>;

    const invitationRows = db
      .prepare(
        "SELECT payload_json FROM team_invitations_v2 WHERE workspace_id = ? ORDER BY updated_at DESC"
      )
      .all(workspaceId) as Array<{ payload_json: string }>;

    const members = memberRows
      .map((r) => {
        try {
          return JSON.parse(r.payload_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const invitations = invitationRows
      .map((r) => {
        try {
          return JSON.parse(r.payload_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, members, invitations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar equipo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceId =
      typeof body.workspaceId === "string" && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : "default";
    const db = getSocialSellingDb();
    const now = new Date().toISOString();

    if (Array.isArray(body.members)) {
      const tx = db.transaction((items: Array<Record<string, unknown>>) => {
        db.prepare("DELETE FROM team_members_v2 WHERE workspace_id = ?").run(workspaceId);
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO team_members_v2 (id, workspace_id, email, updated_at, payload_json)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const m of items) {
          if (!m || typeof m.id !== "string") continue;
          stmt.run(m.id, workspaceId, String(m.email || ""), now, JSON.stringify(m));
        }
      });
      tx(body.members);
    }

    if (Array.isArray(body.invitations)) {
      const tx = db.transaction((items: Array<Record<string, unknown>>) => {
        db.prepare("DELETE FROM team_invitations_v2 WHERE workspace_id = ?").run(workspaceId);
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO team_invitations_v2 (id, workspace_id, email, status, updated_at, payload_json)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const inv of items) {
          if (!inv || typeof inv.id !== "string") continue;
          stmt.run(
            inv.id,
            workspaceId,
            String(inv.email || ""),
            String(inv.status || "pending"),
            now,
            JSON.stringify(inv)
          );
        }
      });
      tx(body.invitations);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al sincronizar equipo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    const id = searchParams.get("id");
    if (!id || (kind !== "member" && kind !== "invitation")) {
      return NextResponse.json(
        { ok: false, error: "Se requieren parámetros kind (member|invitation) e id." },
        { status: 400 }
      );
    }

    const db = getSocialSellingDb();
    if (kind === "member") {
      db.prepare("DELETE FROM team_members_v2 WHERE id = ?").run(id);
    } else {
      db.prepare("DELETE FROM team_invitations_v2 WHERE id = ?").run(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al eliminar registro";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
