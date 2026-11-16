import crypto from "node:crypto";
import { getSocialSellingDb } from "@/lib/persistence/db";
import { NextRequest, NextResponse } from "next/server";

export interface WorkspaceSettingsPayload {
  companyName: string;
  billingEmail: string;
  timezone: string;
  workingStart: string;
  workingEnd: string;
  workingDays: string[];
  webhookUrl: string;
  notifyOnReply: boolean;
  notifyOnMeeting: boolean;
  apiKey: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS_KEY = "workspace_default";

function generateApiKey(): string {
  return `ihf_live_sk_${crypto.randomBytes(16).toString("hex")}`;
}

function getDefaultSettings(): WorkspaceSettingsPayload {
  return {
    companyName: "InHubFlow Workspace",
    billingEmail: "",
    timezone: "America/Sao_Paulo",
    workingStart: "09:00",
    workingEnd: "18:00",
    workingDays: ["1", "2", "3", "4", "5"],
    webhookUrl: "",
    notifyOnReply: true,
    notifyOnMeeting: true,
    apiKey: generateApiKey(),
    updatedAt: new Date().toISOString(),
  };
}

function readSettings(key: string): WorkspaceSettingsPayload {
  const db = getSocialSellingDb();
  const row = db
    .prepare("SELECT payload_json FROM workspace_settings_v2 WHERE key = ?")
    .get(key) as { payload_json: string } | undefined;

  if (!row) {
    const defaults = getDefaultSettings();
    db.prepare(
      "INSERT OR REPLACE INTO workspace_settings_v2 (key, updated_at, payload_json) VALUES (?, ?, ?)"
    ).run(key, defaults.updatedAt!, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(row.payload_json) as Partial<WorkspaceSettingsPayload>;
    const defaults = getDefaultSettings();
    return {
      ...defaults,
      ...parsed,
      apiKey: parsed.apiKey || defaults.apiKey,
      workingDays: Array.isArray(parsed.workingDays) ? parsed.workingDays : defaults.workingDays,
    };
  } catch {
    return getDefaultSettings();
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || DEFAULT_SETTINGS_KEY;
    const settings = readSettings(workspaceId);
    return NextResponse.json({ ok: true, settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cargar configuración";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceId =
      typeof body.workspaceId === "string" && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : DEFAULT_SETTINGS_KEY;

    const current = readSettings(workspaceId);
    const updated: WorkspaceSettingsPayload = {
      companyName:
        typeof body.companyName === "string" ? body.companyName.trim() : current.companyName,
      billingEmail:
        typeof body.billingEmail === "string" ? body.billingEmail.trim() : current.billingEmail,
      timezone: typeof body.timezone === "string" ? body.timezone.trim() : current.timezone,
      workingStart:
        typeof body.workingStart === "string" ? body.workingStart : current.workingStart,
      workingEnd: typeof body.workingEnd === "string" ? body.workingEnd : current.workingEnd,
      workingDays: Array.isArray(body.workingDays)
        ? body.workingDays.map((d: unknown) => String(d))
        : current.workingDays,
      webhookUrl: typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : current.webhookUrl,
      notifyOnReply:
        typeof body.notifyOnReply === "boolean" ? body.notifyOnReply : current.notifyOnReply,
      notifyOnMeeting:
        typeof body.notifyOnMeeting === "boolean"
          ? body.notifyOnMeeting
          : current.notifyOnMeeting,
      apiKey: current.apiKey,
      updatedAt: new Date().toISOString(),
    };

    const db = getSocialSellingDb();
    db.prepare(
      "INSERT OR REPLACE INTO workspace_settings_v2 (key, updated_at, payload_json) VALUES (?, ?, ?)"
    ).run(workspaceId, updated.updatedAt!, JSON.stringify(updated));

    return NextResponse.json({ ok: true, settings: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar configuración";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceId =
      typeof body.workspaceId === "string" && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : DEFAULT_SETTINGS_KEY;
    const action = String(body.action || "");

    if (action === "regenerate_api_key") {
      const current = readSettings(workspaceId);
      const updated: WorkspaceSettingsPayload = {
        ...current,
        apiKey: generateApiKey(),
        updatedAt: new Date().toISOString(),
      };
      const db = getSocialSellingDb();
      db.prepare(
        "INSERT OR REPLACE INTO workspace_settings_v2 (key, updated_at, payload_json) VALUES (?, ?, ?)"
      ).run(workspaceId, updated.updatedAt!, JSON.stringify(updated));

      return NextResponse.json({ ok: true, settings: updated });
    }

    if (action === "test_webhook") {
      const targetUrl =
        typeof body.webhookUrl === "string" && body.webhookUrl.trim()
          ? body.webhookUrl.trim()
          : readSettings(workspaceId).webhookUrl;

      if (!targetUrl) {
        return NextResponse.json(
          { ok: false, error: "Configura una URL de webhook antes de probar." },
          { status: 400 }
        );
      }

      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return NextResponse.json(
            { ok: false, error: "La URL del webhook debe iniciar con http:// o https://" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json({ ok: false, error: "URL de webhook inválida." }, { status: 400 });
      }

      const pingRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "inhubflow.webhook.test",
          workspaceId,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      });

      return NextResponse.json({
        ok: pingRes.ok,
        status: pingRes.status,
        error: pingRes.ok ? undefined : `El endpoint respondió con HTTP ${pingRes.status}`,
      });
    }

    return NextResponse.json({ ok: false, error: "Acción no soportada" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar acción";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
