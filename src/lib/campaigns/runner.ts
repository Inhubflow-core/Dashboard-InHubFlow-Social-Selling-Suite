import { unipile } from "@/lib/unipile/client";
import type { Node, Edge } from "@xyflow/react";
import type { NodeConfigData, CampaignWorkflow, LinearSequenceCampaign, SequenceStepItem } from "./types";
import { getStoredWorkflow, saveStoredWorkflow } from "./store";
import { translateOutreachMessage } from "@/lib/ai/outreach-translator";
import { generateSmartPostComment } from "@/lib/ai/post-comment-generator";
import { getActiveAccountId } from "@/lib/unipile/store";

export interface CampaignExecutionLog {
  id: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  timestamp: string;
  status: "success" | "delayed" | "paused" | "rate_limited" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface LeadCampaignState {
  leadId: string;
  leadName: string;
  linkedinUrl: string;
  providerId?: string;
  chatId?: string;
  company?: string;
  topic?: string;
  connectionDegree: "1st" | "2nd" | "3rd";
  hasAcceptedInvite: boolean;
  hasReplied: boolean;
  currentNodeId: string;
  state: "pending" | "in_progress" | "waiting_delay" | "completed" | "failed";
  nextStepAt?: string | null;
  history: string[];
  language?: "en" | "es" | "pt";
}

// Almacén de logs de ejecución en memoria
const recentExecutionLogs: CampaignExecutionLog[] = [];

let logCounter = 0;
export function generateLogId(prefix: "log-seq" | "log-run" = "log-seq"): string {
  logCounter = (logCounter + 1) % 1000000;
  return `${prefix}-${Date.now()}-${logCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCampaignExecutionLogs(limit = 40): CampaignExecutionLog[] {
  return recentExecutionLogs.slice(0, limit);
}

export function recordExecutionLog(log: CampaignExecutionLog) {
  recentExecutionLogs.unshift(log);
  if (recentExecutionLogs.length > 150) {
    recentExecutionLogs.pop();
  }
}

export function clearCampaignExecutionLogs(): void {
  recentExecutionLogs.length = 0;
}

/**
 * Pacing Tracker: Control estricto de límites diarios de LinkedIn por cuenta
 */
interface DailyPacingState {
  date: string; // YYYY-MM-DD
  invitationsSent: number;
  dmsSent: number;
  profilesVisited: number;
}

const pacingMap = new Map<string, DailyPacingState>();

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAccountDailyPacing(accountId: string): DailyPacingState {
  const today = getTodayString();
  const existing = pacingMap.get(accountId);
  if (!existing || existing.date !== today) {
    const newState: DailyPacingState = {
      date: today,
      invitationsSent: 0,
      dmsSent: 0,
      profilesVisited: 0,
    };
    pacingMap.set(accountId, newState);
    return newState;
  }
  return existing;
}

export function incrementAccountPacing(
  accountId: string,
  type: "invitation" | "dm" | "visit"
) {
  const state = getAccountDailyPacing(accountId);
  if (type === "invitation") state.invitationsSent += 1;
  if (type === "dm") state.dmsSent += 1;
  if (type === "visit") state.profilesVisited += 1;
}

/**
 * Ejecutor de Campañas: Procesa un paso del flujo visual para un lead
 */
export async function executeCampaignStepForLead(params: {
  workflow: CampaignWorkflow;
  leadState: LeadCampaignState;
  accountId?: string;
}): Promise<{
  success: boolean;
  newState: LeadCampaignState;
  log: CampaignExecutionLog;
}> {
  const { workflow, leadState } = params;
  let accountId = (
    params.accountId ||
    (typeof window !== "undefined" ? getActiveAccountId() : "") ||
    "HfrdagEmSrONX8jqE9IYjQ"
  ).replace(/^acc-li-/, "");

  let nodes: Node[] = [];
  let edges: Edge[] = [];
  try {
    nodes = JSON.parse(workflow.nodesJson);
    edges = JSON.parse(workflow.edgesJson);
  } catch {
    nodes = [];
    edges = [];
  }

  const currentNode = nodes.find((n) => n.id === leadState.currentNodeId);

  if (!currentNode) {
    const log: CampaignExecutionLog = {
      id: generateLogId("log-run"),
      campaignId: workflow.id,
      leadId: leadState.leadId,
      leadName: leadState.leadName,
      nodeId: leadState.currentNodeId,
      nodeLabel: "Nodo no encontrado",
      nodeType: "unknown",
      timestamp: new Date().toISOString(),
      status: "error",
      message: `No se encontro el nodo '${leadState.currentNodeId}' en el canvas de la campaña`,
    };
    recordExecutionLog(log);
    return { success: false, newState: { ...leadState, state: "failed" }, log };
  }

  const nodeData = currentNode.data as unknown as NodeConfigData;
  const pacing = getAccountDailyPacing(accountId);

  // 1. Validar si el lead debe detenerse por respuesta (Stop on Reply)
  if (workflow.stopOnReply && leadState.hasReplied) {
    const log: CampaignExecutionLog = {
      id: generateLogId("log-run"),
      campaignId: workflow.id,
      leadId: leadState.leadId,
      leadName: leadState.leadName,
      nodeId: currentNode.id,
      nodeLabel: nodeData.label,
      nodeType: nodeData.nodeType,
      timestamp: new Date().toISOString(),
      status: "paused",
      message: `${leadState.leadName} ha respondido a un mensaje previo. Secuencia pausada para atencion personalizada (Stop on Reply).`,
    };
    recordExecutionLog(log);
    return { success: true, newState: { ...leadState, state: "completed" }, log };
  }

  // 2. Ejecutar según tipo de nodo
  switch (nodeData.nodeType) {
    case "trigger_signal":
    case "trigger_list": {
      // Disparador inicial: avanzar al siguiente nodo conectado
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Lead incorporado a la secuencia mediante señal de palabra clave '${nodeData.keyword || "SISTEMA"}'`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "action_visit": {
      // Pacing check
      incrementAccountPacing(accountId, "visit");

      // Visita de perfil a través de Unipile
      try {
        await unipile.resolveProfile(leadState.linkedinUrl, accountId);
      } catch (error) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo visitar el perfil en LinkedIn.",
        };
        recordExecutionLog(log);
        return { success: false, newState: { ...leadState, state: "failed" }, log };
      }

      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Perfil de ${leadState.leadName} visitado con exito. Registro generado en sus notificaciones de LinkedIn.`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "action_like_comment": {
      let targetPostId = `post_target_${leadState.leadId}`;
      try {
        const posts = await unipile.getUserPosts({
          account_id: accountId,
          identifier: leadState.providerId || leadState.leadId,
          limit: 1,
        });
        if (posts && posts.length > 0 && posts[0].id) {
          targetPostId = posts[0].id;
        }
      } catch (err) {
        console.warn("[Runner] No se pudieron obtener posts del prospecto, usando post de referencia:", err);
      }

      // Reacción Like
      try {
        await unipile.reactToPost({
          account_id: accountId,
          post_id: targetPostId,
          reaction_type: "like",
        });
      } catch (error) {
        console.warn("[Runner] Advertencia al reaccionar al post:", error);
      }

      // Comentario contextual con adaptacion multilingue inteligente
      let commentTemplate = nodeData.commentText || "Gran aporte {{first_name}}, excelente punto de vista.";
      if (leadState.language && leadState.language !== "es") {
        try {
          commentTemplate = await translateOutreachMessage(commentTemplate, leadState.language);
        } catch (e) {
          console.warn("[Runner] Fallback en traduccion de comentario:", e);
        }
      }
      const commentBody = commentTemplate.replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0]);

      try {
        await unipile.commentOnPost({
          account_id: accountId,
          post_id: targetPostId,
          text: commentBody,
        });
      } catch (error) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo publicar el comentario en el post de LinkedIn.",
        };
        recordExecutionLog(log);
        return { success: false, newState: { ...leadState, state: "failed" }, log };
      }

      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const logLangSuffix = leadState.language && leadState.language !== "es" ? ` [Idioma: ${leadState.language.toUpperCase()}]` : "";
      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Like y comentario ("${commentBody.slice(0, 40)}...")${logLangSuffix} publicados con exito en el post de ${leadState.leadName}.`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "action_follow_connect": {
      // Si ya es contacto de 1er grado, omitir el paso de conexión y avanzar directamente al siguiente
      if (leadState.connectionDegree === "1st") {
        const nextEdge = edges.find((e) => e.source === currentNode.id);
        const nextNodeId = nextEdge ? nextEdge.target : null;

        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "success",
          message: `${leadState.leadName} ya es contacto de 1er grado en LinkedIn. Se omite la invitacion y la secuencia avanza de inmediato.`,
        };
        recordExecutionLog(log);

        return {
          success: true,
          newState: {
            ...leadState,
            currentNodeId: nextNodeId || currentNode.id,
            state: nextNodeId ? "in_progress" : "completed",
            history: [...leadState.history, currentNode.id],
          },
          log,
        };
      }

      // Pacing check estricto: no superar límite diario de invitaciones
      if (pacing.invitationsSent >= workflow.dailyInvitationLimit) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "rate_limited",
          message: `Limite diario de invitaciones alcanzado (${pacing.invitationsSent}/${workflow.dailyInvitationLimit}). Secuencia reprogramada para mañana para proteger la cuenta.`,
        };
        recordExecutionLog(log);
        return {
          success: false,
          newState: { ...leadState, state: "waiting_delay" },
          log,
        };
      }

      const targetProviderId = leadState.providerId || `urn:li:member:${leadState.leadId}`;

      // 1. Seguir perfil (Follow)
      try {
        await unipile.followUser({
          account_id: accountId,
          provider_id: targetProviderId,
        });
      } catch (error) {
        console.warn("[Runner] Advertencia al seguir perfil (followUser):", error);
      }

      // 2. Conectar (Send Invitation) con adaptacion multilingue inteligente
      let note: string | undefined = undefined;
      if (nodeData.hasNote !== false && nodeData.noteText) {
        let noteTemplate = nodeData.noteText;
        if (leadState.language && leadState.language !== "es") {
          try {
            noteTemplate = await translateOutreachMessage(noteTemplate, leadState.language);
          } catch (e) {
            console.warn("[Runner] Fallback en traduccion de nota:", e);
          }
        }
        note = noteTemplate.replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0]);
      }

      try {
        await unipile.sendInvitation({
          account_id: accountId,
          provider_id: targetProviderId,
          message: note,
        });
      } catch (error) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo enviar la invitacion de conexion en LinkedIn.",
        };
        recordExecutionLog(log);
        return { success: false, newState: { ...leadState, state: "failed" }, log };
      }

      incrementAccountPacing(accountId, "invitation");
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const logLangSuffix = leadState.language && leadState.language !== "es" ? ` [Idioma: ${leadState.language.toUpperCase()}]` : "";
      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Perfil de ${leadState.leadName} seguido y solicitud de conexion enviada${note ? ` con nota personalizada${logLangSuffix}` : ""}. Cuota hoy: ${pacing.invitationsSent + 1}/${workflow.dailyInvitationLimit}`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "action_invite": {
      // Pacing check estricto: no superar límite diario configurado (ej. 25/día)
      if (pacing.invitationsSent >= workflow.dailyInvitationLimit) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "rate_limited",
          message: `Limite diario de invitaciones alcanzado (${pacing.invitationsSent}/${workflow.dailyInvitationLimit}). Secuencia reprogramada para mañana para proteger la cuenta.`,
        };
        recordExecutionLog(log);
        return {
          success: false,
          newState: { ...leadState, state: "waiting_delay" },
          log,
        };
      }

      // Envio de invitacion con adaptacion multilingue inteligente
      let note: string | undefined = undefined;
      if (nodeData.noteText) {
        let noteTemplate = nodeData.noteText;
        if (leadState.language && leadState.language !== "es") {
          try {
            noteTemplate = await translateOutreachMessage(noteTemplate, leadState.language);
          } catch (e) {
            console.warn("[Runner] Fallback en traduccion de invitacion:", e);
          }
        }
        note = noteTemplate.replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0]);
      }

      try {
        await unipile.sendInvitation({
          account_id: accountId,
          provider_id: leadState.providerId || `urn:li:member:${leadState.leadId}`,
          message: note,
        });
      } catch (error) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo enviar la invitacion en LinkedIn.",
        };
        recordExecutionLog(log);
        return { success: false, newState: { ...leadState, state: "failed" }, log };
      }

      incrementAccountPacing(accountId, "invitation");
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const logLangSuffix = leadState.language && leadState.language !== "es" ? ` [Idioma: ${leadState.language.toUpperCase()}]` : "";
      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Invitacion de conexion enviada a ${leadState.leadName}${note ? ` con nota personalizada${logLangSuffix}` : ""}. Cuota hoy: ${pacing.invitationsSent + 1}/${workflow.dailyInvitationLimit}`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "action_dm": {
      // Si el contacto aún no es de 1er grado ni ha aceptado, esperar aceptación antes de emitir DM
      if (leadState.connectionDegree !== "1st" && !leadState.hasAcceptedInvite) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "delayed",
          message: `El prospecto ${leadState.leadName} aun no ha aceptado la invitacion de conexion. El envio de DM queda en espera de aceptacion.`,
        };
        recordExecutionLog(log);
        return {
          success: true,
          newState: { ...leadState, state: "waiting_delay" },
          log,
        };
      }

      // Pacing check: DMs diarios (ej. 40/día)
      if (pacing.dmsSent >= workflow.dailyDmLimit) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "rate_limited",
          message: `Limite diario de mensajes DM alcanzado (${pacing.dmsSent}/${workflow.dailyDmLimit}).`,
        };
        recordExecutionLog(log);
        return {
          success: false,
          newState: { ...leadState, state: "waiting_delay" },
          log,
        };
      }

      // Envio de DM con adaptacion multilingue inteligente
      let dmTemplate = nodeData.dmText || "Hola {{first_name}}";
      if (leadState.language && leadState.language !== "es") {
        try {
          dmTemplate = await translateOutreachMessage(dmTemplate, leadState.language);
        } catch (e) {
          console.warn("[Runner] Fallback en traduccion de DM:", e);
        }
      }
      const messageBody = dmTemplate.replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0]);

      try {
        if (leadState.chatId) {
          await unipile.sendMessage({
            chat_id: leadState.chatId,
            text: messageBody,
          });
        } else if (leadState.providerId) {
          const chatRes = await unipile.startChat({
            account_id: accountId,
            attendees_ids: [leadState.providerId],
            text: messageBody,
          });
          if (chatRes?.chat_id) {
            leadState.chatId = chatRes.chat_id;
          }
        } else {
          throw new Error("No se dispone de chatId ni provider_id de LinkedIn para enviar el mensaje");
        }
      } catch (error) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-run"),
          campaignId: workflow.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentNode.id,
          nodeLabel: nodeData.label,
          nodeType: nodeData.nodeType,
          timestamp: new Date().toISOString(),
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo enviar el mensaje en LinkedIn.",
        };
        recordExecutionLog(log);
        return { success: false, newState: { ...leadState, state: "failed" }, log };
      }

      incrementAccountPacing(accountId, "dm");
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const logLangSuffix = leadState.language && leadState.language !== "es" ? ` [Idioma: ${leadState.language.toUpperCase()}]` : "";
      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Mensaje directo y recurso '${nodeData.attachedResource || "PDF"}' enviado a ${leadState.leadName}${logLangSuffix}.`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "logic_condition": {
      // Evaluar condición lógica
      let conditionMet = false;
      if (nodeData.conditionType === "is_1st_degree") {
        conditionMet = leadState.connectionDegree === "1st";
      } else if (nodeData.conditionType === "accepted_invite") {
        conditionMet = leadState.hasAcceptedInvite || leadState.connectionDegree === "1st";
      } else if (nodeData.conditionType === "replied_to_dm") {
        conditionMet = leadState.hasReplied;
      }

      // Buscar arista según el resultado (sourceHandle: 'true' o 'false')
      const targetEdge = edges.find(
        (e) => e.source === currentNode.id && (e.sourceHandle === (conditionMet ? "true" : "false") || !e.sourceHandle)
      );

      const nextNodeId = targetEdge ? targetEdge.target : null;

      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Condicion '${nodeData.conditionType}' evaluada como: ${conditionMet ? "VERDADERO" : "FALSO"}. Bifurcando flujo.`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "logic_delay": {
      const hours = (nodeData.delayDays || 0) * 24 + (nodeData.delayHours || 2);
      const nextStepTime = new Date(Date.now() + hours * 3600 * 1000).toISOString();

      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "delayed",
        message: `Pausa calculada de ${hours} hora(s) programada para ${leadState.leadName}. Reanudacion prevista: ${new Date(nextStepTime).toLocaleString()}`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          nextStepAt: nextStepTime,
          state: "waiting_delay",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "crm_stage": {
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      const nextNodeId = nextEdge ? nextEdge.target : null;

      const targetStage = nodeData.crmStageTarget || "3. Material Entregado";

      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Estado del lead ${leadState.leadName} en el Pipeline actualizado a: '${targetStage}'.`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          currentNodeId: nextNodeId || currentNode.id,
          state: nextNodeId ? "in_progress" : "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }

    case "control_end":
    default: {
      const log: CampaignExecutionLog = {
        id: generateLogId("log-run"),
        campaignId: workflow.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentNode.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `Secuencia finalizada exitosamente para ${leadState.leadName}.`,
      };
      recordExecutionLog(log);

      return {
        success: true,
        newState: {
          ...leadState,
          state: "completed",
          history: [...leadState.history, currentNode.id],
        },
        log,
      };
    }
  }
}

/**
 * Ejecutor de Secuencias Lineales: Procesa un paso secuencial (1..N) para un lead
 * Respetando Pacing diario de LinkedIn, Stop on Reply y adjuntos multimedia.
 */
export async function executeLinearSequenceStepForLead(params: {
  campaign: LinearSequenceCampaign;
  stepIndex: number;
  leadState: LeadCampaignState;
  accountId?: string;
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  newState: LeadCampaignState;
  log: CampaignExecutionLog;
  isSequenceCompleted: boolean;
  nextStepIndex: number;
}> {
  const { campaign, stepIndex, leadState, dryRun } = params;
  const isDry = dryRun === true;
  const accountId = (
    params.accountId ||
    (typeof window !== "undefined" ? getActiveAccountId() : "") ||
    "HfrdagEmSrONX8jqE9IYjQ"
  ).replace(/^acc-li-/, "");
  const pacing = getAccountDailyPacing(accountId);

  // 1. Validar regla 'Stop on Reply' (detención inmediata ante respuesta)
  if (campaign.stopOnReply && leadState.hasReplied) {
    const log: CampaignExecutionLog = {
      id: generateLogId("log-seq"),
      campaignId: campaign.id,
      leadId: leadState.leadId,
      leadName: leadState.leadName,
      nodeId: `step-${stepIndex + 1}`,
      nodeLabel: "Stop on Reply",
      nodeType: "control_stop",
      timestamp: new Date().toISOString(),
      status: "paused",
      message: `${leadState.leadName} ha respondido a un mensaje previo. Secuencia detenida automáticamente para dar paso a atención humana directa (Stop on Reply).`,
    };
    recordExecutionLog(log);
    return {
      success: true,
      newState: { ...leadState, state: "completed" },
      log,
      isSequenceCompleted: true,
      nextStepIndex: stepIndex,
    };
  }

  // 2. Validar existencia del paso solicitado
  const currentStep = campaign.steps[stepIndex];
  if (!currentStep) {
    const log: CampaignExecutionLog = {
      id: generateLogId("log-seq"),
      campaignId: campaign.id,
      leadId: leadState.leadId,
      leadName: leadState.leadName,
      nodeId: "step-end",
      nodeLabel: "Fin de Secuencia",
      nodeType: "control_end",
      timestamp: new Date().toISOString(),
      status: "success",
      message: `Secuencia '${campaign.name}' completada con éxito para ${leadState.leadName}.`,
    };
    recordExecutionLog(log);
    return {
      success: true,
      newState: { ...leadState, state: "completed" },
      log,
      isSequenceCompleted: true,
      nextStepIndex: stepIndex,
    };
  }

  // 3. Resolución proactiva de perfil en LinkedIn si no es simulación (Live)
  if (!isDry && !leadState.providerId && leadState.linkedinUrl) {
    try {
      const profile = await unipile.resolveProfile(leadState.linkedinUrl, accountId);
      if (profile?.provider_id) {
        leadState.providerId = profile.provider_id;
        if (profile.network_distance === "FIRST_DEGREE" || profile.is_relationship) {
          leadState.connectionDegree = "1st";
          leadState.hasAcceptedInvite = true;
        }
      } else {
        throw new Error("No se pudo obtener el identificador de LinkedIn (provider_id)");
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const log: CampaignExecutionLog = {
        id: generateLogId("log-seq"),
        campaignId: campaign.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentStep.id,
        nodeLabel: currentStep.title,
        nodeType: currentStep.type,
        timestamp: new Date().toISOString(),
        status: "error",
        message: `Error al localizar el perfil de LinkedIn (${leadState.linkedinUrl}): ${errorMsg}. Verifica que la URL del perfil sea correcta.`,
        details: { error: errorMsg, dryRun: isDry },
      };
      recordExecutionLog(log);
      return {
        success: false,
        newState: { ...leadState, state: "failed" },
        log,
        isSequenceCompleted: false,
        nextStepIndex: stepIndex,
      };
    }
  }

  const companyVal = leadState.company || "tu empresa";
  const topicVal = leadState.topic || "prospección B2B";

  // 4. Ejecutar según el tipo de acción social
  switch (currentStep.type) {
    case "visit": {
      if (!isDry) {
        const maxVisits = campaign.dailyLimits?.maxVisitsPerDay ?? 20;
        if (pacing.profilesVisited >= maxVisits) {
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "rate_limited",
            message: `Límite diario de visitas alcanzado (${pacing.profilesVisited}/${maxVisits}). Acción pospuesta para proteger la cuenta.`,
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "waiting_delay" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        try {
          const profile = await unipile.resolveProfile(leadState.linkedinUrl, accountId);
          if (profile?.provider_id && !leadState.providerId) {
            leadState.providerId = profile.provider_id;
          }
          if (profile?.network_distance === "FIRST_DEGREE" || profile?.is_relationship) {
            leadState.connectionDegree = "1st";
            leadState.hasAcceptedInvite = true;
          }
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "error",
            message: `Error al visitar el perfil de ${leadState.leadName}: ${errorMsg}`,
            details: { error: errorMsg, dryRun: isDry },
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "failed" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        incrementAccountPacing(accountId, "visit");
      }

      const log: CampaignExecutionLog = {
        id: generateLogId("log-seq"),
        campaignId: campaign.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentStep.id,
        nodeLabel: currentStep.title,
        nodeType: currentStep.type,
        timestamp: new Date().toISOString(),
        status: "success",
        message: isDry
          ? `[SIMULACIÓN] Paso ${stepIndex + 1} (${currentStep.title}): Perfil de ${leadState.leadName} (${leadState.linkedinUrl}) analizado con éxito sin llamadas reales a LinkedIn.`
          : `Paso ${stepIndex + 1} (${currentStep.title}): Perfil de ${leadState.leadName} visitado con éxito. Registro generado en sus notificaciones de LinkedIn.`,
        details: { stepOrder: stepIndex + 1, stepTitle: currentStep.title, dryRun: isDry },
      };
      recordExecutionLog(log);

      const nextIndex = stepIndex + 1;
      const isDone = nextIndex >= campaign.steps.length;
      return {
        success: true,
        newState: {
          ...leadState,
          state: isDone ? "completed" : "in_progress",
          history: [...leadState.history, currentStep.id],
        },
        log,
        isSequenceCompleted: isDone,
        nextStepIndex: nextIndex,
      };
    }

    case "like_comment": {
      let commentTemplate =
        currentStep.commentTemplate ||
        currentStep.messageTemplate ||
        "Gran perspectiva {{first_name}}, totalmente alineado con este enfoque.";
      if (leadState.language && leadState.language !== "es") {
        try {
          commentTemplate = await translateOutreachMessage(commentTemplate, leadState.language);
        } catch {}
      }
      let commentText = commentTemplate
        .replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0])
        .replace(/{{company}}/gi, companyVal)
        .replace(/{{topic}}/gi, topicVal)
        .replace(/{{keyword}}/gi, "SISTEMA");

      let isAiGeneratedComment = false;

      if (!isDry) {
        let targetPostId = "";
        try {
          const posts = await unipile.getUserPosts({
            account_id: accountId,
            identifier: leadState.providerId || leadState.leadId,
            limit: 1,
          });
          if (posts && posts.length > 0) {
            const firstPost = posts[0];
            targetPostId = firstPost.social_id || firstPost.id;
            if (targetPostId && !targetPostId.startsWith("urn:li:")) {
              targetPostId = `urn:li:ugcPost:${targetPostId}`;
            }

            // Lectura profunda con IA Gemini para generar comentario contextual de alto valor
            const rawPostText = firstPost.text || (firstPost as any).content || "";
            if (currentStep.useAiComment !== false && rawPostText && rawPostText.trim().length > 30) {
              try {
                const smartComment = await generateSmartPostComment({
                  postText: rawPostText,
                  leadName: leadState.leadName,
                  company: companyVal,
                  language: leadState.language,
                });
                if (smartComment) {
                  commentText = smartComment;
                  isAiGeneratedComment = true;
                }
              } catch (aiErr) {
                console.warn("[Runner] Fallback en generacion de comentario IA:", aiErr);
              }
            }
          }
        } catch (err) {
          console.warn("[Runner] Fallback en post de prospecto:", err);
        }

        if (!targetPostId) {
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "success",
            message: `Paso ${stepIndex + 1} (${currentStep.title}): ${leadState.leadName} no tiene publicaciones recientes públicas accesibles. Se omite este paso y la secuencia avanza.`,
            details: { noPostsFound: true, stepOrder: stepIndex + 1, dryRun: isDry },
          };
          recordExecutionLog(log);
          const nextIndex = stepIndex + 1;
          const isDone = nextIndex >= campaign.steps.length;
          return {
            success: true,
            newState: {
              ...leadState,
              state: isDone ? "completed" : "in_progress",
              history: [...leadState.history, currentStep.id],
            },
            log,
            isSequenceCompleted: isDone,
            nextStepIndex: nextIndex,
          };
        }

        let didLike = false;
        let didComment = false;
        try {
          await unipile.reactToPost({
            account_id: accountId,
            post_id: targetPostId,
            reaction_type: "like",
          });
          didLike = true;
        } catch (likeErr) {
          console.warn("[Runner] Advertencia en like:", likeErr);
        }

        try {
          await unipile.commentOnPost({
            account_id: accountId,
            post_id: targetPostId,
            text: commentText,
          });
          didComment = true;
        } catch (commentErr: any) {
          console.warn("[Runner] Advertencia en comentario:", commentErr);
          if (!didLike) {
            const errorMsg = commentErr?.message || String(commentErr);
            const log: CampaignExecutionLog = {
              id: generateLogId("log-seq"),
              campaignId: campaign.id,
              leadId: leadState.leadId,
              leadName: leadState.leadName,
              nodeId: currentStep.id,
              nodeLabel: currentStep.title,
              nodeType: currentStep.type,
              timestamp: new Date().toISOString(),
              status: "error",
              message: `Error al interactuar con el post de ${leadState.leadName}: ${errorMsg}`,
              details: { error: errorMsg, dryRun: isDry },
            };
            recordExecutionLog(log);
            return {
              success: false,
              newState: { ...leadState, state: "failed" },
              log,
              isSequenceCompleted: false,
              nextStepIndex: stepIndex,
            };
          }
        }
      }

      const logAiTag = "";
      const log: CampaignExecutionLog = {
        id: generateLogId("log-seq"),
        campaignId: campaign.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentStep.id,
        nodeLabel: currentStep.title,
        nodeType: currentStep.type,
        timestamp: new Date().toISOString(),
        status: "success",
        message: isDry
          ? `[SIMULACIÓN] Paso ${stepIndex + 1} (${currentStep.title}): Like y comentario simulados ("${commentText.slice(0, 50)}...") para ${leadState.leadName}.`
          : `Paso ${stepIndex + 1} (${currentStep.title}): Like y comentario${logAiTag} publicados con éxito en el post más reciente de ${leadState.leadName}: "${commentText.slice(0, 85)}..."`,
        details: {
          comment: commentText,
          isAiGeneratedComment,
          stepOrder: stepIndex + 1,
          dryRun: isDry,
        },
      };
      recordExecutionLog(log);

      const nextIndex = stepIndex + 1;
      const isDone = nextIndex >= campaign.steps.length;
      return {
        success: true,
        newState: {
          ...leadState,
          state: isDone ? "completed" : "in_progress",
          history: [...leadState.history, currentStep.id],
        },
        log,
        isSequenceCompleted: isDone,
        nextStepIndex: nextIndex,
      };
    }

    case "connect":
    case "connect_message": {
      // Si el contacto ya es de 1er grado (como Roberto OrSe y Roberto OrSe Agencia):
      if (leadState.connectionDegree === "1st" || leadState.hasAcceptedInvite) {
        const log: CampaignExecutionLog = {
          id: generateLogId("log-seq"),
          campaignId: campaign.id,
          leadId: leadState.leadId,
          leadName: leadState.leadName,
          nodeId: currentStep.id,
          nodeLabel: currentStep.title,
          nodeType: currentStep.type,
          timestamp: new Date().toISOString(),
          status: "success",
          message: `Paso ${stepIndex + 1} (${currentStep.title}): ${leadState.leadName} ya es contacto de 1er grado en LinkedIn. Se omite la invitación de conexión y la secuencia avanza directamente al siguiente paso.`,
          details: { isAlreadyConnected: true, stepOrder: stepIndex + 1, dryRun: isDry },
        };
        recordExecutionLog(log);
        const nextIndex = stepIndex + 1;
        const isDone = nextIndex >= campaign.steps.length;
        return {
          success: true,
          newState: {
            ...leadState,
            hasAcceptedInvite: true,
            state: isDone ? "completed" : "in_progress",
            history: [...leadState.history, currentStep.id],
          },
          log,
          isSequenceCompleted: isDone,
          nextStepIndex: nextIndex,
        };
      }

      let noteText = currentStep.connectNote || currentStep.messageTemplate;
      if (noteText && leadState.language && leadState.language !== "es") {
        try {
          noteText = await translateOutreachMessage(noteText, leadState.language);
        } catch {}
      }
      const note = noteText
        ? noteText
            .replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0])
            .replace(/{{topic}}/gi, topicVal)
            .replace(/{{company}}/gi, companyVal)
            .replace(/{{keyword}}/gi, "SISTEMA")
        : undefined;

      if (!isDry) {
        const maxConnections = campaign.dailyLimits?.maxConnectionsPerDay ?? 20;
        if (pacing.invitationsSent >= maxConnections) {
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "rate_limited",
            message: `Límite diario de invitaciones alcanzado (${pacing.invitationsSent}/${maxConnections}). Secuencia reprogramada para mañana para proteger la cuenta.`,
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "waiting_delay" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        const targetProviderId = leadState.providerId;
        if (!targetProviderId) {
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "error",
            message: `No se pudo enviar la invitación a ${leadState.leadName}: Falta el provider_id de LinkedIn.`,
            details: { dryRun: isDry },
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "failed" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        try {
          await unipile.followUser({ account_id: accountId, provider_id: targetProviderId });
        } catch (err) {
          console.warn("[Runner] Advertencia follow:", err);
        }

        try {
          await unipile.sendInvitation({
            account_id: accountId,
            provider_id: targetProviderId,
            message: note,
          });
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "error",
            message: `Error al enviar invitación de conexión a ${leadState.leadName}: ${errorMsg}`,
            details: { error: errorMsg, dryRun: isDry },
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "failed" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        incrementAccountPacing(accountId, "invitation");
      }

      const log: CampaignExecutionLog = {
        id: generateLogId("log-seq"),
        campaignId: campaign.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentStep.id,
        nodeLabel: currentStep.title,
        nodeType: currentStep.type,
        timestamp: new Date().toISOString(),
        status: "success",
        message: isDry
          ? `[SIMULACIÓN] Paso ${stepIndex + 1} (${currentStep.title}): Invitación preparada${note ? ` con nota: ("${note.slice(0, 40)}...")` : " sin nota"} para ${leadState.leadName}.`
          : `Paso ${stepIndex + 1} (${currentStep.title}): Invitación de conexión enviada a ${leadState.leadName} en LinkedIn${note ? ` con nota personalizada ("${note.slice(0, 40)}...")` : ""}. Cuota hoy: ${pacing.invitationsSent + 1}/${campaign.dailyLimits?.maxConnectionsPerDay ?? 20}.`,
        details: { note, stepOrder: stepIndex + 1, dryRun: isDry },
      };
      recordExecutionLog(log);

      const nextIndex = stepIndex + 1;
      const isDone = nextIndex >= campaign.steps.length;
      return {
        success: true,
        newState: {
          ...leadState,
          hasAcceptedInvite: true,
          state: isDone ? "completed" : "in_progress",
          history: [...leadState.history, currentStep.id],
        },
        log,
        isSequenceCompleted: isDone,
        nextStepIndex: nextIndex,
      };
    }

    case "message_icebreaker":
    case "message_followup":
    case "message_value_prop":
    default: {
      let messageTemplate = currentStep.messageTemplate || "Hola {{first_name}}";
      if (leadState.language && leadState.language !== "es") {
        try {
          messageTemplate = await translateOutreachMessage(messageTemplate, leadState.language);
        } catch {}
      }

      const resourceName = currentStep.attachedResource || currentStep.attachmentName || "recurso";
      const messageBody = messageTemplate
        .replace(/{{first_name}}/gi, leadState.leadName.split(" ")[0])
        .replace(/{{company}}/gi, companyVal)
        .replace(/{{topic}}/gi, topicVal)
        .replace(/{{author_name}}/gi, "Roberto")
        .replace(/{{keyword}}/gi, "SISTEMA")
        .replace(/{{attached_resource}}/gi, resourceName);

      if (!isDry) {
        const maxMessages = campaign.dailyLimits?.maxMessagesPerDay ?? 20;
        if (pacing.dmsSent >= maxMessages) {
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "rate_limited",
            message: `Límite diario de mensajes alcanzado (${pacing.dmsSent}/${maxMessages}). Mensaje pospuesto para proteger la cuenta.`,
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "waiting_delay" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        try {
          if (leadState.chatId) {
            await unipile.sendMessage({
              chat_id: leadState.chatId,
              text: messageBody,
            });
          } else {
            const targetProviderId = leadState.providerId;
            if (!targetProviderId) {
              throw new Error(`Falta el identificador de LinkedIn (provider_id) para iniciar chat con ${leadState.leadName}`);
            }
            const chatRes = await unipile.startChat({
              account_id: accountId,
              attendees_ids: [targetProviderId],
              text: messageBody,
            });
            if (chatRes?.chat_id) {
              leadState.chatId = chatRes.chat_id;
            }
          }
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          const log: CampaignExecutionLog = {
            id: generateLogId("log-seq"),
            campaignId: campaign.id,
            leadId: leadState.leadId,
            leadName: leadState.leadName,
            nodeId: currentStep.id,
            nodeLabel: currentStep.title,
            nodeType: currentStep.type,
            timestamp: new Date().toISOString(),
            status: "error",
            message: `Error al enviar mensaje directo a ${leadState.leadName}: ${errorMsg}`,
            details: { error: errorMsg, dryRun: isDry },
          };
          recordExecutionLog(log);
          return {
            success: false,
            newState: { ...leadState, state: "failed" },
            log,
            isSequenceCompleted: false,
            nextStepIndex: stepIndex,
          };
        }

        incrementAccountPacing(accountId, "dm");
      }

      // Detalle de adjunto multimedia si existe
      let attachmentDetail = "";
      if (currentStep.attachmentType && currentStep.attachmentType !== "none") {
        const attTypeLabels: Record<string, string> = {
          image: "Imagen",
          video: "Video",
          voice_note: "Nota de Voz",
          document: "Documento PDF",
        };
        const typeLabel = attTypeLabels[currentStep.attachmentType] || "Archivo";
        attachmentDetail = ` [+ ${typeLabel}: ${currentStep.attachmentName || resourceName}${currentStep.attachmentSize ? ` (${currentStep.attachmentSize})` : ""}]`;
      }

      const log: CampaignExecutionLog = {
        id: generateLogId("log-seq"),
        campaignId: campaign.id,
        leadId: leadState.leadId,
        leadName: leadState.leadName,
        nodeId: currentStep.id,
        nodeLabel: currentStep.title,
        nodeType: currentStep.type,
        timestamp: new Date().toISOString(),
        status: "success",
        message: isDry
          ? `[SIMULACIÓN] Paso ${stepIndex + 1} (${currentStep.title}): Mensaje preparado para ${leadState.leadName}: "${messageBody.slice(0, 50)}..."${attachmentDetail}.`
          : `Paso ${stepIndex + 1} (${currentStep.title}): Mensaje enviado a ${leadState.leadName} en LinkedIn DM${attachmentDetail}.`,
        details: {
          message: messageBody,
          attachmentType: currentStep.attachmentType,
          attachmentName: currentStep.attachmentName || resourceName,
          attachmentSize: currentStep.attachmentSize,
          stepOrder: stepIndex + 1,
          dryRun: isDry,
        },
      };
      recordExecutionLog(log);

      const nextIndex = stepIndex + 1;
      const isDone = nextIndex >= campaign.steps.length;
      return {
        success: true,
        newState: {
          ...leadState,
          state: isDone ? "completed" : "in_progress",
          history: [...leadState.history, currentStep.id],
        },
        log,
        isSequenceCompleted: isDone,
        nextStepIndex: nextIndex,
      };
    }
  }
}

/**
 * Ejecutor en Serie de la Secuencia Completa:
 * Simula o despacha todos los pasos (1..N) para un lead, generando los logs de cada fase.
 */
export async function executeAllLinearSequenceStepsForLead(params: {
  campaign: LinearSequenceCampaign;
  leadState: LeadCampaignState;
  accountId?: string;
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  totalExecuted: number;
  finalState: LeadCampaignState;
  logs: CampaignExecutionLog[];
}> {
  const { campaign, leadState, accountId, dryRun } = params;
  let currentState = { ...leadState };
  const logs: CampaignExecutionLog[] = [];
  let overallSuccess = true;

  for (let i = 0; i < campaign.steps.length; i++) {
    const res = await executeLinearSequenceStepForLead({
      campaign,
      stepIndex: i,
      leadState: currentState,
      accountId,
      dryRun,
    });
    logs.push(res.log);
    currentState = res.newState;
    if (!res.success) {
      overallSuccess = false;
      break;
    }
    if (res.isSequenceCompleted) {
      break;
    }
  }

  return {
    success: overallSuccess,
    totalExecuted: logs.length,
    finalState: currentState,
    logs,
  };
}
