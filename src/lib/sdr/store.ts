import {
  SdrAgentConfig,
  SdrPendingAction,
  KnowledgeSource,
  PromotionGate,
  SdrDecisionLog,
  SdrStats,
} from "./types";
import { INITIAL_KNOWLEDGE_SOURCES } from "./knowledge-data";

const SDR_CONFIG_KEY = "inhubflow_sdr_config_v1";
const SDR_KNOWLEDGE_KEY = "inhubflow_sdr_knowledge_v1";
const SDR_PENDING_KEY = "inhubflow_sdr_pending_actions_v1";
const SDR_LOGS_KEY = "inhubflow_sdr_decision_logs_v1";

export const DEFAULT_SDR_CONFIG: SdrAgentConfig = {
  id: "sdr-default",
  name: "InHubFlow Virtual SDR",
  mode: "approval", // Modo supervisión con aprobación humana por defecto
  model: "gemini-3.6-flash",
  confidenceThreshold: 0.85,
  maxAutoTurns: 3,
  handoffEmail: "inhubflow@gmail.com",
  companyContext: "InHubFlow | Social Selling Suite es una plataforma B2B que combina Signal Radar, secuencias visuales de Canvas y Asistente SDR IA con soporte multislots para generar reuniones comerciales de alto valor.",
  systemPrompt: "Eres un SDR virtual senior de InHubFlow. Tu objetivo es mantener conversaciones ejecutivas, concisas y naturales en LinkedIn. Responde dudas fundamentándote únicamente en el conocimiento aprobado y guía al prospecto calificado a agendar una llamada de 20 minutos.",
  customInstructions: "Nunca inventes funcionalidades ni tarifas que no estén en el documento de precios oficiales. Sé empático, saluda por el nombre y ofrece el enlace de calendario cuando haya interés claro.",
  calendarEnabled: true,
  bookingLink: "https://cal.inhubflow.com/demo-20min",
};

export const INITIAL_PENDING_ACTIONS: SdrPendingAction[] = [
  {
    id: "action-101",
    threadId: "th-carlos-arriaga",
    accountId: "acc-li-6yecZUhYS1mvPOJJC7p-zQ",
    accountName: "RobertoOrse Agencia (Fundador)",
    prospectName: "Carlos Arriaga",
    prospectTitle: "Head of Commercial Sales",
    prospectCompany: "LatamTech Solutions",
    prospectAvatar: "CA",
    lastInboundMessage: "Hola Roberto, vi tu publicación sobre el Signal Radar. Me pareció muy interesante. ¿Cuánto cuesta la suscripción si quisiéramos conectar unas 4 o 5 cuentas de nuestros SDRs?",
    intent: "pricing_question",
    confidence: 0.94,
    riskLevel: "low",
    suggestedReply: `Hola Carlos, con gusto te comparto los detalles. Para un equipo de 5 cuentas de LinkedIn, el plan ideal es nuestro Plan Growth por $149/mes ($119/mes en facturación anual).

Incluye 5 cuentas conectadas en simultáneo, hasta 100 invitaciones y 150 DMs diarios en total, además de gestión multi-usuario y este mismo Asistente SDR IA para responder a los prospectos.

¿Te vendría bien coordinar una demo de 15 minutos para ver cómo quedaría configurado para tu equipo de SDRs?`,
    citations: ["Estructura de Precios y Planes Oficiales", "Propuesta de Valor & Capacidades de InHubFlow"],
    createdAt: "2026-10-09T09:12:00Z",
    status: "pending",
  },
  {
    id: "action-102",
    threadId: "th-mariana-gomez",
    accountId: "acc-li-6yecZUhYS1mvPOJJC7p-zQ",
    accountName: "RobertoOrse Agencia (Fundador)",
    prospectName: "Mariana Gomez",
    prospectTitle: "Director of Marketing & Growth",
    prospectCompany: "Kroma Consulting",
    prospectAvatar: "MG",
    lastInboundMessage: "Hola, actualmente usamos Waalaxy para prospección. ¿En qué se diferencia InHubFlow y cómo garantizan que no bloqueen los perfiles de LinkedIn?",
    intent: "objection",
    confidence: 0.92,
    riskLevel: "low",
    suggestedReply: `Hola Mariana, gusto en saludarte. La gran diferencia con Waalaxy es el enfoque: no hacemos prospección en frío ciega ni usamos extensiones de Chrome que LinkedIn detecta con facilidad.

InHubFlow utiliza el Signal Radar para captar prospectos cuando comentan o reaccionan a publicaciones relevantes de tu sector (leads 'tibios'). Además, toda la conexión opera con emulación humana real y límites estrictos (máx. 25 invitaciones diarias por cuenta) para garantizar el 100% de seguridad del perfil.

¿Te interesaría revisar una breve comparativa técnica de 10 minutos?`,
    citations: ["Manejo de Objeciones Comunes", "Propuesta de Valor & Capacidades de InHubFlow"],
    createdAt: "2026-10-09T08:45:00Z",
    status: "pending",
  },
  {
    id: "action-103",
    threadId: "th-javier-morales",
    accountId: "acc-li-7VSGKBGlTNGRbzZKuh6VpQ",
    accountName: "ADS CASHGROW (Team)",
    prospectName: "Javier Morales",
    prospectTitle: "Managing Partner",
    prospectCompany: "Morales & Asociados",
    prospectAvatar: "JM",
    lastInboundMessage: "Excelente, me gustaría tener una demo esta semana para ver la herramienta en acción con mi socio. ¿Cómo podemos agendar?",
    intent: "meeting_request",
    confidence: 0.97,
    riskLevel: "low",
    suggestedReply: `¡Excelente iniciativa, Javier! Con mucho gusto coordinamos la demostración para ti y tu socio.

Puedes seleccionar el día y horario que mejor les convenga a través de este enlace directo (20 minutos):
https://cal.inhubflow.com/demo-20min

¿Te queda bien, o prefieres que busquemos una franja horaria en particular por aquí?`,
    citations: ["Protocolo de Agendamiento de Reuniones"],
    createdAt: "2026-10-09T07:30:00Z",
    status: "pending",
  },
];

export const INITIAL_PROMOTION_GATES: PromotionGate[] = [
  {
    key: "gate_provider_health",
    label: "Motor de IA (LLM Engine) Activo",
    description: "Conexión estable con Gemini 3.6 Flash y latencia media de respuesta inferior a 400ms.",
    passed: true,
    evidence: "Gemini 3.6 Flash verificado. Latencia promedio: 215ms.",
  },
  {
    key: "gate_knowledge_approved",
    label: "Base de Conocimiento Empresarial Aprobada",
    description: "Mínimo de 3 documentos oficiales aprobados que cubran propuesta de valor, precios y objeciones.",
    passed: true,
    evidence: "5 documentos aprobados activos en la base de conocimiento.",
  },
  {
    key: "gate_confidence_threshold",
    label: "Umbral de Confianza Calibrado",
    description: "El umbral de confianza mínimo está establecido en 80% o más para evitar alucinaciones.",
    passed: true,
    evidence: "Umbral configurado en 85%. Respuestas dudosas pasan a supervisión humana.",
  },
  {
    key: "gate_handoff_policy",
    label: "Políticas de Handoff & Seguridad Activas",
    description: "Reglas claras de derivación a operadores humanos en caso de riesgo legal, queja o solicitud de llamada.",
    passed: true,
    evidence: "Reglas de escalamiento activas y correo de alerta asignado a inhubflow@gmail.com.",
  },
  {
    key: "gate_shadow_tested",
    label: "Validación Previa en Modo Sombra / Supervisión",
    description: "Se han probado un mínimo de 10 decisiones en modo supervisión antes de liberar respuestas autónomas.",
    passed: true,
    evidence: "18 decisiones procesadas con 94.2% de precisión media.",
  },
];

export const INITIAL_DECISION_LOGS: SdrDecisionLog[] = [
  {
    id: "log-501",
    timestamp: "2026-10-09T09:12:00Z",
    prospectName: "Carlos Arriaga",
    accountId: "acc-elena-main",
    inboundText: "¿Cuánto cuesta la suscripción para 5 cuentas de SDRs?",
    intent: "pricing_question",
    confidence: 0.94,
    riskLevel: "low",
    action: "answer",
    tokensUsed: 420,
    latencyMs: 198,
    status: "queued_for_approval",
  },
  {
    id: "log-502",
    timestamp: "2026-10-09T08:45:00Z",
    prospectName: "Mariana Gomez",
    accountId: "acc-elena-main",
    inboundText: "Actualmente usamos Waalaxy... ¿cómo garantizan que no bloqueen los perfiles?",
    intent: "objection",
    confidence: 0.92,
    riskLevel: "low",
    action: "answer",
    tokensUsed: 512,
    latencyMs: 245,
    status: "queued_for_approval",
  },
  {
    id: "log-503",
    timestamp: "2026-10-09T07:30:00Z",
    prospectName: "Javier Morales",
    accountId: "acc-sofia-sd1",
    inboundText: "Me gustaría tener una demo esta semana para ver la herramienta. ¿Cómo agendamos?",
    intent: "meeting_request",
    confidence: 0.97,
    riskLevel: "low",
    action: "offer_slots",
    tokensUsed: 380,
    latencyMs: 175,
    status: "queued_for_approval",
  },
  {
    id: "log-504",
    timestamp: "2026-10-08T18:20:00Z",
    prospectName: "Rodrigo Peña",
    accountId: "acc-carlos-main",
    inboundText: "Por favor eliminen mis datos de su lista, no me interesa.",
    intent: "unsubscribe",
    confidence: 0.98,
    riskLevel: "low",
    action: "stop_outreach",
    tokensUsed: 210,
    latencyMs: 140,
    status: "executed",
  },
  {
    id: "log-505",
    timestamp: "2026-10-08T16:10:00Z",
    prospectName: "Lucía Fernandez",
    accountId: "acc-marcos-main",
    inboundText: "Quiero hablar con el gerente comercial directamente por teléfono.",
    intent: "human_requested",
    confidence: 0.96,
    riskLevel: "medium",
    action: "handoff",
    tokensUsed: 290,
    latencyMs: 165,
    status: "handed_off",
  },
];

// Helper functions with LocalStorage
export function getStoredSdrConfig(): SdrAgentConfig {
  if (typeof window === "undefined") return DEFAULT_SDR_CONFIG;
  const raw = localStorage.getItem(SDR_CONFIG_KEY);
  if (!raw) return DEFAULT_SDR_CONFIG;
  try {
    return { ...DEFAULT_SDR_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SDR_CONFIG;
  }
}

export function saveStoredSdrConfig(config: SdrAgentConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SDR_CONFIG_KEY, JSON.stringify(config));
}

export function getStoredKnowledgeSources(): KnowledgeSource[] {
  if (typeof window === "undefined") return INITIAL_KNOWLEDGE_SOURCES;
  const raw = localStorage.getItem(SDR_KNOWLEDGE_KEY);
  if (!raw) return INITIAL_KNOWLEDGE_SOURCES;
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_KNOWLEDGE_SOURCES;
  }
}

export function saveStoredKnowledgeSources(sources: KnowledgeSource[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SDR_KNOWLEDGE_KEY, JSON.stringify(sources));
}

export function getStoredPendingActions(accountId?: string): SdrPendingAction[] {
  if (typeof window === "undefined") return INITIAL_PENDING_ACTIONS;
  const raw = localStorage.getItem(SDR_PENDING_KEY);
  let list = INITIAL_PENDING_ACTIONS;
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {
      list = INITIAL_PENDING_ACTIONS;
    }
  }
  if (accountId) {
    return list.filter((a) => a.accountId === accountId);
  }
  return list;
}

export function saveStoredPendingActions(actions: SdrPendingAction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SDR_PENDING_KEY, JSON.stringify(actions));
}

export function addStoredPendingAction(action: SdrPendingAction): void {
  if (typeof window === "undefined") return;
  const current = getStoredPendingActions();
  const updated = [action, ...current];
  saveStoredPendingActions(updated);
}

export function getStoredDecisionLogs(): SdrDecisionLog[] {
  if (typeof window === "undefined") return INITIAL_DECISION_LOGS;
  const raw = localStorage.getItem(SDR_LOGS_KEY);
  if (!raw) return INITIAL_DECISION_LOGS;
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DECISION_LOGS;
  }
}

export function addStoredDecisionLog(log: SdrDecisionLog): void {
  if (typeof window === "undefined") return;
  const logs = getStoredDecisionLogs();
  const updated = [log, ...logs].slice(0, 50);
  localStorage.setItem(SDR_LOGS_KEY, JSON.stringify(updated));
}

export function getStoredPromotionGates(): PromotionGate[] {
  return INITIAL_PROMOTION_GATES;
}

export function getSdrStats(): SdrStats {
  const pending = getStoredPendingActions().filter((a) => a.status === "pending");
  const logs = getStoredDecisionLogs();
  const totalDecisions = logs.length;
  const avgConf =
    totalDecisions > 0
      ? logs.reduce((acc, curr) => acc + curr.confidence, 0) / totalDecisions
      : 0.94;
  const handoffs = logs.filter((l) => l.action === "handoff").length;
  const autonomous = logs.filter((l) => l.status === "executed").length;

  return {
    totalDecisions,
    averageConfidence: Math.round(avgConf * 100),
    pendingApprovals: pending.length,
    handoffCount: handoffs,
    autonomousRepliesSent: autonomous,
  };
}
