import { NextRequest, NextResponse } from "next/server";
import {
  executeCampaignStepForLead,
  executeLinearSequenceStepForLead,
  executeAllLinearSequenceStepsForLead,
  getCampaignExecutionLogs,
  clearCampaignExecutionLogs,
  getAccountDailyPacing,
  hydrateAccountDailyPacing,
  type CampaignExecutionLog,
  type LeadCampaignState,
} from "@/lib/campaigns/runner";
import { getStoredWorkflow } from "@/lib/campaigns/store";
import type { LinearSequenceCampaign } from "@/lib/campaigns/types";
import { getSocialSellingDb } from "@/lib/persistence/db";
import { unipile } from "@/lib/unipile/client";

function persistExecutionLogs(logs: CampaignExecutionLog[]) {
  if (!logs || logs.length === 0) return;
  try {
    const db = getSocialSellingDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO campaign_execution_logs_v2 (
        id, campaign_id, lead_id, lead_name, node_id, node_label, node_type, timestamp, status, message, details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction((items: CampaignExecutionLog[]) => {
      for (const l of items) {
        stmt.run(
          l.id,
          l.campaignId,
          l.leadId,
          l.leadName,
          l.nodeId,
          l.nodeLabel,
          l.nodeType,
          l.timestamp,
          l.status,
          l.message,
          JSON.stringify(l.details || {})
        );
      }
    });
    tx(logs);
  } catch (err) {
    console.warn("[api/campaigns/run] Error persistiendo logs en SQLite:", err);
  }
}

function hydratePacingFromDb(accountId: string) {
  try {
    const db = getSocialSellingDb();
    const today = new Date().toISOString().slice(0, 10);
    const row = db
      .prepare(
        "SELECT invitations_sent, dms_sent, profiles_visited FROM campaign_daily_pacing_v2 WHERE account_id = ? AND action_date = ?"
      )
      .get(accountId, today) as
      | { invitations_sent: number; dms_sent: number; profiles_visited: number }
      | undefined;

    if (row) {
      hydrateAccountDailyPacing(accountId, {
        invitationsSent: row.invitations_sent,
        dmsSent: row.dms_sent,
        profilesVisited: row.profiles_visited,
      });
    }
  } catch (err) {
    console.warn("[api/campaigns/run] Error hidratando pacing desde SQLite:", err);
  }
}

function persistPacingToDb(accountId: string) {
  try {
    const db = getSocialSellingDb();
    const pacing = getAccountDailyPacing(accountId);
    db.prepare(`
      INSERT OR REPLACE INTO campaign_daily_pacing_v2 (
        account_id, action_date, invitations_sent, dms_sent, profiles_visited
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      accountId,
      pacing.date,
      pacing.invitationsSent,
      pacing.dmsSent,
      pacing.profilesVisited
    );
  } catch (err) {
    console.warn("[api/campaigns/run] Error guardando pacing en SQLite:", err);
  }
}

function getPersistedLogs(limit = 50): CampaignExecutionLog[] {
  try {
    const db = getSocialSellingDb();
    const rows = db
      .prepare("SELECT * FROM campaign_execution_logs_v2 ORDER BY timestamp DESC LIMIT ?")
      .all(limit) as any[];
    if (rows.length > 0) {
      return rows.map((r) => {
        let details: Record<string, unknown> | undefined;
        try {
          details = r.details_json ? JSON.parse(r.details_json) : undefined;
        } catch {
          details = undefined;
        }
        return {
          id: r.id,
          campaignId: r.campaign_id,
          leadId: r.lead_id,
          leadName: r.lead_name,
          nodeId: r.node_id,
          nodeLabel: r.node_label,
          nodeType: r.node_type,
          timestamp: r.timestamp,
          status: r.status,
          message: r.message,
          details,
        };
      });
    }
  } catch (err) {
    console.warn("[api/campaigns/run] Error leyendo logs desde SQLite:", err);
  }
  return getCampaignExecutionLogs(limit);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const isFirstDegree = body.connectionDegree === "1st";
    const sampleLead: LeadCampaignState = {
      leadId: body.leadId || `lead-sim-${Date.now()}`,
      leadName: body.leadName || "Prospecto de Prueba",
      linkedinUrl: body.linkedinUrl || "",
      connectionDegree: body.connectionDegree || "2nd",
      hasAcceptedInvite: body.hasAcceptedInvite ?? isFirstDegree,
      hasReplied: body.hasReplied || false,
      currentNodeId: body.currentNodeId || "node-tr-01",
      state: "in_progress",
      history: body.history || [],
      language: body.language || "es",
      company: body.company,
      topic: body.topic,
      keyword: body.keyword,
      sourceAuthorName: body.sourceAuthorName,
      providerId: body.providerId,
      chatId: body.chatId,
    };

    let resolvedAccountId =
      typeof body.accountId === "string" && body.accountId.trim()
        ? body.accountId.replace(/^acc-li-/, "").trim()
        : "";

    if (!resolvedAccountId && !body.dryRun && unipile.isConfigured()) {
      try {
        const accRes = await unipile.listAccounts();
        const healthyAcc = (accRes.items || []).find(
          (a: any) =>
            (a.type === "LINKEDIN" || a.provider === "LINKEDIN") &&
            (a.status === "OK" ||
              a.status === "CONNECTED" ||
              (Array.isArray(a.sources) &&
                a.sources.some((s: any) => s.status === "OK" || s.status === "CONNECTED")))
        );
        if (healthyAcc) {
          resolvedAccountId = healthyAcc.id;
        }
      } catch (err) {
        console.warn("[api/campaigns/run] Error resolviendo cuenta Unipile:", err);
      }
    }

    if (!resolvedAccountId) {
      resolvedAccountId = "sandbox-account";
    }

    hydratePacingFromDb(resolvedAccountId);

    // Caso 1: Se envía la campaña lineal activa
    if (body.campaign) {
      const campaign = body.campaign as LinearSequenceCampaign;
      const stepIndex = typeof body.stepIndex === "number" ? body.stepIndex : 0;
      const isDryRun = body.dryRun ?? false;

      if (body.runAll === true) {
        const result = await executeAllLinearSequenceStepsForLead({
          campaign,
          leadState: sampleLead,
          accountId: resolvedAccountId,
          dryRun: isDryRun,
        });

        persistPacingToDb(resolvedAccountId);
        persistExecutionLogs(result.logs);

        return NextResponse.json({
          ok: true,
          mode: "linear_all",
          dryRun: isDryRun,
          result,
          logs: getPersistedLogs(50),
          timestamp: new Date().toISOString(),
        });
      }

      const result = await executeLinearSequenceStepForLead({
        campaign,
        stepIndex,
        leadState: sampleLead,
        accountId: resolvedAccountId,
        dryRun: isDryRun,
      });

      persistPacingToDb(resolvedAccountId);
      if (result.log) persistExecutionLogs([result.log]);

      return NextResponse.json({
        ok: true,
        mode: "linear_step",
        dryRun: isDryRun,
        result,
        logs: getPersistedLogs(50),
        timestamp: new Date().toISOString(),
      });
    }

    // Caso 2: Compatibilidad de workflow clásico
    const workflow = getStoredWorkflow();
    const result = await executeCampaignStepForLead({
      workflow,
      leadState: sampleLead,
      accountId: resolvedAccountId,
    });

    persistPacingToDb(resolvedAccountId);
    if (result.log) persistExecutionLogs([result.log]);

    return NextResponse.json({
      ok: true,
      mode: "classic_workflow",
      result,
      logs: getPersistedLogs(50),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al ejecutar paso de campaña";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const logs = getPersistedLogs(50);
  return NextResponse.json({
    ok: true,
    count: logs.length,
    logs,
    timestamp: new Date().toISOString(),
  });
}

export async function DELETE() {
  clearCampaignExecutionLogs();
  try {
    const db = getSocialSellingDb();
    db.prepare("DELETE FROM campaign_execution_logs_v2").run();
  } catch {}
  return NextResponse.json({
    ok: true,
    message: "Historial de logs limpiado exitosamente.",
    timestamp: new Date().toISOString(),
  });
}
