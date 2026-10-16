export type SignalLevel = "level_1" | "level_2" | "level_3";
export type IntentLevel = "very_high" | "medium_high" | "medium";
export type ConnectionDegree = "1st" | "2nd" | "3rd";
export type MonitorStatus = "active" | "paused" | "completed" | "pending_publish";

export interface SignalLeadItem {
  id: string;
  monitorId: string;
  fullName: string;
  headline: string;
  company: string;
  location: string;
  linkedinUrl: string;
  avatarUrl?: string;
  connectionDegree: ConnectionDegree;
  intentLevel: IntentLevel;
  signalSnippet: string; // ej. Comentó: "SISTEMA por favor"
  detectedAt: string;
  status: "new" | "invitation_sent" | "connected" | "dm_sent" | "replied";
  attachedResource?: string;
  language?: "en" | "es" | "pt";
}

export interface Level1Monitor {
  id: string;
  postTitle: string;
  postUrl: string;
  keyword: string; // ej. "SISTEMA"
  status: MonitorStatus;
  autoLikeComment: boolean;
  publicReplyTemplate: string; // ej. "Te lo acabo de enviar por privado, revisa tus mensajes"
  nonConnectedNoteTemplate: string; // "Hola {{first_name}}, vi que comentaste..."
  attachedPdfName: string;
  scannedCommentsCount: number;
  leadsCapturedCount: number;
  lastScanAt: string;
  createdAt: string;
  originPostId?: string;
  originPostStatus?: "draft" | "scheduled" | "published" | "failed";
  scheduledAt?: string;
}

export interface Level2CompetitorMonitor {
  id: string;
  competitorName: string;
  competitorUrl: string;
  logoUrl?: string;
  competitorType?: "company" | "person";
  keywordsFilter: string[]; // ej. ["Agentes IA", "Prospeccion B2B"]
  status: MonitorStatus;
  interactionTypes: ("likes" | "comments")[];
  excludeAuthorEmployees?: boolean;
  outreachTemplate: string;
  leadsIdentifiedCount: number;
  lastScanAt: string;
  createdAt: string;
}


export interface Level3GlobalMonitor {
  id: string;
  searchQuery: string; // ej. "Prospeccion en frio B2B"
  icpTitles: string[]; // ej. ["CEO", "Founder", "VP Sales"]
  locations: string[]; // ej. ["España", "Mexico", "Colombia"]
  minPostReactions: number;
  status: MonitorStatus;
  leadsIdentifiedCount: number;
  lastScanAt: string;
  createdAt: string;
}
