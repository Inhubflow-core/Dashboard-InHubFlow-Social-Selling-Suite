export type CampaignNodeCategory = "trigger" | "action" | "logic" | "crm" | "control";

export type CampaignNodeType =
  | "trigger_signal"
  | "trigger_list"
  | "action_visit"
  | "action_like_comment"
  | "action_follow_connect"
  | "action_like"
  | "action_comment"
  | "action_invite"
  | "action_dm"
  | "action_inmail"
  | "logic_delay"
  | "logic_condition"
  | "crm_stage"
  | "control_end";

export interface NodeConfigData extends Record<string, unknown> {
  label: string;
  category: CampaignNodeCategory;
  nodeType: CampaignNodeType;
  description: string;
  // Parámetros específicos según tipo
  signalLevel?: "level_1" | "level_2" | "level_3";
  keyword?: string;
  noteText?: string;
  hasNote?: boolean;
  commentText?: string;
  useAiComment?: boolean;
  dmText?: string;
  attachedResource?: string;
  delayHours?: number;
  delayDays?: number;
  workingHoursOnly?: boolean;
  conditionType?: "is_1st_degree" | "accepted_invite" | "replied_to_dm";
  crmStageTarget?: string;
  [key: string]: unknown;
}

export interface CampaignWorkflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft" | "paused";
  dailyInvitationLimit: number; // defecto 25
  dailyDmLimit: number; // defecto 40
  jitterMinMinutes: number; // defecto 3
  jitterMaxMinutes: number; // defecto 12
  stopOnReply: boolean; // defecto true
  nodesJson: string;
  edgesJson: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Estructura de Secuencias Lineales Estilo Outreach B2B ────────────────────

export type SocialStepType =
  | "visit"
  | "like_comment"
  | "connect"
  | "connect_message"
  | "message_icebreaker"
  | "message_followup"
  | "message_value_prop";

export type MessageAttachmentType = "none" | "image" | "video" | "voice_note" | "document";

export interface SequenceStepItem {
  id: string;
  order: number;
  type: SocialStepType;
  title: string;
  description: string;
  delayDaysBefore: number; // Retardo en días antes de este paso (0 para el primero)
  messageTemplate?: string;
  connectNote?: string;
  commentTemplate?: string;
  useAiComment?: boolean;
  attachedResource?: string;
  attachmentType?: MessageAttachmentType;
  attachmentUrl?: string;
  attachmentName?: string;
  voiceNoteDurationSec?: number;
  isInheritedFromMonitor?: boolean;
}

export interface LinearSequenceCampaign {
  id: "seq-lead-lists" | "seq-lead-magnet" | string;
  name: string;
  code: "01_lists" | "02_lead_magnet";
  triggerTitle: string;
  triggerDescription: string;
  status: "active" | "paused";
  targetListId?: string;
  targetListName?: string;
  steps: SequenceStepItem[];
  dailyLimits: {
    maxVisitsPerDay: number;
    maxConnectionsPerDay: number;
    maxMessagesPerDay: number;
  };
  stopOnReply: boolean;
  workingHoursOnly: boolean;
  createdAt: string;
  updatedAt: string;
}
