"use client";

import { defaultCampaignEdges, defaultCampaignNodes } from "./templates";
import type { CampaignWorkflow, LinearSequenceCampaign, SequenceStepItem } from "./types";

const WORKFLOW_KEY = "inhubflow_active_campaign";
const LINEAR_CAMPAIGNS_KEY = "inhubflow_linear_campaigns";

export const initialWorkflow: CampaignWorkflow = {
  id: "wf-01",
  name: "Secuencia Lead Magnet InHubFlow (Nivel 1 - SISTEMA)",
  description: "Captura de leads por comentarios en post propio, entrega de PDF y follow-up multietapa.",
  status: "active",
  dailyInvitationLimit: 25,
  dailyDmLimit: 40,
  jitterMinMinutes: 3,
  jitterMaxMinutes: 12,
  stopOnReply: true,
  nodesJson: JSON.stringify(defaultCampaignNodes),
  edgesJson: JSON.stringify(defaultCampaignEdges),
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-07T12:00:00.000Z",
};

export const defaultListsSequenceSteps: SequenceStepItem[] = [
  {
    id: "step-lists-01",
    order: 1,
    type: "visit",
    title: "Visitar Perfil",
    description: "Visita el perfil en LinkedIn para figurar en las notificaciones del prospecto y generar visibilidad previa.",
    delayDaysBefore: 0,
  },
  {
    id: "step-lists-02",
    order: 2,
    type: "like_comment",
    title: "Like + Comentario",
    description: "Interactúa con la publicación más reciente del prospecto con una reacción de Like y un comentario de valor.",
    delayDaysBefore: 1,
    commentTemplate: "Gran perspectiva {{first_name}}, totalmente alineado con este enfoque.",
    useAiComment: true,
  },
  {
    id: "step-lists-03",
    order: 3,
    type: "connect",
    title: "Seguir + Conectar",
    description: "Sigue el perfil en LinkedIn y envía solicitud de conexión con nota contextual en una sola acción.",
    delayDaysBefore: 1,
    connectNote: "Hola {{first_name}}, vi tu actividad sobre {{topic}} y me pareció muy interesante. Me encantaría conectar por aquí.",
  },
  {
    id: "step-lists-04",
    order: 4,
    type: "message_icebreaker",
    title: "Mensaje DM 01 'Icebreakers'",
    description: "Mensaje inicial contextualizado directamente desde el monitor de Signal Radar.",
    delayDaysBefore: 1,
    isInheritedFromMonitor: true,
    messageTemplate: "Hola {{first_name}}, vi tu interacción en la publicación sobre {{topic}} de {{author_name}} y me pareció un punto clave. ¿Cómo lo están abordando en {{company}}?",
  },
  {
    id: "step-lists-05",
    order: 5,
    type: "message_followup",
    title: "Mensaje DM 02 'Follow-up'",
    description: "Seguimiento consultivo y profundización en el reto comercial o dolor detectado.",
    delayDaysBefore: 1,
    messageTemplate: "Hola {{first_name}}, te comparto este caso breve sobre cómo resolver {{topic}} sin quemar tu dominio ni depender de prospección invasiva. ¿Te hace sentido?",
  },
  {
    id: "step-lists-06",
    order: 6,
    type: "message_value_prop",
    title: "Mensaje DM 03 'Value Prop'",
    description: "Propuesta de valor y llamado suave a la acción para agendar una sesión de diagnóstico de 15 minutos.",
    delayDaysBefore: 1,
    messageTemplate: "Hola {{first_name}}, si estás evaluando optimizar este trimestre el pipeline de {{company}}, me encantaría compartirte una demo rápida de 15 min de nuestro sistema. ¿Cómo ves tu agenda este jueves?",
  },
];

export const defaultLeadMagnetSequenceSteps: SequenceStepItem[] = [
  {
    id: "step-magnet-01",
    order: 1,
    type: "connect_message",
    title: "Seguir + Conectar",
    description: "Sigue el perfil y envía solicitud de conexión indicando el motivo de entrega del material solicitado en el post.",
    delayDaysBefore: 0,
    isInheritedFromMonitor: true,
    connectNote: "Hola {{first_name}}, vi que comentaste {{keyword}} en mi post. Te estoy solicitando conectar contigo para entregarte el recurso por mensaje privado.",
  },
  {
    id: "step-magnet-02",
    order: 2,
    type: "message_icebreaker",
    title: "Mensaje DM 01 'Icebreakers'",
    description: "Entrega del material prometido (PDF o enlace oficial del recurso).",
    delayDaysBefore: 1,
    isInheritedFromMonitor: true,
    messageTemplate: "Hola {{first_name}}, aquí tienes el material que te ofrecí sobre el sistema de prospección B2B: {{attached_resource}}. Espero que te sea de gran utilidad.",
    attachedResource: "Framework-Prospeccion-B2B-InHubFlow.pdf",
    attachmentType: "document",
    attachmentName: "Framework-Prospeccion-B2B-InHubFlow.pdf",
  },
  {
    id: "step-magnet-03",
    order: 3,
    type: "message_followup",
    title: "Mensaje DM 02 'Follow-up'",
    description: "Verificación de lectura y apertura de conversación consultiva.",
    delayDaysBefore: 1,
    messageTemplate: "Hola {{first_name}}, ¿pudiste revisar el documento? Quería saber qué parte del sistema te llamó más la atención para aplicarlo en {{company}}.",
  },
  {
    id: "step-magnet-04",
    order: 4,
    type: "message_value_prop",
    title: "Mensaje DM 03 'Value Prop'",
    description: "Propuesta de auditoría personalizada o sesión de diagnóstico.",
    delayDaysBefore: 1,
    messageTemplate: "Hola {{first_name}}, si quieres que auditemos juntos cómo aterrizar este sistema directamente en {{company}}, podemos agendar una sesión de 15 minutos esta semana. ¿Tienes un hueco libre?",
  },
];

export const initialLinearCampaigns: LinearSequenceCampaign[] = [
  {
    id: "seq-lead-lists",
    name: "01. Secuencia: Listas de Leads",
    code: "01_lists",
    triggerTitle: "Activador: Entrar en la lista",
    triggerDescription: "Se dispara automáticamente cuando un prospecto entra en una lista inteligente de Signal Radar.",
    status: "active",
    steps: defaultListsSequenceSteps,
    dailyLimits: {
      maxVisitsPerDay: 20,
      maxConnectionsPerDay: 20,
      maxMessagesPerDay: 20,
    },
    stopOnReply: true,
    workingHoursOnly: true,
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-21T14:30:00.000Z",
  },
  {
    id: "seq-lead-magnet",
    name: "02. Secuencia: Lead Magnet",
    code: "02_lead_magnet",
    triggerTitle: "Activador: Entrar en la lista",
    triggerDescription: "Se dispara cuando el prospecto comenta la palabra clave (ej: SISTEMA) en tu publicación Lead Magnet de Nivel 1.",
    status: "active",
    steps: defaultLeadMagnetSequenceSteps,
    dailyLimits: {
      maxVisitsPerDay: 20,
      maxConnectionsPerDay: 20,
      maxMessagesPerDay: 20,
    },
    stopOnReply: true,
    workingHoursOnly: true,
    createdAt: "2026-10-19T10:00:00.000Z",
    updatedAt: "2026-10-21T14:30:00.000Z",
  },
];

export function sanitizeUnipileText(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/mediante\s+Unipile/gi, "")
    .replace(/a\s+través\s+de\s+Unipile/gi, "")
    .replace(/vía\s+Unipile/gi, "")
    .replace(/por\s+Unipile/gi, "")
    .replace(/con\s+Unipile/gi, "")
    .replace(/Unipile/gi, "LinkedIn")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizeSequenceStep(step: SequenceStepItem): SequenceStepItem {
  let title = sanitizeUnipileText(step.title);
  if (title === "Solicitar Conexión" || title === "Solicitar Conexión + Mensaje") {
    title = "Seguir + Conectar";
  } else if (title === "Like + Comentar" || title === "Dar Like y Comentar") {
    title = "Like + Comentario";
  }
  return {
    ...step,
    title,
    description: sanitizeUnipileText(step.description),
    messageTemplate: step.messageTemplate ? sanitizeUnipileText(step.messageTemplate) : step.messageTemplate,
    commentTemplate: step.commentTemplate ? sanitizeUnipileText(step.commentTemplate) : step.commentTemplate,
    connectNote: step.connectNote ? sanitizeUnipileText(step.connectNote) : step.connectNote,
  };
}

export function sanitizeLinearCampaign(campaign: LinearSequenceCampaign): LinearSequenceCampaign {
  const sanitizedName = sanitizeUnipileText(campaign.name)
    .replace(/\s*\(Palabra Clave SISTEMA\)/gi, "")
    .trim();

  const sanitizedTriggerDesc = sanitizeUnipileText(campaign.triggerDescription)
    .replace(/\s*\(Competencia,\s*Grupos\s*o\s*Globales\)/gi, "")
    .trim();

  const steps = Array.isArray(campaign.steps)
    ? campaign.steps.map((s, idx) => {
        const clean = sanitizeSequenceStep(s);
        if (idx === 0) {
          return { ...clean, delayDaysBefore: 0 };
        }
        // Retardo por defecto unificado en 1 día si proviene de plantillas iniciales con 2 o 3 días
        if (clean.delayDaysBefore > 1 && (clean.id.startsWith("step-lists-") || clean.id.startsWith("step-magnet-"))) {
          return { ...clean, delayDaysBefore: 1 };
        }
        return clean;
      })
    : [];

  return {
    ...campaign,
    name: sanitizedName,
    triggerTitle: sanitizeUnipileText(campaign.triggerTitle),
    triggerDescription: sanitizedTriggerDesc,
    steps,
  };
}

export function getStoredLinearCampaigns(): LinearSequenceCampaign[] {
  if (typeof window === "undefined") return initialLinearCampaigns;
  try {
    const raw = localStorage.getItem(LINEAR_CAMPAIGNS_KEY);
    if (!raw) {
      localStorage.setItem(LINEAR_CAMPAIGNS_KEY, JSON.stringify(initialLinearCampaigns));
      return initialLinearCampaigns;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LINEAR_CAMPAIGNS_KEY, JSON.stringify(initialLinearCampaigns));
      return initialLinearCampaigns;
    }
    const sanitized = parsed.map(sanitizeLinearCampaign);
    if (
      /unipile/i.test(raw) ||
      /Palabra Clave SISTEMA/i.test(raw) ||
      /Competencia,\s*Grupos\s*o\s*Globales/i.test(raw) ||
      /Solicitar Conexión/i.test(raw) ||
      /Like \+ Comentar/i.test(raw) ||
      /Dar Like y Comentar/i.test(raw) ||
      raw.includes('"delayDaysBefore":2') ||
      raw.includes('"delayDaysBefore":3')
    ) {
      try {
        localStorage.setItem(LINEAR_CAMPAIGNS_KEY, JSON.stringify(sanitized));
      } catch {}
    }
    return sanitized;
  } catch {
    return initialLinearCampaigns;
  }
}

export function saveStoredLinearCampaigns(campaigns: LinearSequenceCampaign[]): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = campaigns.map(sanitizeLinearCampaign);
    localStorage.setItem(LINEAR_CAMPAIGNS_KEY, JSON.stringify(sanitized));
  } catch {}
}

export function getStoredWorkflow(): CampaignWorkflow {
  if (typeof window === "undefined") return initialWorkflow;
  try {
    const raw = localStorage.getItem(WORKFLOW_KEY);
    if (!raw) {
      localStorage.setItem(WORKFLOW_KEY, JSON.stringify(initialWorkflow));
      return initialWorkflow;
    }
    if (/unipile/i.test(raw)) {
      const sanitizedRaw = raw
        .replace(/mediante\s+Unipile/gi, "")
        .replace(/a\s+través\s+de\s+Unipile/gi, "")
        .replace(/vía\s+Unipile/gi, "")
        .replace(/por\s+Unipile/gi, "")
        .replace(/con\s+Unipile/gi, "")
        .replace(/Unipile/gi, "LinkedIn");
      try {
        localStorage.setItem(WORKFLOW_KEY, sanitizedRaw);
      } catch {}
      return JSON.parse(sanitizedRaw);
    }
    return JSON.parse(raw);
  } catch {
    return initialWorkflow;
  }
}

export function saveStoredWorkflow(wf: CampaignWorkflow): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = {
      ...wf,
      name: sanitizeUnipileText(wf.name),
      description: sanitizeUnipileText(wf.description),
      nodesJson: wf.nodesJson ? wf.nodesJson.replace(/mediante\s+Unipile/gi, "").replace(/Unipile/gi, "LinkedIn API") : wf.nodesJson,
    };
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify(sanitized));
  } catch {}
}
