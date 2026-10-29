export type PipelineStageId =
  | "lead_captured"
  | "in_sequence"
  | "connected_material_sent"
  | "interested"
  | "meeting_scheduled"
  | "proposal_sent"
  | "closed_won"
  | "closed_lost";

export interface PipelineStageConfig {
  id: PipelineStageId;
  name: string;
  order: number;
  badgeColor: string;
  headerBorder: string;
}

export interface PipelineDeal {
  id: string;
  leadId: string;
  leadName: string;
  leadTitle: string;
  company: string;
  location: string;
  avatarInitials: string;
  dealValue?: string; // opcional (sin valores monetarios por defecto)
  stageId: PipelineStageId;
  sourceCampaign: string;
  leadMagnetUsed?: string;
  lastActivity: string;
  nextAction: string;
  priority: "Alta" | "Media" | "Baja";
  meetingDate?: string;
  notes?: string;
}
