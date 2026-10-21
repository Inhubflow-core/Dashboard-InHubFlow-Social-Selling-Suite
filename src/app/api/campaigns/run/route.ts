import { NextRequest, NextResponse } from "next/server";
import {
  executeCampaignStepForLead,
  executeLinearSequenceStepForLead,
  executeAllLinearSequenceStepsForLead,
  getCampaignExecutionLogs,
  clearCampaignExecutionLogs,
  type LeadCampaignState,
} from "@/lib/campaigns/runner";
import { getStoredWorkflow } from "@/lib/campaigns/store";
import type { LinearSequenceCampaign } from "@/lib/campaigns/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const sampleLead: LeadCampaignState = {
      leadId: body.leadId || `lead-sim-${Date.now()}`,
      leadName: body.leadName || "Roberto OrSe (Prospecto)",
      linkedinUrl: body.linkedinUrl || "https://www.linkedin.com/in/robertoorse-agencia",
      connectionDegree: body.connectionDegree || "2nd",
      hasAcceptedInvite: body.hasAcceptedInvite || false,
      hasReplied: body.hasReplied || false,
      currentNodeId: body.currentNodeId || "node-tr-01",
      state: "in_progress",
      history: body.history || [],
      language: body.language || "es",
    };

    // Caso 1: Se envía la campaña lineal activa
    if (body.campaign) {
      const campaign = body.campaign as LinearSequenceCampaign;
      const stepIndex = typeof body.stepIndex === "number" ? body.stepIndex : 0;

      if (body.runAll === true) {
        const result = await executeAllLinearSequenceStepsForLead({
          campaign,
          leadState: sampleLead,
          accountId: body.accountId,
        });

        return NextResponse.json({
          ok: true,
          mode: "linear_all",
          result,
          logs: getCampaignExecutionLogs(50),
          timestamp: new Date().toISOString(),
        });
      }

      const result = await executeLinearSequenceStepForLead({
        campaign,
        stepIndex,
        leadState: sampleLead,
        accountId: body.accountId,
      });

      return NextResponse.json({
        ok: true,
        mode: "linear_step",
        result,
        logs: getCampaignExecutionLogs(50),
        timestamp: new Date().toISOString(),
      });
    }

    // Caso 2: Compatibilidad de workflow clásico
    const workflow = getStoredWorkflow();
    const result = await executeCampaignStepForLead({
      workflow,
      leadState: sampleLead,
      accountId: body.accountId,
    });

    return NextResponse.json({
      ok: true,
      mode: "classic_workflow",
      result,
      logs: getCampaignExecutionLogs(50),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al ejecutar paso de campaña";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const logs = getCampaignExecutionLogs(50);
  return NextResponse.json({
    ok: true,
    count: logs.length,
    logs,
    timestamp: new Date().toISOString(),
  });
}

export async function DELETE() {
  clearCampaignExecutionLogs();
  return NextResponse.json({
    ok: true,
    message: "Historial de logs limpiado exitosamente.",
    timestamp: new Date().toISOString(),
  });
}
