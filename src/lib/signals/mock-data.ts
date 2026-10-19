import type {
  Level1Monitor,
  Level2CompetitorMonitor,
  Level3GlobalMonitor,
  ScannedCompetitorPost,
  SignalLeadItem,
} from "./types";

export const claudiaCuriRealPosts: ScannedCompetitorPost[] = [
  {
    id: "7516866931585576960",
    url: "https://www.linkedin.com/posts/claudiacuri-prospeccion_esta-semana-eleg%C3%AD-las-10-cuentas-nuevas-que-activity-7516866931585576960-jQEj?utm_source=social_share_send&utm_medium=member_desktop_web",
    text: "Esta semana elegí las 10 cuentas nuevas que voy a abordar. No 500 contactos. No una lista de Sales Navigator con todos los directores comerciales...",
    authorName: "Claudia Curi",
    reactionsCount: 6,
    commentsCount: 0,
    scannedAt: "15:34",
  },
  {
    id: "7516527180680564736",
    url: "https://www.linkedin.com/posts/claudiacuri-prospeccion_20-lugares-cierro-el-lunes-19-ayer-activity-7516527180680564736-TrWo?utm_source=social_share_send&utm_medium=member_desktop_web",
    text: "🔥 20 LUGARES. CIERRO EL LUNES 19. 🔥 Ayer dije que buscaba 20 empresas B2B. Hoy te digo exactamente qué pasa si levantas la mano...",
    authorName: "Claudia Curi",
    reactionsCount: 0,
    commentsCount: 1,
    scannedAt: "15:34",
  },
  {
    id: "7516263543676276736",
    url: "https://www.linkedin.com/posts/claudiacuri-prospeccion_estoy-buscando-20-empresas-b2b-que-activity-7516263543676276736-bFYA?utm_source=social_share_send&utm_medium=member_desktop_web",
    text: "🔥 ESTOY BUSCANDO 20 EMPRESAS B2B 🔥 Que quieran convertir LinkedIn en un sistema real de prospección. No busco conseguirte likes. Ni seguidores...",
    authorName: "Claudia Curi",
    reactionsCount: 12,
    commentsCount: 8,
    scannedAt: "15:34",
  },
  {
    id: "7511087711689121794",
    url: "https://www.linkedin.com/posts/claudiacuri-prospeccion_haz-este-experimento-conmigo-esta-semana-activity-7511087711689121794-j7cq?utm_source=social_share_send&utm_medium=member_desktop_web",
    text: "Haz este experimento conmigo esta semana. Piensa en una empresa a la que llevas meses queriendo entrar. No busques al Director Comercial. No le mandes un InMail genérico...",
    authorName: "Claudia Curi",
    reactionsCount: 8,
    commentsCount: 9,
    scannedAt: "15:34",
  },
];

export const initialLevel1Monitors: Level1Monitor[] = [];

export const initialLevel2Monitors: Level2CompetitorMonitor[] = [
  {
    id: "mon-l2-claudia-curi",
    competitorName: "Claudia Curi 🚀",
    competitorUrl: "https://www.linkedin.com/in/claudiacuri-prospeccion",
    competitorType: "person",
    keywordsFilter: ["Prospeccion B2B"],
    status: "active",
    interactionTypes: ["comments", "likes"],
    excludeAuthorEmployees: true,
    outreachTemplate: "Hola {{first_name}}, vi tu interaccion en el post de Claudia Curi sobre prospección B2B...",
    leadsIdentifiedCount: 113,
    lastScanAt: "15:34",
    scanFrequency: "daily",
    createdAt: "2026-10-15T10:00:00.000Z",
    lastScannedPosts: claudiaCuriRealPosts,
  },
];

export const initialLevel3Monitors: Level3GlobalMonitor[] = [];
export const initialDiscoveredLeads: SignalLeadItem[] = [];
