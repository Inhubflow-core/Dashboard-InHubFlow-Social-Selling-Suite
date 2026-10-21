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
  intentScore?: number; // 100: Keyword (Lead Magnet), 90: Comentó, 80: Reposteó, 70: Reaccionó
  signalType?: "keyword" | "comment" | "repost" | "reaction";
  signalSnippet: string; // ej. Comentó: "SISTEMA por favor"
  detectedAt: string;
  status: "new" | "invitation_sent" | "connected" | "dm_sent" | "replied";
  attachedResource?: string;
  language?: "en" | "es" | "pt";
  signalLevel?: SignalLevel;
  sourcePostTitle?: string;
  sourcePostUrl?: string;
  sourceAuthorName?: string;
  sourceAuthorUrl?: string;
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
  lastScanAtIso?: string;
  scanFrequency?: "daily";
  createdAt: string;
  originPostId?: string;
  originPostStatus?: "draft" | "scheduled" | "published" | "failed";
  scheduledAt?: string;
}

export interface ScannedCompetitorPost {
  id: string;
  url: string;
  text: string;
  authorName?: string;
  reactionsCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  scannedAt?: string;
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
  minCommentThreshold?: number;
  batchLeadLimit?: 25 | 50 | 100;
  outreachTemplate: string;
  leadsIdentifiedCount: number;
  lastScanAt: string;
  lastScanAtIso?: string;
  scanFrequency?: "daily" | "weekly" | "manual";
  createdAt: string;
  lastScannedPosts?: ScannedCompetitorPost[];
}


export interface Level3GlobalMonitor {
  id: string;
  searchQuery: string; // ej. "Pedro Valladolid 🚀" o "Ventas B2B"
  leaderName?: string; // Nombre del Top Voice o Referente
  leaderUrl?: string; // URL oficial al perfil de LinkedIn (/in/...)
  leaderAvatarUrl?: string; // Foto real de perfil de LinkedIn
  leaderHeadline?: string; // Titular en LinkedIn
  nicheTopic?: string; // Especialidad o nicho (ej. "Ventas B2B & Dirección Comercial")
  icpTitles?: string[]; // opcional / retrocompatible
  locations?: string[]; // ej. ["España"] o ["all"]
  targetCountry?: string; // ej. "ES" | "BR" | "MX" | "all"
  targetCountryName?: string; // ej. "España"
  targetCountryFlag?: string; // ej. "🇪🇸"
  timePeriod?: "past_24h" | "past_week" | "past_month";
  interactionTypes?: ("comments" | "likes")[];
  minPostReactions?: number;
  batchLeadLimit?: 25 | 50 | 100;
  status: MonitorStatus;
  leadsIdentifiedCount: number;
  lastScanAt: string;
  lastScanAtIso?: string;
  scanFrequency?: "daily";
  createdAt: string;
  lastScannedPosts?: Array<{
    id: string;
    url: string;
    text: string;
    authorName?: string;
    reactionsCount?: number;
    commentsCount?: number;
    repostsCount?: number;
    scannedAt?: string;
  }>;
}

/**
 * Calcula la puntuación oficial de prospección B2B y Social Selling (0 a 100):
 * - 100 / 100: Palabra clave en Lead Magnet propio (Nivel 1) (Full intención)
 * - 90 / 100 🥇: Quien COMENTÓ en publicación de competidor o temática viral (Medalla de Oro)
 * - 80 / 100 🥈: Quien REPOSTEÓ / COMPARTIÓ (Medalla de Plata)
 * - 70 / 100 🥉: Quien DIO LIKE / REACCIÓN (Medalla de Bronce)
 */
export function calculateSignalScore(lead: {
  intentScore?: number;
  signalType?: "keyword" | "comment" | "repost" | "reaction";
  intentLevel?: IntentLevel;
  signalLevel?: SignalLevel;
  signalSnippet?: string;
  attachedResource?: string;
}): number {
  if (typeof lead.intentScore === "number" && lead.intentScore > 0) {
    return lead.intentScore;
  }
  if (
    lead.signalType === "keyword" ||
    lead.signalLevel === "level_1" ||
    lead.intentLevel === "very_high" ||
    Boolean(lead.attachedResource)
  ) {
    return 100;
  }
  if (
    lead.signalType === "comment" ||
    lead.intentLevel === "medium_high" ||
    lead.signalSnippet?.toLowerCase().includes("comentó") ||
    lead.signalSnippet?.toLowerCase().includes("comento")
  ) {
    return 90;
  }
  if (
    lead.signalType === "repost" ||
    lead.signalSnippet?.toLowerCase().includes("reposteó") ||
    lead.signalSnippet?.toLowerCase().includes("compartió")
  ) {
    return 80;
  }
  return 70; // Reacción / like
}
