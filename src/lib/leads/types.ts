export type SequenceStatus = "in_progress" | "replied" | "completed" | "paused";

export type CrmStage =
  | "lead_captured"
  | "in_sequence"
  | "connected_material_sent"
  | "active_conversation"
  | "meeting_scheduled"
  | "proposal_presented"
  | "closed_won"
  | "closed_lost";

export interface LeadTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  type: "signal" | "visit" | "invitation" | "connection" | "dm" | "reply" | "crm";
}

export interface Lead360Item {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  location: string;
  email?: string;
  phone?: string;
  linkedinUrl: string;
  avatarUrl?: string;
  signalSource: string;
  signalLevel: "level_1" | "level_2" | "level_3";
  intentScore: number; // 0 a 100
  stage: CrmStage;
  sequenceStatus: SequenceStatus;
  listId: string;
  listName: string;
  activeCampaignName: string;
  timeline: LeadTimelineEvent[];
  createdAt: string;
  lastActivityAt: string;
}

export interface LeadListGroup {
  id: string;
  name: string;
  description: string;
  signalSource: string;
  signalLevel: "level_1" | "level_2" | "level_3";
  leadsCount: number;
  assignedCampaign: string;
  createdAt: string;
  competitorName?: string;
  keywords?: string[];
  sourceMonitorId?: string;
}
