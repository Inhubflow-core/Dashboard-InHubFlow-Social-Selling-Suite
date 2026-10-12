import { INITIAL_CONVERSATIONS } from "./mock-data";
import { ChatConversation, ChatMessage } from "./types";

const STORAGE_KEY = "inhubflow_inbox_conversations";

export function getInboxConversations(): ChatConversation[] {
  if (typeof window === "undefined") return INITIAL_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter((c: ChatConversation) => c && !/^conv-[1-3]$/.test(c.id));
    if (clean.length !== parsed.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
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

      // Si el usuario envia mensaje, actualizar ultimo mensaje
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

export function updateConversationStage(
  conversationId: string,
  newStage: string,
  newStageId: string
): ChatConversation[] {
  const list = getInboxConversations();
  const updated = list.map((c) => {
    if (c.id === conversationId) {
      return {
        ...c,
        crmStage: newStage,
        crmStageId: newStageId,
      };
    }
    return c;
  });

  saveInboxConversations(updated);
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

export function addIncomingMessageToConversation(
  conversationIdOrLeadName: string,
  text: string,
  senderName?: string,
  senderProfileUrl?: string
): ChatConversation[] {
  const list = getInboxConversations();
  const existingIndex = list.findIndex(
    (c) =>
      c.id === conversationIdOrLeadName ||
      (senderName && c.leadName.toLowerCase() === senderName.toLowerCase())
  );

  const incomingMsg: ChatMessage = {
    id: "msg-in-" + Date.now(),
    senderId: "lead",
    senderName: senderName || "Contacto de LinkedIn",
    isSender: false,
    text,
    timestamp: "Recién recibido",
  };

  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    const updatedConv: ChatConversation = {
      ...existing,
      unread: true,
      lastMessage: text,
      lastMessageTime: "Recién recibido",
      messages: [...existing.messages, incomingMsg],
      aiSuggestions: [
        `Hola ${existing.leadName.split(" ")[0]}, gracias por responder. Con gusto te comparto el recurso solicitado y te propongo coordinar una breve llamada de 15 min esta semana para ver los detalles.`,
        `¡Excelente ${existing.leadName.split(" ")[0]}! Te dejo mi calendario para agendar cuando te quede cómodo: https://cal.inhubflow.com/demo-20min`,
      ],
    };

    const updated = [
      updatedConv,
      ...list.filter((_, idx) => idx !== existingIndex),
    ];
    saveInboxConversations(updated);
    return updated;
  }

  // Si no existía, crear nueva conversación
  const initials = senderName
    ? senderName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "LI";

  const newLeadConv: ChatConversation = {
    id: `conv-in-${Date.now()}`,
    leadId: `lead-${Date.now()}`,
    leadName: senderName || "Contacto de LinkedIn",
    leadTitle: "Decisor Comercial",
    company: "Empresa B2B",
    location: "Madrid, España",
    avatarInitials: initials,
    campaignSource: "Signal Radar - Palabras Clave",
    crmStage: "4. Conversacion Activa / Interesado",
    crmStageId: "interested",
    unread: true,
    lastMessage: text,
    lastMessageTime: "Recién recibido",
    messages: [incomingMsg],
    aiSuggestions: [
      `Hola ${senderName ? senderName.split(" ")[0] : "estimado"}, gracias por tu interés. ¿Te vendría bien agendar una videollamada de 15 min para revisar cómo implementar esto en tu equipo?`,
      `Te adjunto el documento solicitado para que lo revises con tu equipo comercial.`,
    ],
  };

  const updated = [newLeadConv, ...list];
  saveInboxConversations(updated);
  return updated;
}

