import { getStoredLeads, markLeadAsRepliedInCampaign, updateStoredLeadStage } from "@/lib/leads/store";
import type { CrmStage, Lead360Item } from "@/lib/leads/types";
import { ChatConversation, ChatMessage } from "./types";
import { runSdrDecision } from "@/lib/sdr/simulation-engine";
import {
  addStoredDecisionLog,
  addStoredPendingAction,
  getStoredKnowledgeSources,
  getStoredSdrConfig,
} from "@/lib/sdr/store";

const STORAGE_KEY = "inhubflow_inbox_conversations";

/**
 * Busca si un remitente o prospecto pertenece a los leads captados/enrolados en las campañas.
 * Regla de negocio: El Inbox es exclusivamente comercial y solo admite leads provenientes de campañas.
 */
export function findCampaignLead(identifier: {
  leadId?: string;
  senderName?: string;
  senderProfileUrl?: string;
}): Lead360Item | null {
  const leads = getStoredLeads();
  if (!leads || leads.length === 0) return null;

  // 1. Coincidencia por ID exacto
  if (identifier.leadId) {
    const found = leads.find((l) => l.id === identifier.leadId);
    if (found) return found;
  }

  // 2. Coincidencia por URL de perfil de LinkedIn
  if (identifier.senderProfileUrl) {
    const cleanUrl = identifier.senderProfileUrl.toLowerCase().trim().replace(/\/$/, "");
    const found = leads.find((l) => {
      const lUrl = (l.linkedinUrl || "").toLowerCase().trim().replace(/\/$/, "");
      return lUrl && (lUrl === cleanUrl || lUrl.includes(cleanUrl) || cleanUrl.includes(lUrl));
    });
    if (found) return found;
  }

  // 3. Coincidencia por Nombre completo normalizado
  if (identifier.senderName) {
    const targetName = identifier.senderName.toLowerCase().trim();
    const found = leads.find((l) => {
      const lName = (l.fullName || "").toLowerCase().trim();
      return lName === targetName || lName.includes(targetName) || targetName.includes(lName);
    });
    if (found) return found;
  }

  return null;
}

function mapInboxStageToCrmStage(stageId: string): CrmStage {
  switch (stageId) {
    case "interested":
    case "active_conversation":
      return "active_conversation";
    case "proposal_sent":
    case "proposal_presented":
      return "proposal_presented";
    case "won":
    case "closed_won":
      return "closed_won";
    case "lead_captured":
      return "lead_captured";
    case "in_sequence":
      return "in_sequence";
    case "connected_material_sent":
      return "connected_material_sent";
    case "meeting_scheduled":
      return "meeting_scheduled";
    default:
      return "active_conversation";
  }
}

/**
 * Genera la conversación inicial legítima para prospectos que ya están activos en campañas.
 */
function getInitialCampaignConversations(): ChatConversation[] {
  const leads = getStoredLeads();
  // Tomar el lead verificado de campaña de prueba (Roberto OrSe) o leads en secuencia
  const activeLead = leads.find(
    (l) =>
      l.id === "lead-roberto-orse" ||
      l.fullName.toLowerCase().includes("roberto orse") ||
      l.sequenceStatus === "replied" ||
      l.stage === "active_conversation" ||
      (l.stage as string) === "interested"
  );

  if (!activeLead) return [];

  const initials = activeLead.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sampleConv: ChatConversation = {
    id: `conv-${activeLead.id}`,
    leadId: activeLead.id,
    leadName: activeLead.fullName,
    leadTitle: activeLead.title,
    company: activeLead.company,
    location: activeLead.location || "Brasil",
    avatarInitials: initials,
    campaignSource: activeLead.listName || "02. Secuencia: Lead Magnet",
    leadMagnetUsed: "SISTEMA",
    crmStage: "4. Conversacion Activa / Interesado",
    crmStageId: "interested",
    unread: false,
    lastMessage: "¡Excelente Roberto! Me interesa mucho revisar el framework de Social Selling.",
    lastMessageTime: "Hace 15 min",
    aiSuggestions: [
      `Hola ${activeLead.fullName.split(" ")[0]}, te acabo de enviar el framework completo en PDF. ¿Te viene bien una breve llamada de 15 min esta semana para ver cómo implementarlo en tu equipo?`,
      `¡Genial ${activeLead.fullName.split(" ")[0]}! Te comparto mi enlace de Cal.com para coordinar directo: https://cal.inhubflow.com/demo-20min`,
      `Perfecto ${activeLead.fullName.split(" ")[0]}, te dejo un audio explicándote los 3 pilares clave del método.`,
    ],
    messages: [
      {
        id: "msg-init-1",
        senderId: "user",
        senderName: "Roberto",
        isSender: true,
        text: `Hola ${activeLead.fullName.split(" ")[0]}, vi tu comentario en mi post sobre prospección con IA. Aquí tienes el framework SISTEMA que me pediste.`,
        timestamp: "Ayer 18:30",
        attachment: {
          name: "Framework_SISTEMA_Social_Selling.pdf",
          type: "pdf",
          size: "2.4 MB",
        },
      },
      {
        id: "msg-init-2",
        senderId: "lead",
        senderName: activeLead.fullName,
        isSender: false,
        text: "¡Excelente Roberto! Me interesa mucho revisar el framework de Social Selling.",
        timestamp: "Hace 15 min",
      },
    ],
  };

  return [sampleConv];
}

export function getInboxConversations(): ChatConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialCampaignConversations();
      if (initial.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Limpiar conversaciones antiguas genéricas que no correspondan a campañas
    const clean = parsed.filter(
      (c: ChatConversation) =>
        c &&
        !/^conv-[1-3]$/.test(c.id) &&
        c.leadName !== "Contacto de LinkedIn" &&
        c.company !== "Empresa B2B"
    );

    if (clean.length === 0) {
      const initial = getInitialCampaignConversations();
      if (initial.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
    }

    if (clean.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch {
    return [];
  }
}

export function saveInboxConversations(conversations: ChatConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // ignore
  }
}

/**
 * Envío de mensaje desde el Inbox por el usuario hacia el lead de la campaña.
 */
export function sendMessageToConversation(
  conversationId: string,
  text: string,
  attachment?: { name: string; type: "pdf" | "audio" | "image"; size?: string }
): ChatConversation[] {
  const list = getInboxConversations();
  const updated = list.map((c) => {
    if (c.id === conversationId) {
      const newMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        senderId: "user",
        senderName: "Roberto",
        isSender: true,
        text,
        timestamp: "Ahora",
        attachment,
      };

      return {
        ...c,
        lastMessage: text || (attachment ? `Archivo adjunto: ${attachment.name}` : "Mensaje enviado"),
        lastMessageTime: "Ahora",
        messages: [...c.messages, newMsg],
      };
    }
    return c;
  });

  saveInboxConversations(updated);
  return updated;
}

/**
 * Registro de mensajes salientes enviados automáticamente por las campañas de Social Selling.
 * Conecta las secuencias de campaña con el Inbox unificado.
 */
export function recordOutgoingCampaignMessage(params: {
  leadId: string;
  leadName: string;
  leadTitle?: string;
  company?: string;
  location?: string;
  campaignName: string;
  leadMagnetUsed?: string;
  messageText: string;
  attachment?: { name: string; type: "pdf" | "audio" | "image"; size?: string };
}): ChatConversation[] {
  const list = getInboxConversations();
  const existingIndex = list.findIndex(
    (c) =>
      c.leadId === params.leadId ||
      c.leadName.toLowerCase().trim() === params.leadName.toLowerCase().trim()
  );

  const newMsg: ChatMessage = {
    id: "msg-camp-" + Date.now(),
    senderId: "user",
    senderName: "Roberto",
    isSender: true,
    text: params.messageText,
    timestamp: "Ahora",
    attachment: params.attachment,
  };

  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    const updatedConv: ChatConversation = {
      ...existing,
      lastMessage: params.messageText,
      lastMessageTime: "Ahora",
      messages: [...existing.messages, newMsg],
    };
    const updated = [updatedConv, ...list.filter((_, idx) => idx !== existingIndex)];
    saveInboxConversations(updated);
    return updated;
  }

  const initials = params.leadName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const newConv: ChatConversation = {
    id: `conv-${params.leadId}`,
    leadId: params.leadId,
    leadName: params.leadName,
    leadTitle: params.leadTitle || "Decisor Comercial",
    company: params.company || "Empresa",
    location: params.location || "Global",
    avatarInitials: initials,
    campaignSource: params.campaignName,
    leadMagnetUsed: params.leadMagnetUsed,
    crmStage: "2. En Secuencia",
    crmStageId: "in_sequence",
    unread: false,
    lastMessage: params.messageText,
    lastMessageTime: "Ahora",
    messages: [newMsg],
    aiSuggestions: [
      `Hola ${params.leadName.split(" ")[0]}, ¿pudiste revisar el recurso que te compartí?`,
      `Hola ${params.leadName.split(" ")[0]}, quedo a tu disposición por si tienes alguna consulta sobre cómo aplicarlo.`,
    ],
  };

  const updated = [newConv, ...list];
  saveInboxConversations(updated);
  return updated;
}

/**
 * Actualiza la etapa CRM tanto en la conversación de Inbox como en el CRM central de leads.
 */
export function updateConversationStage(
  conversationId: string,
  newStage: string,
  newStageId: string
): ChatConversation[] {
  const list = getInboxConversations();
  let targetLeadId: string | null = null;

  const updated = list.map((c) => {
    if (c.id === conversationId) {
      targetLeadId = c.leadId;
      return {
        ...c,
        crmStage: newStage,
        crmStageId: newStageId,
      };
    }
    return c;
  });

  saveInboxConversations(updated);

  // Sincronizar en el almacén de leads 360 si hay leadId asociado
  if (targetLeadId) {
    try {
      updateStoredLeadStage(targetLeadId, mapInboxStageToCrmStage(newStageId), `Cambio de etapa desde Inbox a: ${newStage}`);
    } catch (err) {
      console.warn("[Inbox] Error sincronizando etapa con LeadStore:", err);
    }
  }

  return updated;
}

export function markConversationAsRead(conversationId: string): ChatConversation[] {
  const list = getInboxConversations();
  const updated = list.map((c) => {
    if (c.id === conversationId) {
      return {
        ...c,
        unread: false,
      };
    }
    return c;
  });

  saveInboxConversations(updated);
  return updated;
}

/**
 * Procesa un mensaje entrante de LinkedIn.
 * REGLA ESTRICTA DE NEGOCIO:
 * Solo se admiten mensajes de prospectos provenientes de las campañas activas o captados por el Radar.
 * Si el remitente no pertenece a ninguna campaña, el mensaje es ignorado/descartado del Inbox comercial.
 */
export function addIncomingMessageToConversation(
  conversationIdOrLeadName: string,
  text: string,
  senderName?: string,
  senderProfileUrl?: string
): ChatConversation[] {
  const sdrConfig = getStoredSdrConfig();
  const knowledgeSources = getStoredKnowledgeSources();
  const isAutoPilot = sdrConfig.mode === "auto";
  const list = getInboxConversations();
  const existingIndex = list.findIndex(
    (c) =>
      c.id === conversationIdOrLeadName ||
      c.leadId === conversationIdOrLeadName ||
      (senderName && c.leadName.toLowerCase().trim() === senderName.toLowerCase().trim())
  );

  const incomingMsg: ChatMessage = {
    id: "msg-in-" + Date.now(),
    senderId: "lead",
    senderName: senderName || "Prospecto de Campaña",
    isSender: false,
    text,
    timestamp: "Recién recibido",
  };

  // CASO 1: Conversación existente en el Inbox
  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    const leadFirstName = existing.leadName.split(" ")[0] || "estimado";

    const sdrDecision = runSdrDecision({
      inboundText: text,
      senderName: existing.leadName,
      senderCompany: existing.company,
      senderHeadline: existing.leadTitle,
      senderLocation: existing.location,
      config: sdrConfig,
      knowledgeSources,
    });

    let newMessages = [...existing.messages, incomingMsg];
    let lastMsgText = text;

    // Si está en Modo Automático (Piloto Automático) y no requiere handoff, responder de inmediato
    if (isAutoPilot && !sdrDecision.requiresHuman && sdrDecision.replyDraft) {
      const autoReplyMsg: ChatMessage = {
        id: "msg-sdr-auto-" + Date.now(),
        senderId: "sdr_ai",
        senderName: "InHubFlow SDR IA (Autopilot)",
        isSender: true,
        text: sdrDecision.replyDraft,
        timestamp: "Ahora mismo (Automático)",
      };
      newMessages.push(autoReplyMsg);
      lastMsgText = sdrDecision.replyDraft;

      addStoredDecisionLog({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        prospectName: existing.leadName,
        accountId: "acc-main",
        inboundText: text,
        intent: sdrDecision.intent,
        confidence: sdrDecision.confidence,
        riskLevel: sdrDecision.riskLevel,
        action: sdrDecision.recommendedAction,
        tokensUsed: 380,
        latencyMs: sdrDecision.latencyMs,
        status: "executed",
      });
    } else {
      // Modo Copiloto: encolar para supervisión y generar sugerencias ricas
      addStoredPendingAction({
        id: "act-" + Date.now(),
        threadId: existing.id,
        accountId: "acc-main",
        accountName: "RobertoOrse Agencia",
        prospectName: existing.leadName,
        prospectTitle: existing.leadTitle,
        prospectCompany: existing.company,
        lastInboundMessage: text,
        intent: sdrDecision.intent,
        confidence: sdrDecision.confidence,
        riskLevel: sdrDecision.riskLevel,
        suggestedReply: sdrDecision.replyDraft,
        citations: sdrDecision.citations,
        createdAt: new Date().toISOString(),
        status: sdrDecision.requiresHuman ? "handed_off" : "pending",
      });
    }

    const detectedLang = sdrDecision.detectedLanguage || "es";
    let defaultSuggestions: string[];
    if (detectedLang === "pt") {
      defaultSuggestions = [
        sdrDecision.replyDraft || `Olá ${leadFirstName}, obrigado pelo retorno! Com prazer te compartilho os detalhes solicitados.`,
        `Excelente ${leadFirstName}! Você pode escolher o melhor horário na minha agenda de 20 min: https://cal.inhubflow.com/demo-20min`,
        `Olá ${leadFirstName}, te envio este breve documento para você avaliar com seu time comercial.`,
      ];
    } else if (detectedLang === "en") {
      defaultSuggestions = [
        sdrDecision.replyDraft || `Hi ${leadFirstName}, thanks for replying! Happy to share the details you requested.`,
        `Awesome ${leadFirstName}! Feel free to pick a time on my 20-min calendar: https://cal.inhubflow.com/demo-20min`,
        `Hi ${leadFirstName}, sharing this quick overview document for you and your team to review.`,
      ];
    } else {
      defaultSuggestions = [
        sdrDecision.replyDraft || `Hola ${leadFirstName}, gracias por responder. Con gusto te comparto los detalles solicitados.`,
        `¡Excelente ${leadFirstName}! Puedes elegir el mejor horario directamente en mi calendario de 20 min: https://cal.inhubflow.com/demo-20min`,
        `Hola ${leadFirstName}, te comparto este breve documento para que revises con tu equipo comercial.`,
      ];
    }

    const updatedConv: ChatConversation = {
      ...existing,
      unread: !isAutoPilot,
      lastMessage: lastMsgText,
      lastMessageTime: "Recién recibido",
      crmStage: sdrDecision.intent === "meeting_request" ? "5. Reunion Agendada" : "4. Conversacion Activa / Interesado",
      crmStageId: sdrDecision.intent === "meeting_request" ? "meeting_scheduled" : "interested",
      messages: newMessages,
      aiSuggestions: defaultSuggestions,
    };

    const updated = [updatedConv, ...list.filter((_, idx) => idx !== existingIndex)];
    saveInboxConversations(updated);

    // Regla Stop on Reply: detener la campaña y marcar como respondido en el CRM
    markLeadAsRepliedInCampaign(existing.leadId || existing.leadName, text);

    return updated;
  }

  // CASO 2: Nueva conversación. VALIDACIÓN ESTRICTA DE CAMPAÑAS.
  const campaignLead = findCampaignLead({
    leadId: conversationIdOrLeadName,
    senderName,
    senderProfileUrl,
  });

  if (!campaignLead) {
    // FILTRADO ESTRICTO: Si no es un lead de campaña, se rechaza
    console.warn(
      `[Inbox Comercial] Mensaje ignorado de "${senderName || conversationIdOrLeadName}": Remitente no pertenece a ninguna campaña activa de Social Selling.`
    );
    return list;
  }

  // Si pertenece a una campaña, se crea la conversación con los datos reales del lead
  const initials = campaignLead.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const leadFirstName = campaignLead.fullName.split(" ")[0] || "estimado";
  const campaignSource =
    campaignLead.listName ||
    campaignLead.signalSource ||
    (campaignLead.signalLevel === "level_1"
      ? "02. Secuencia: Lead Magnet"
      : "01. Secuencia: Listas de Leads");

  const sdrDecision = runSdrDecision({
    inboundText: text,
    senderName: campaignLead.fullName,
    senderCompany: campaignLead.company,
    config: sdrConfig,
    knowledgeSources,
  });

  let newMessages = [incomingMsg];
  let lastMsgText = text;

  // Si está en Modo Automático (Piloto Automático) y no requiere handoff, responder de inmediato
  if (isAutoPilot && !sdrDecision.requiresHuman && sdrDecision.replyDraft) {
    const autoReplyMsg: ChatMessage = {
      id: "msg-sdr-auto-" + Date.now(),
      senderId: "sdr_ai",
      senderName: "InHubFlow SDR IA (Autopilot)",
      isSender: true,
      text: sdrDecision.replyDraft,
      timestamp: "Ahora mismo (Automático)",
    };
    newMessages.push(autoReplyMsg);
    lastMsgText = sdrDecision.replyDraft;

    addStoredDecisionLog({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      prospectName: campaignLead.fullName,
      accountId: "acc-main",
      inboundText: text,
      intent: sdrDecision.intent,
      confidence: sdrDecision.confidence,
      riskLevel: sdrDecision.riskLevel,
      action: sdrDecision.recommendedAction,
      tokensUsed: 380,
      latencyMs: sdrDecision.latencyMs,
      status: "executed",
    });
  } else {
    // Modo Copiloto: encolar para supervisión
    addStoredPendingAction({
      id: "act-" + Date.now(),
      threadId: `conv-${campaignLead.id}`,
      accountId: "acc-main",
      accountName: "RobertoOrse Agencia",
      prospectName: campaignLead.fullName,
      prospectTitle: campaignLead.title,
      prospectCompany: campaignLead.company,
      lastInboundMessage: text,
      intent: sdrDecision.intent,
      confidence: sdrDecision.confidence,
      riskLevel: sdrDecision.riskLevel,
      suggestedReply: sdrDecision.replyDraft,
      citations: sdrDecision.citations,
      createdAt: new Date().toISOString(),
      status: sdrDecision.requiresHuman ? "handed_off" : "pending",
    });
  }

  const defaultSuggestions = [
    sdrDecision.replyDraft || `Hola ${leadFirstName}, gracias por contactarme. ¿Cómo podemos ayudarte con tus objetivos de prospección?`,
    `¡Excelente ${leadFirstName}! Puedes elegir el mejor horario directamente en mi calendario de 20 min: https://cal.inhubflow.com/demo-20min`,
    `Hola ${leadFirstName}, te adjunto la metodología en PDF para que la evalúes con tu equipo.`,
  ];

  const newLeadConv: ChatConversation = {
    id: `conv-${campaignLead.id}`,
    leadId: campaignLead.id,
    leadName: campaignLead.fullName,
    leadTitle: campaignLead.title || "Decisor Comercial",
    company: campaignLead.company || "Empresa B2B",
    location: campaignLead.location || "Global",
    avatarInitials: initials,
    campaignSource,
    leadMagnetUsed: campaignLead.signalLevel === "level_1" ? "SISTEMA" : undefined,
    crmStage: sdrDecision.intent === "meeting_request" ? "5. Reunion Agendada" : "4. Conversacion Activa / Interesado",
    crmStageId: sdrDecision.intent === "meeting_request" ? "meeting_scheduled" : "interested",
    unread: !isAutoPilot,
    lastMessage: lastMsgText,
    lastMessageTime: "Recién recibido",
    messages: newMessages,
    aiSuggestions: defaultSuggestions,
  };

  const updated = [newLeadConv, ...list];
  saveInboxConversations(updated);

  // Detener la campaña y actualizar etapa a Interesado (Stop on Reply)
  markLeadAsRepliedInCampaign(campaignLead.id, text);

  return updated;
}
