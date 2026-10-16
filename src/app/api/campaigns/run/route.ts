import { NextRequest, NextResponse } from "next/server";
import {
  executeCampaignStepForLead,
  getCampaignExecutionLogs,
  type LeadCampaignState,
} from "@/lib/campaigns/runner";
import { getStoredWorkflow } from "@/lib/campaigns/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workflow = getStoredWorkflow();

    const sampleLead: LeadCampaignState = {
      leadId: body.leadId || `lead-demo-${Date.now()}`,
      leadName: body.leadName || "Mariana Costa",
      linkedinUrl: body.linkedinUrl || "https://www.linkedin.com/in/mariana-costa-tech",
      connectionDegree: body.connectionDegree || "2nd",
      hasAcceptedInvite: body.hasAcceptedInvite || false,
      hasReplied: body.hasReplied || false,
      currentNodeId: body.currentNodeId || "node-tr-01",
      state: "in_progress",
      history: [],
      language: body.language || "es",
    };

    const result = await executeCampaignStepForLead({
      workflow,
      leadState: sampleLead,
      accountId: body.accountId,
    });

    return NextResponse.json({
      ok: true,
      result,
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
