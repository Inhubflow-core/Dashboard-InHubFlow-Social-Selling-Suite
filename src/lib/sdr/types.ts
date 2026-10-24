export type SdrMode = "copilot" | "auto" | "approval" | "off" | "shadow";

export type SdrIntent =
  | "interested"
  | "meeting_request"
  | "pricing_question"
  | "product_question"
  | "objection"
  | "integration_question"
  | "proposal_request"
  | "not_interested"
  | "unsubscribe"
  | "human_requested"
  | "referral"
  | "ooo"
  | "ambiguous"
  | "hostile_or_legal";

export type SdrActionType =
  | "answer"
  | "ask_clarification"
  | "offer_slots"
  | "create_proposal"
  | "stop_outreach"
  | "handoff"
  | "no_action";

export type SdrRiskLevel = "low" | "medium" | "high";

export type KnowledgeCategory =
  | "value_prop"
  | "pricing"
  | "objections"
  | "faqs"
  | "company";

export interface KnowledgeSource {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  status: "approved" | "draft" | "retired";
  updatedAt: string;
}

export interface SdrPendingAction {
  id: string;
  threadId: string;
  accountId: string;
  accountName: string;
  prospectName: string;
  prospectTitle: string;
  prospectCompany: string;
  prospectAvatar?: string;
  lastInboundMessage: string;
  intent: SdrIntent;
  confidence: number; // 0 to 1
  riskLevel: SdrRiskLevel;
  suggestedReply: string;
  citations: string[];
  createdAt: string;
  status: "pending" | "approved" | "edited" | "rejected" | "handed_off";
}

export interface SdrDecisionLog {
  id: string;
  timestamp: string;
  prospectName: string;
  accountId: string;
  inboundText: string;
  intent: SdrIntent;
  confidence: number;
  riskLevel: SdrRiskLevel;
  action: SdrActionType;
  tokensUsed: number;
  latencyMs: number;
  status: "executed" | "queued_for_approval" | "shadow_logged" | "handed_off";
}

export interface PromotionGate {
  key: string;
  label: string;
  description: string;
  passed: boolean;
  evidence: string;
}

export interface SdrAgentConfig {
  id: string;
  name: string;
  mode: SdrMode;
  model: string;
  confidenceThreshold: number; // 0 to 1, e.g. 0.85
  maxAutoTurns: number; // e.g. 3
  handoffEmail: string;
  companyContext: string;
  systemPrompt: string;
  customInstructions: string;
  calendarEnabled: boolean;
  bookingLink?: string;
}

export interface SdrStats {
  totalDecisions: number;
  averageConfidence: number;
  pendingApprovals: number;
  handoffCount: number;
  autonomousRepliesSent: number;
}
