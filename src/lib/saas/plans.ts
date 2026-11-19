import type { SaaSPlanConfig, PlanTier, PlanFeature } from "./types";

const COMMON_SOCIAL_FEATURES: PlanFeature[] = [
  { key: "featViralPosts", text: "Posts Virales Ilimitados: crea contenido para 1 mes en minutos (texto, imagen y carruseles PDF)", included: true, highlight: true },
  { key: "featSignals", text: "Monitores de Senales de Intencion Ilimitados en tiempo real (Nivel 1, 2 y 3)", included: true, highlight: true },
  { key: "featCampaigns", text: "Secuencias y Campanas de Prospeccion con delays inteligentes", included: true },
  { key: "featSdr", text: "Asistente SDR de IA 24/7 Ilimitado (Respuestas y Calificacion)", included: true },
  { key: "featInboxCrm", text: "Smart Inbox Unificado, Pipeline CRM de 8 Etapas y Exportacion CSV", included: true },
  { key: "featProtection", text: "Proteccion Anti-bloqueos: Ritmos humanizados y rotacion inteligente", included: true },
];

/**
 * 3 Planes oficiales del SaaS InhubFlow | Social Selling Suite:
 * 1. Plan Starter: 1 cuenta conectada (1 slot)
 * 2. Plan Growth: 5 cuentas conectadas (5 slots)
 * 3. Plan Business: 10 cuentas conectadas (10 slots)
 * Más el plan Custom / Super Admin para administración ilimitada.
 */
export const SAAS_PLANS: Record<PlanTier, SaaSPlanConfig> = {
  starter: {
    id: "starter",
    name: "Plan Starter",
    tagline: "Para fundadores, consultores y creadores independientes",
    slots: 1,
    monthlyPrice: 40,
    annualPrice: 32,
    lemonCheckoutUrl: "https://inhubflow.lemonsqueezy.com/checkout/buy/1c4e9363-186e-40e7-a74e-f9d89117ba3a",
    lemonVariantId: "2088572",
    features: [
      { key: "featSlots1", text: "1 Cuenta de LinkedIn conectada (1 Slot exclusivo de Administrador)", included: true, highlight: true },
      { key: "featInteractions1", text: "Hasta 20 interacciones comerciales / dia (400 al mes · Lun a Vie)", included: true, highlight: true },
      ...COMMON_SOCIAL_FEATURES,
    ],
    limits: {
      dailyInvitationsPerAccount: 20,
      dailyMessagesPerAccount: 30,
      dailyProfileVisitsPerAccount: 50,
      signalMonitorsMax: 5,
      activeWorkflowsMax: 3,
      aiPostGenerationMonthly: 60,
    },
  },
  growth: {
    id: "growth",
    name: "Plan Growth",
    tagline: "Para agencias en expansion y equipos de ventas B2B",
    slots: 5,
    monthlyPrice: 160,
    annualPrice: 128,
    popular: true,
    lemonCheckoutUrl: "https://inhubflow.lemonsqueezy.com/checkout/buy/46fd950f-5631-4e6c-bd2e-a15da16d97cc",
    lemonVariantId: "2088578",
    features: [
      { key: "featSlots5", text: "5 Cuentas de LinkedIn conectadas (1 Admin + hasta 4 miembros Team)", included: true, highlight: true },
      { key: "featInteractions5", text: "Hasta 100 interacciones comerciales / dia (2.000 al mes · Lun a Vie)", included: true, highlight: true },
      ...COMMON_SOCIAL_FEATURES,
    ],
    limits: {
      dailyInvitationsPerAccount: 25,
      dailyMessagesPerAccount: 40,
      dailyProfileVisitsPerAccount: 60,
      signalMonitorsMax: 20,
      activeWorkflowsMax: 15,
      aiPostGenerationMonthly: 300,
    },
  },
  business: {
    id: "business",
    name: "Plan Business",
    tagline: "Para empresas consolidadas y agencias de generacion de demanda",
    slots: 10,
    monthlyPrice: 240,
    annualPrice: 192,
    lemonCheckoutUrl: "https://inhubflow.lemonsqueezy.com/checkout/buy/3ea48412-43ed-4330-97c5-c06073d1d00d",
    lemonVariantId: "2088581",
    features: [
      { key: "featSlots10", text: "10 Cuentas de LinkedIn conectadas (1 Admin + hasta 9 miembros Team)", included: true, highlight: true },
      { key: "featInteractions10", text: "Hasta 200 interacciones comerciales / dia (4.000 al mes · Lun a Vie)", included: true, highlight: true },
      ...COMMON_SOCIAL_FEATURES,
    ],
    limits: {
      dailyInvitationsPerAccount: 25,
      dailyMessagesPerAccount: 40,
      dailyProfileVisitsPerAccount: 80,
      signalMonitorsMax: 999,
      activeWorkflowsMax: 999,
      aiPostGenerationMonthly: 1000,
    },
  },
  custom: {
    id: "custom",
    name: "Plan Super Admin / Enterprise",
    tagline: "Licencia maestra de plataforma con acceso y slots ilimitados",
    slots: 999,
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      { text: "Slots ilimitados (999 cuentas de LinkedIn)", included: true, highlight: true },
      { text: "Acceso exclusivo: Solo Roberto (Super Admin maestro)", included: true, highlight: true },
      { text: "Invitaciones ilimitadas para todo el equipo y clientes", included: true, highlight: true },
      { text: "Panel de control maestro de suscriptores y licencias SaaS", included: true },
      { text: "Capacidad para crear, modificar y suspender cuentas de clientes", included: true },
      { text: "Acceso y auditoria a todos los workspaces del ecosistema", included: true },
      { text: "Monitoreo global de infraestructura de conexión y proxies", included: true },
      { text: "Todas las caracteristicas de la suite desbloqueadas", included: true },
    ],
    limits: {
      dailyInvitationsPerAccount: 25,
      dailyMessagesPerAccount: 50,
      dailyProfileVisitsPerAccount: 100,
      signalMonitorsMax: 9999,
      activeWorkflowsMax: 9999,
      aiPostGenerationMonthly: 99999,
    },
  },
};

export const OFFICIAL_PLANS_LIST: SaaSPlanConfig[] = [
  SAAS_PLANS.starter,
  SAAS_PLANS.growth,
  SAAS_PLANS.business,
];

export function getPlanConfig(planTier: PlanTier): SaaSPlanConfig {
  return SAAS_PLANS[planTier] || SAAS_PLANS.starter;
}

export function getPlanBySlots(slots: number): SaaSPlanConfig {
  if (slots >= 900) return SAAS_PLANS.custom;
  if (slots >= 10) return SAAS_PLANS.business;
  if (slots >= 5) return SAAS_PLANS.growth;
  return SAAS_PLANS.starter;
}

/**
 * Retorna el máximo de miembros de equipo (Team) que un usuario puede invitar:
 * - Super Admin: 999 (Ilimitado)
 * - Admin Starter (1 slot): 0 miembros de equipo (monousuario)
 * - Admin Growth (5 slots): 4 miembros de equipo (1 Admin + 4 Team = 5 slots)
 * - Admin Business (10 slots): 9 miembros de equipo (1 Admin + 9 Team = 10 slots)
 */
export function getMaxTeamInvitationsAllowed(user: { role?: string; slotsLimit?: number }): number {
  if (user.role === "super_admin") return 999;
  const slots = user.slotsLimit ?? 1;
  return Math.max(0, slots - 1);
}

export function formatPlanBadge(tier: PlanTier): { label: string; slots: number } {
  const plan = getPlanConfig(tier);
  return {
    label: plan.name,
    slots: plan.slots,
  };
}
