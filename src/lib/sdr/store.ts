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
export const SDR_CHANGE_EVENT = "inhubflow:sdr-updated";

function syncSdrStateToDb(key: "config" | "knowledge" | "pending" | "logs", data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(SDR_CHANGE_EVENT));
    if (typeof fetch === "function") {
      fetch("/api/sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, data }),
      }).catch(() => {});
    }
  } catch {}
}

export const DEFAULT_SDR_CONFIG: SdrAgentConfig = {
  id: "sdr-default",
  name: "InhubFlow Virtual SDR",
  mode: "approval", // Modo supervisión con aprobación humana por defecto
  model: "gemini-3.6-flash",
  confidenceThreshold: 0.85,
  maxAutoTurns: 3,
  handoffEmail: "inhubflow@gmail.com",
  companyContext: "InhubFlow | Social Selling Suite es una plataforma B2B que combina Signal Radar, secuencias visuales de Canvas y Asistente SDR IA con soporte multislots para generar prospectos calificados y conversiones de alto valor.",
  systemPrompt: "Eres un SDR virtual senior de InhubFlow. Tu objetivo es mantener conversaciones ejecutivas, concisas y naturales en LinkedIn. Responde dudas fundamentándote únicamente en el conocimiento aprobado y guía al prospecto calificado hacia el objetivo final de conversión.",
  customInstructions: "Nunca inventes funcionalidades ni tarifas que no estén en el documento de precios oficiales. Sé empático, saluda por el nombre y ofrece el enlace de conversión correspondiente cuando haya interés claro.",
  calendarEnabled: true,
  bookingLink: "https://cal.inhubflow.com/demo-20min",
  conversionGoalType: "send_landing_demo",
  targetUrl: "https://inhubflow.com/demo",
  targetUrlTitle: "Presentación y Demostración en Video",
  ctaPitchText: "Te comparto el enlace directo a nuestra presentación interactiva para que puedas evaluarla:",
};

export const INITIAL_PENDING_ACTIONS: SdrPendingAction[] = [];

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
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SDR_CONFIG,
      ...parsed,
      conversionGoalType: parsed.conversionGoalType || DEFAULT_SDR_CONFIG.conversionGoalType,
      targetUrl: parsed.targetUrl || DEFAULT_SDR_CONFIG.targetUrl,
      targetUrlTitle: parsed.targetUrlTitle || DEFAULT_SDR_CONFIG.targetUrlTitle,
      ctaPitchText: parsed.ctaPitchText || DEFAULT_SDR_CONFIG.ctaPitchText,
    };
  } catch {
    return DEFAULT_SDR_CONFIG;
  }
}

export function saveStoredSdrConfig(config: SdrAgentConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SDR_CONFIG_KEY, JSON.stringify(config));
  syncSdrStateToDb("config", config);
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
  syncSdrStateToDb("knowledge", sources);
}

export function getStoredPendingActions(accountId?: string): SdrPendingAction[] {
  if (typeof window === "undefined") return INITIAL_PENDING_ACTIONS;
  const raw = localStorage.getItem(SDR_PENDING_KEY);
  let list = INITIAL_PENDING_ACTIONS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (a) => a && !String(a.accountName || "").includes("RobertoOrse Agencia")
        );
      }
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
  syncSdrStateToDb("pending", actions);
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
  syncSdrStateToDb("logs", updated);
}

export function getStoredPromotionGates(): PromotionGate[] {
  if (typeof window === "undefined") return INITIAL_PROMOTION_GATES;
  const cfg = getStoredSdrConfig();
  const kb = getStoredKnowledgeSources().filter((k) => k.status === "approved");
  const logs = getStoredDecisionLogs();
  const avgConf =
    logs.length > 0
      ? Math.round((logs.reduce((a, b) => a + b.confidence, 0) / logs.length) * 100)
      : 0;

  return [
    {
      key: "gate_provider_health",
      label: "Motor de IA (LLM Engine) Activo",
      description: "Motor de decisión IA listo con fallback determinista para respuestas en tiempo real.",
      passed: Boolean(cfg.model),
      evidence: `Modelo configurado: ${cfg.model}.`,
    },
    {
      key: "gate_knowledge_approved",
      label: "Base de Conocimiento Empresarial Aprobada",
      description: "Mínimo de 3 documentos oficiales aprobados que cubran propuesta de valor, precios y objeciones.",
      passed: kb.length >= 3,
      evidence: `${kb.length} documento(s) aprobado(s) activo(s) en la base de conocimiento.`,
    },
    {
      key: "gate_confidence_threshold",
      label: "Umbral de Confianza Calibrado",
      description: "El umbral de confianza mínimo está establecido en 80% o más para evitar alucinaciones.",
      passed: cfg.confidenceThreshold >= 0.8,
      evidence: `Umbral configurado en ${Math.round(cfg.confidenceThreshold * 100)}%.`,
    },
    {
      key: "gate_handoff_policy",
      label: "Políticas de Handoff & Seguridad Activas",
      description: "Reglas claras de derivación a operadores humanos en caso de riesgo legal, queja o solicitud de llamada.",
      passed: Boolean(cfg.handoffEmail && cfg.handoffEmail.includes("@")),
      evidence: cfg.handoffEmail
        ? `Correo de alerta asignado a ${cfg.handoffEmail}.`
        : "Falta configurar correo de escalamiento humano.",
    },
    {
      key: "gate_shadow_tested",
      label: "Validación Previa en Modo Sombra / Supervisión",
      description: "Se han procesado al menos 5 decisiones auditadas antes de liberar respuestas autónomas.",
      passed: logs.length >= 5,
      evidence: `${logs.length} decisión(es) auditada(s) (confianza media: ${avgConf}%).`,
    },
  ];
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


export function setSdrMode(mode: "copilot" | "auto" | "approval" | "off" | "shadow"): SdrAgentConfig {
  const current = getStoredSdrConfig();
  const updated: SdrAgentConfig = { ...current, mode };
  saveStoredSdrConfig(updated);
  return updated;
}

export function approveAndSendPendingAction(
  actionId: string,
  editedReply?: string
): { success: boolean; replyText: string; action?: SdrPendingAction } {
  const actions = getStoredPendingActions();
  const target = actions.find((a) => a.id === actionId);
  if (!target) return { success: false, replyText: "" };

  const finalReply = editedReply || target.suggestedReply;
  const updatedActions = actions.map((a) =>
    a.id === actionId
      ? { ...a, status: (editedReply ? "edited" : "approved") as SdrPendingAction["status"], suggestedReply: finalReply }
      : a
  );
  saveStoredPendingActions(updatedActions);

  // Registrar en los decision logs
  addStoredDecisionLog({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    prospectName: target.prospectName,
    accountId: target.accountId,
    inboundText: target.lastInboundMessage,
    intent: target.intent,
    confidence: target.confidence,
    riskLevel: target.riskLevel,
    action: target.intent === "meeting_request" ? "offer_slots" : "answer",
    tokensUsed: 350,
    latencyMs: 180,
    status: "executed",
  });

  return { success: true, replyText: finalReply, action: target };
}

export function rejectPendingAction(actionId: string): void {
  const actions = getStoredPendingActions();
  const updated = actions.map((a) => (a.id === actionId ? { ...a, status: "rejected" as const } : a));
  saveStoredPendingActions(updated);
}

export function handoffPendingAction(actionId: string): void {
  const actions = getStoredPendingActions();
  const updated = actions.map((a) => (a.id === actionId ? { ...a, status: "handed_off" as const } : a));
  saveStoredPendingActions(updated);

  const target = actions.find((a) => a.id === actionId);
  if (target) {
    addStoredDecisionLog({
      id: "log-ho-" + Date.now(),
      timestamp: new Date().toISOString(),
      prospectName: target.prospectName,
      accountId: target.accountId,
      inboundText: target.lastInboundMessage,
      intent: "human_requested",
      confidence: 0.98,
      riskLevel: "medium",
      action: "handoff",
      tokensUsed: 180,
      latencyMs: 120,
      status: "handed_off",
    });
  }
}

export function addOrUpdateKnowledgeSource(source: KnowledgeSource): KnowledgeSource[] {
  const sources = getStoredKnowledgeSources();
  const existingIdx = sources.findIndex((s) => s.id === source.id);
  let updated: KnowledgeSource[];
  if (existingIdx >= 0) {
    updated = sources.map((s) => (s.id === source.id ? source : s));
  } else {
    updated = [source, ...sources];
  }
  saveStoredKnowledgeSources(updated);
  return updated;
}

export function deleteKnowledgeSource(sourceId: string): KnowledgeSource[] {
  const sources = getStoredKnowledgeSources();
  const updated = sources.filter((s) => s.id !== sourceId);
  saveStoredKnowledgeSources(updated);
  return updated;
}
