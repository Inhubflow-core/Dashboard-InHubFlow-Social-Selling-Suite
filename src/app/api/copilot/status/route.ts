import { getSocialSellingDb } from "@/lib/persistence/db";
import type { KnowledgeSource, SdrPendingAction } from "@/lib/sdr/types";
import { NextResponse } from "next/server";

export type OnboardingStepId =
  | "connect_linkedin"
  | "train_knowledge"
  | "create_viral_posts"
  | "setup_signal_radar"
  | "launch_campaign"
  | "ready";

export interface CopilotAccountStatus {
  ok: true;
  hasLinkedInAccount: boolean;
  linkedInAccountsCount: number;
  connectedAccountNames: string[];
  hasCustomKnowledge: boolean;
  knowledgeDocsCount: number;
  trainedCompanyName: string | null;
  viralPostsCount: number;
  signalMonitorsCount: number;
  leadsCount: number;
  campaignsCount: number;
  pendingCopilotDrafts: number;
  unreadInboxCount: number;
  completedStepsCount: number;
  totalStepsCount: number;
  nextRecommendedStep: OnboardingStepId;
}

export async function GET() {
  try {
    const db = getSocialSellingDb();

    // 1. LinkedIn Accounts
    const accRows = db
      .prepare("SELECT name, status, payload_json FROM linkedin_accounts_v2 ORDER BY updated_at DESC")
      .all() as Array<{ name: string; status: string; payload_json: string }>;

    const connectedAccountNames: string[] = [];
    for (const r of accRows) {
      let status = r.status;
      let name = r.name;
      try {
        const parsed = JSON.parse(r.payload_json);
        if (parsed?.status) status = String(parsed.status);
        if (parsed?.name) name = String(parsed.name);
      } catch {}
      if (status === "OK" || status === "CONNECTED" || status === "active") {
        connectedAccountNames.push(name || "LinkedIn");
      }
    }

    const hasLinkedInAccount = connectedAccountNames.length > 0;

    // 2. SDR Knowledge Base & Pending Copilot Drafts
    const kbRow = db
      .prepare("SELECT payload_json FROM sdr_state_v2 WHERE key = 'knowledge'")
      .get() as { payload_json: string } | undefined;

    let knowledgeDocs: KnowledgeSource[] = [];
    if (kbRow?.payload_json) {
      try {
        const parsed = JSON.parse(kbRow.payload_json);
        if (Array.isArray(parsed)) {
          knowledgeDocs = parsed;
        }
      } catch {}
    }

    // Check if user trained custom knowledge (either id starts with 'kb-custom-' / 'kb-copilot-' or non-default docs exist)
    const approvedDocs = knowledgeDocs.filter((d) => d && d.status === "approved");
    const customDoc = approvedDocs.find(
      (d) =>
        String(d.id || "").startsWith("kb-copilot-") ||
        String(d.id || "").startsWith("kb-custom-") ||
        !["kb-01", "kb-02", "kb-03", "kb-04", "kb-05"].includes(String(d.id || ""))
    );

    const hasCustomKnowledge = Boolean(customDoc) || approvedDocs.length > 0;
    let trainedCompanyName: string | null = null;
    if (customDoc?.title) {
      const m = customDoc.title.match(/:\s*(.+)$/);
      trainedCompanyName = m ? m[1].trim() : customDoc.title;
    }

    const pendingRow = db
      .prepare("SELECT payload_json FROM sdr_state_v2 WHERE key = 'pending'")
      .get() as { payload_json: string } | undefined;
    let pendingCopilotDrafts = 0;
    if (pendingRow?.payload_json) {
      try {
        const list = JSON.parse(pendingRow.payload_json) as SdrPendingAction[];
        if (Array.isArray(list)) {
          pendingCopilotDrafts = list.filter((item) => item?.status === "pending").length;
        }
      } catch {}
    }

    // 3. Counts across Viral Posts, Signal Monitors, Leads, Campaigns, Inbox
    const countQuery = (sql: string): number => {
      try {
        const row = db.prepare(sql).get() as { cnt: number } | undefined;
        return Number(row?.cnt || 0);
      } catch {
        return 0;
      }
    };

    const viralPostsCount = countQuery("SELECT COUNT(*) as cnt FROM viral_posts");
    const signalMonitorsCount = countQuery("SELECT COUNT(*) as cnt FROM signal_monitors");
    const leadsCount = countQuery("SELECT COUNT(*) as cnt FROM crm_leads_360");
    const campaignsCount = countQuery("SELECT COUNT(*) as cnt FROM linear_campaigns");
    const unreadInboxCount = countQuery(
      "SELECT COUNT(*) as cnt FROM inbox_conversations_v2 WHERE unread > 0"
    );

    // 4. Determine recommended next onboarding step
    let nextRecommendedStep: OnboardingStepId = "ready";
    if (!hasLinkedInAccount) {
      nextRecommendedStep = "connect_linkedin";
    } else if (!customDoc) {
      nextRecommendedStep = "train_knowledge";
    } else if (viralPostsCount === 0) {
      nextRecommendedStep = "create_viral_posts";
    } else if (signalMonitorsCount === 0) {
      nextRecommendedStep = "setup_signal_radar";
    } else if (campaignsCount === 0) {
      nextRecommendedStep = "launch_campaign";
    }

    const stepsDone = [
      hasLinkedInAccount,
      Boolean(customDoc),
      viralPostsCount > 0,
      signalMonitorsCount > 0,
      campaignsCount > 0,
    ].filter(Boolean).length;

    const payload: CopilotAccountStatus = {
      ok: true,
      hasLinkedInAccount,
      linkedInAccountsCount: connectedAccountNames.length,
      connectedAccountNames,
      hasCustomKnowledge: Boolean(customDoc),
      knowledgeDocsCount: approvedDocs.length,
      trainedCompanyName,
      viralPostsCount,
      signalMonitorsCount,
      leadsCount,
      campaignsCount,
      pendingCopilotDrafts,
      unreadInboxCount,
      completedStepsCount: stepsDone,
      totalStepsCount: 5,
      nextRecommendedStep,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar estado Copilot";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
