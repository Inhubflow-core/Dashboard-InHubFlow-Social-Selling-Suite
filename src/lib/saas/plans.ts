import type { SaaSPlanConfig, PlanTier } from "./types";

/**
 * 3 Planes oficiales del SaaS InHubFlow | Social Selling Suite:
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
    monthlyPrice: 49,
    annualPrice: 39,
    features: [
      { text: "1 cuenta de LinkedIn conectada (1 Slot exclusivo de Administrador)", included: true, highlight: true },
      { text: "Viral Post Engine: Generador de texto, imagen y carruseles PDF", included: true },
      { text: "Calendario Editorial con reprogramacion Drag & Drop", included: true },
      { text: "Signal Radar Nivel 1: Automatizacion de comentarios y Lead Magnet", included: true },
      { text: "Signal Radar Nivel 2 y 3 (Monitoreo de competencia y red)", included: true },
      { text: "Constructor de Campanas Visuales en Canvas (React Flow)", included: true },
      { text: "Lanza hasta 3 campanas simultaneas", included: true },
      { text: "CRM Pipeline y Tablero Kanban comercial", included: true },
      { text: "Bandeja Inbox unificada sin ruido", included: true },
      { text: "Gestion de equipo: 0 invitaciones adicionales (Plan Monousuario)", included: false },
      { text: "Soporte prioritario 24/7 y SLA garantizado", included: false },
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
    monthlyPrice: 149,
    annualPrice: 119,
    popular: true,
    features: [
      { text: "5 cuentas de LinkedIn conectadas (5 Slots en total)", included: true, highlight: true },
      { text: "Estructura de equipo: 1 Administrador + hasta 4 miembros Team", included: true, highlight: true },
      { text: "Todo lo incluido en el Plan Starter", included: true },
      { text: "Asignacion individual de cuentas de LinkedIn por operador Team", included: true },
      { text: "Viral Post Engine sin limite de publicaciones", included: true },
      { text: "Campanas ilimitadas con pacing humano y anti-deteccion", included: true },
      { text: "Signal Radar con monitoreo continuo en tiempo real", included: true },
      { text: "Rotacion inteligente de cuentas para distribucion de carga", included: true },
      { text: "Exportacion de leads y analiticas avanzadas", included: true },
      { text: "Soporte prioritario por WhatsApp y correo electronico", included: true },
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
    monthlyPrice: 279,
    annualPrice: 229,
    features: [
      { text: "10 cuentas de LinkedIn conectadas (10 Slots en total)", included: true, highlight: true },
      { text: "Estructura de equipo: 1 Administrador + hasta 9 miembros Team", included: true, highlight: true },
      { text: "Todo lo incluido en el Plan Growth", included: true },
      { text: "Capacidad para escalar outreach a gran escala (hasta 200 invitaciones/dia en total)", included: true, highlight: true },
      { text: "Monitores de senales de intencion ilimitados (Nivel 1, 2 y 3)", included: true },
      { text: "SDR Co-Pilot con sugerencias de respuesta en tiempo real", included: true },
      { text: "Webhooks e integraciones personalizadas", included: true },
      { text: "Auditoria y logs de actividad multi-cuenta", included: true },
      { text: "Gerente de cuenta dedicado y onboarding personalizado", included: true },
      { text: "SLA corporativo del 99.9%", included: true },
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
