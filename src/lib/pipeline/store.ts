import { getStoredLeads, saveStoredLeads, updateStoredLeadStage } from "@/lib/leads/store";
import type { CrmStage, Lead360Item } from "@/lib/leads/types";
import { INITIAL_DEALS, PIPELINE_STAGES } from "./mock-data";
import { PipelineDeal, PipelineStageId } from "./types";

const DEALS_STORAGE_KEY = "inhubflow_pipeline_deals";
const DELETED_DEALS_STORAGE_KEY = "inhubflow_pipeline_deleted_deals";

function getDeletedDealIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_DEALS_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDeletedDealIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DELETED_DEALS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function mapCrmStageToPipelineStage(crmStage: CrmStage | string): PipelineStageId {
  switch (crmStage) {
    case "lead_captured":
      return "lead_captured";
    case "in_sequence":
      return "in_sequence";
    case "connected_material_sent":
      return "connected_material_sent";
    case "active_conversation":
    case "interested":
      return "interested";
    case "meeting_scheduled":
      return "meeting_scheduled";
    case "proposal_presented":
    case "proposal_sent":
      return "proposal_sent";
    case "closed_won":
    case "won":
      return "closed_won";
    case "closed_lost":
      return "closed_lost";
    default:
      return "lead_captured";
  }
}

export function mapPipelineStageToCrmStage(pipelineStage: PipelineStageId): CrmStage {
  switch (pipelineStage) {
    case "lead_captured":
      return "lead_captured";
    case "in_sequence":
      return "in_sequence";
    case "connected_material_sent":
      return "connected_material_sent";
    case "interested":
      return "active_conversation";
    case "meeting_scheduled":
      return "meeting_scheduled";
    case "proposal_sent":
      return "proposal_presented";
    case "closed_won":
      return "closed_won";
    case "closed_lost":
      return "closed_lost";
    default:
      return "lead_captured";
  }
}

function convertLeadToDeal(lead: Lead360Item): PipelineDeal {
  const initials = lead.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const priority: "Alta" | "Media" | "Baja" =
    lead.intentScore >= 90 ? "Alta" : lead.intentScore >= 75 ? "Media" : "Baja";

  const nextActionByStage: Record<PipelineStageId, string> = {
    lead_captured: "Iniciar secuencia lineal o entrega de recurso",
    in_sequence: "Ejecutar siguiente paso social (Like / Visita / Conexión)",
    connected_material_sent: "Hacer seguimiento sobre el recurso entregado",
    interested: "Proponer llamada de 15 min y enviar enlace Cal.com",
    meeting_scheduled: "Demostración comercial agendada por Cal.com",
    proposal_sent: "Seguimiento de términos y resolución de objeciones",
    closed_won: "Iniciar onboarding del cliente y entrega de accesos",
    closed_lost: "Archivar para reactivación futura en 90 días",
  };

  const stageId = mapCrmStageToPipelineStage(lead.stage);

  return {
    id: `deal-${lead.id}`,
    leadId: lead.id,
    leadName: lead.fullName,
    leadTitle: lead.title || "Decisor Comercial",
    company: lead.company || "Empresa",
    location: lead.location || "Remoto / B2B",
    avatarInitials: initials || "LI",
    stageId,
    sourceCampaign: lead.listName || lead.signalSource || "Campaña Social Selling",
    leadMagnetUsed: lead.signalLevel === "level_1" ? "SISTEMA" : undefined,
    lastActivity: lead.lastActivityAt || "Activo en campañas",
    nextAction: nextActionByStage[stageId] || "Seguimiento comercial",
    priority,
    meetingDate: stageId === "meeting_scheduled" ? "Cal.com confirmada" : undefined,
  };
}

/**
 * Obtiene todas las oportunidades del Pipeline Kanban sincronizadas en tiempo real con
 * los leads captados y activos en las campañas.
 */
export function getPipelineDeals(): PipelineDeal[] {
  if (typeof window === "undefined") return INITIAL_DEALS;
  try {
    const rawDeals = localStorage.getItem(DEALS_STORAGE_KEY);
    const existingDeals: PipelineDeal[] = rawDeals ? JSON.parse(rawDeals) : [];
    const campaignLeads = getStoredLeads();

    // Crear mapa de deals existentes por leadId y limpiar valores monetarios residuales
    const dealsByLeadId = new Map<string, PipelineDeal>();
    if (Array.isArray(existingDeals)) {
      existingDeals.forEach((d) => {
        if (d && d.leadId) {
          if (d.dealValue) {
            delete d.dealValue;
            modified = true;
          }
          dealsByLeadId.set(d.leadId, d);
        }
      });
    }

    let modified = false;

    // Sincronizar o incorporar leads de campañas al Pipeline
    const deletedIds = getDeletedDealIds();
    if (Array.isArray(campaignLeads) && campaignLeads.length > 0) {
      campaignLeads.forEach((lead) => {
        if (deletedIds.has(lead.id) || deletedIds.has(`deal-${lead.id}`)) return;
        const existing = dealsByLeadId.get(lead.id);
        const expectedStage = mapCrmStageToPipelineStage(lead.stage);

        if (!existing) {
          // Si el lead no estaba en el pipeline, se incorpora automáticamente
          const newDeal = convertLeadToDeal(lead);
          dealsByLeadId.set(lead.id, newDeal);
          modified = true;
        } else if (existing.stageId !== expectedStage) {
          // Si el lead avanzó de etapa en el CRM (ej: respondió en Inbox o avanzó en campaña), sincronizar
          existing.stageId = expectedStage;
          existing.lastActivity = lead.lastActivityAt || "Sincronizado con CRM";
          dealsByLeadId.set(lead.id, existing);
          modified = true;
        }
      });
    }

    const unifiedDeals = Array.from(dealsByLeadId.values());

    if (unifiedDeals.length === 0) {
      // Si aún no hay leads en localStorage, poblar con el prospecto verificado de campaña
      const sampleLead: Lead360Item = {
        id: "lead-roberto-orse",
        fullName: "Roberto OrSe",
        firstName: "Roberto",
        lastName: "OrSe",
        title: "Founder & CEO | Social Selling B2B",
        company: "InHubFlow / Agencia OrSe",
        location: "Brasil",
        linkedinUrl: "https://www.linkedin.com/in/robertoorse",
        signalSource: "Mis Posts (Nivel 1)",
        signalLevel: "level_1",
        intentScore: 100,
        stage: "active_conversation",
        sequenceStatus: "replied",
        listId: "list-l1-sistema",
        listName: "02. Secuencia: Lead Magnet",
        activeCampaignName: "02. Secuencia: Lead Magnet",
        timeline: [],
        createdAt: new Date().toISOString(),
        lastActivityAt: "Ahora mismo",
      };
      const sampleDeal = convertLeadToDeal(sampleLead);
      unifiedDeals.push(sampleDeal);
      modified = true;
    }

    if (modified || !rawDeals) {
      localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(unifiedDeals));
    }

    return unifiedDeals;
  } catch {
    return [];
  }
}

export function savePipelineDeals(deals: PipelineDeal[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(deals));
  } catch {
    // ignore
  }
}

/**
 * Mueve una oportunidad comercial a una nueva etapa del Kanban y sincroniza
 * bidireccionalmente el prospecto en inhubflow_leads_360 y en inhubflow_inbox_conversations.
 */
export function moveDealStage(dealId: string, targetStageId: PipelineStageId): PipelineDeal[] {
  const deals = getPipelineDeals();
  const targetStageConfig = PIPELINE_STAGES.find((s) => s.id === targetStageId);
  const targetStageName = targetStageConfig?.name || targetStageId;
  let targetLeadId: string | null = null;

  const updated = deals.map((d) => {
    if (d.id === dealId || d.leadId === dealId) {
      targetLeadId = d.leadId;

      const nextActionByStage: Record<PipelineStageId, string> = {
        lead_captured: "Iniciar secuencia lineal o entrega de recurso",
        in_sequence: "Ejecutar siguiente paso social (Like / Visita / Conexión)",
        connected_material_sent: "Hacer seguimiento sobre el recurso entregado",
        interested: "Proponer llamada de 15 min y enviar enlace Cal.com",
        meeting_scheduled: "Demostración comercial agendada por Cal.com",
        proposal_sent: "Seguimiento de términos y resolución de objeciones",
        closed_won: "Iniciar onboarding del cliente y entrega de accesos",
        closed_lost: "Archivar para reactivación futura en 90 días",
      };

      return {
        ...d,
        stageId: targetStageId,
        lastActivity: "Etapa actualizada en Kanban comercial",
        nextAction: nextActionByStage[targetStageId] || d.nextAction,
        meetingDate:
          targetStageId === "meeting_scheduled"
            ? d.meetingDate || "Cal.com confirmada"
            : d.meetingDate,
      };
    }
    return d;
  });

  savePipelineDeals(updated);

  // 1. Sincronizar en Leads 360 / CRM
  if (targetLeadId) {
    try {
      const crmStage = mapPipelineStageToCrmStage(targetStageId);
      updateStoredLeadStage(
        targetLeadId,
        crmStage,
        `Oportunidad movida en el Pipeline Kanban a: ${targetStageName}`
      );
    } catch (err) {
      console.warn("[Pipeline] Error sincronizando con LeadStore:", err);
    }

    // 2. Sincronizar en Inbox si existe conversación para este lead
    try {
      const rawInbox = localStorage.getItem("inhubflow_inbox_conversations");
      if (rawInbox) {
        const inboxList = JSON.parse(rawInbox);
        if (Array.isArray(inboxList)) {
          const updatedInbox = inboxList.map((conv) => {
            if (conv.leadId === targetLeadId || conv.id === `conv-${targetLeadId}`) {
              return {
                ...conv,
                crmStage: targetStageName,
                crmStageId: targetStageId,
              };
            }
            return conv;
          });
          localStorage.setItem("inhubflow_inbox_conversations", JSON.stringify(updatedInbox));
        }
      }
    } catch (err) {
      console.warn("[Pipeline] Error sincronizando con Inbox:", err);
    }
  }

  return updated;
}

export function addPipelineDeal(deal: Omit<PipelineDeal, "id">): PipelineDeal[] {
  const deals = getPipelineDeals();
  const dealId = "deal-" + Date.now();
  const newDeal: PipelineDeal = {
    ...deal,
    id: dealId,
  };
  const updated = [newDeal, ...deals];
  savePipelineDeals(updated);

  // Asegurar que exista también en inhubflow_leads_360 para consistencia global
  try {
    const leads = getStoredLeads();
    const existing = leads.find((l) => l.id === deal.leadId || l.fullName === deal.leadName);
    if (!existing) {
      const names = deal.leadName.split(" ");
      const newLead: Lead360Item = {
        id: deal.leadId || `lead-${Date.now()}`,
        fullName: deal.leadName,
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
        title: deal.leadTitle,
        company: deal.company,
        location: deal.location,
        linkedinUrl: `https://www.linkedin.com/in/${deal.leadName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        signalSource: deal.sourceCampaign,
        signalLevel: "level_2",
        intentScore: deal.priority === "Alta" ? 95 : deal.priority === "Media" ? 80 : 65,
        stage: mapPipelineStageToCrmStage(deal.stageId),
        sequenceStatus: "in_progress",
        listId: "list-manual-pipeline",
        listName: deal.sourceCampaign,
        activeCampaignName: deal.sourceCampaign,
        timeline: [
          {
            id: `tl-${Date.now()}`,
            timestamp: "Ahora mismo",
            title: "Oportunidad Creada en Pipeline",
            detail: `Creado manualmente con valor estimado ${deal.dealValue}`,
            type: "crm",
          },
        ],
        createdAt: new Date().toISOString(),
        lastActivityAt: "Ahora mismo",
      };
      saveStoredLeads([newLead, ...leads]);
    }
  } catch (err) {
    console.warn("[Pipeline] Error sincronizando nuevo deal con LeadStore:", err);
  }

  return updated;
}

export function syncPipelineWithCampaignLeads(): PipelineDeal[] {
  return getPipelineDeals();
}

/**
 * Actualiza los campos de un Deal (valor, prioridad, notas, fecha de reunión, siguiente acción, etapa)
 * y sincroniza bidireccionalmente con Leads 360 e Inbox.
 */
export function updatePipelineDeal(
  dealId: string,
  updates: Partial<PipelineDeal>
): PipelineDeal[] {
  const deals = getPipelineDeals();
  const targetDeal = deals.find((d) => d.id === dealId || d.leadId === dealId);
  if (!targetDeal) return deals;

  const stageChanged = Boolean(updates.stageId && updates.stageId !== targetDeal.stageId);
  const targetStageId = updates.stageId || targetDeal.stageId;
  const targetStageConfig = PIPELINE_STAGES.find((s) => s.id === targetStageId);
  const targetStageName = targetStageConfig?.name || targetStageId;

  const nextActionByStage: Record<PipelineStageId, string> = {
    lead_captured: "Iniciar secuencia lineal o entrega de recurso",
    in_sequence: "Ejecutar siguiente paso social (Like / Visita / Conexión)",
    connected_material_sent: "Hacer seguimiento sobre el recurso entregado",
    interested: "Proponer llamada de 15 min y enviar enlace Cal.com",
    meeting_scheduled: "Demostración comercial agendada por Cal.com",
    proposal_sent: "Seguimiento de términos y resolución de objeciones",
    closed_won: "Iniciar onboarding del cliente y entrega de accesos",
    closed_lost: "Archivar para reactivación futura en 90 días",
  };

  const updated = deals.map((d) => {
    if (d.id === dealId || d.leadId === dealId) {
      return {
        ...d,
        ...updates,
        stageId: targetStageId,
        nextAction:
          updates.nextAction ||
          (stageChanged ? nextActionByStage[targetStageId] : d.nextAction),
        meetingDate:
          updates.meetingDate !== undefined
            ? updates.meetingDate
            : targetStageId === "meeting_scheduled" && !d.meetingDate
            ? "Cal.com confirmada"
            : d.meetingDate,
        lastActivity:
          updates.lastActivity ||
          (stageChanged
            ? "Etapa actualizada en Pipeline"
            : "Detalles actualizados en Pipeline"),
      };
    }
    return d;
  });

  savePipelineDeals(updated);

  // Sincronizar bidireccionalmente con CRM e Inbox si cambió la etapa
  if (stageChanged && targetDeal.leadId) {
    try {
      const crmStage = mapPipelineStageToCrmStage(targetStageId);
      updateStoredLeadStage(
        targetDeal.leadId,
        crmStage,
        `Oportunidad actualizada en el Pipeline Kanban a: ${targetStageName}`
      );
    } catch (err) {
      console.warn("[Pipeline] Error sincronizando con LeadStore:", err);
    }

    try {
      const rawInbox = localStorage.getItem("inhubflow_inbox_conversations");
      if (rawInbox) {
        const inboxList = JSON.parse(rawInbox);
        if (Array.isArray(inboxList)) {
          const updatedInbox = inboxList.map((conv) => {
            if (conv.leadId === targetDeal.leadId || conv.id === `conv-${targetDeal.leadId}`) {
              return {
                ...conv,
                crmStage: targetStageName,
                crmStageId: targetStageId,
              };
            }
            return conv;
          });
          localStorage.setItem("inhubflow_inbox_conversations", JSON.stringify(updatedInbox));
        }
      }
    } catch (err) {
      console.warn("[Pipeline] Error sincronizando con Inbox:", err);
    }
  }

  return updated;
}

/**
 * Elimina una oportunidad comercial del pipeline y asegura que no vuelva a
 * sincronizarse automáticamente a menos que el usuario lo desee.
 */
export function deletePipelineDeal(dealId: string): PipelineDeal[] {
  const deals = getPipelineDeals();
  const target = deals.find((d) => d.id === dealId || d.leadId === dealId);
  const updated = deals.filter((d) => d.id !== dealId && d.leadId !== dealId);
  savePipelineDeals(updated);

  if (target) {
    const deletedIds = getDeletedDealIds();
    deletedIds.add(target.id);
    if (target.leadId) deletedIds.add(target.leadId);
    saveDeletedDealIds(deletedIds);
  }

  return updated;
}
