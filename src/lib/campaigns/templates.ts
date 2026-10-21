import type { Edge, Node } from "@xyflow/react";
import type { NodeConfigData } from "./types";

export const defaultCampaignNodes: Node[] = [
  {
    id: "node-tr-01",
    type: "triggerNode",
    position: { x: 340, y: 30 },
    data: {
      label: "TR-01: Signal Monitor Trigger",
      category: "trigger",
      nodeType: "trigger_signal",
      description: "Escucha Monitor Nivel 1 (Palabra clave: SISTEMA)",
      signalLevel: "level_1",
      keyword: "SISTEMA",
    } as NodeConfigData,
  },
  {
    id: "node-ac-01",
    type: "actionNode",
    position: { x: 340, y: 160 },
    data: {
      label: "AC-01: Visitar Perfil",
      category: "action",
      nodeType: "action_visit",
      description: "Ejecuta visita en LinkedIn para figurar en notificaciones",
    } as NodeConfigData,
  },
  {
    id: "node-ac-02",
    type: "actionNode",
    position: { x: 340, y: 290 },
    data: {
      label: "AC-02: Dar Like y Comentar",
      category: "action",
      nodeType: "action_like_comment",
      description: "Reacciona con Like y publica comentario contextual en el post del prospecto",
      commentText: "¡Excelente perspectiva {{first_name}}! Totalmente de acuerdo.",
      useAiComment: true,
    } as NodeConfigData,
  },
  {
    id: "node-ac-03",
    type: "actionNode",
    position: { x: 340, y: 420 },
    data: {
      label: "AC-03: Seguir y Conectar",
      category: "action",
      nodeType: "action_follow_connect",
      description: "Sigue el perfil en LinkedIn y envia solicitud de conexion con nota (se omite si ya estan conectados)",
      hasNote: true,
      noteText: "Hola {{first_name}}, vi tu comentario en mi post y te sigo por aqui. Te invito a conectar para entregarte la guia por privado.",
    } as NodeConfigData,
  },
  {
    id: "node-delay-01",
    type: "delayNode",
    position: { x: 340, y: 550 },
    data: {
      label: "LG-01: Delay Esperar Aceptacion",
      category: "logic",
      nodeType: "logic_delay",
      description: "Espera hasta 3 dias en horario laboral (09:00 - 18:00)",
      delayDays: 3,
      workingHoursOnly: true,
    } as NodeConfigData,
  },
  {
    id: "node-ac-04",
    type: "actionNode",
    position: { x: 340, y: 680 },
    data: {
      label: "AC-04: Enviar DM + Adjuntar PDF",
      category: "action",
      nodeType: "action_dm",
      description: "Entrega directa del Lead Magnet con archivo adjunto",
      dmText: "Hola {{first_name}}, aqui tienes la guia en PDF que solicitaste.",
      attachedResource: "Guia_Framework_SISTEMA_InHubFlow.pdf",
    } as NodeConfigData,
  },
  {
    id: "node-delay-02",
    type: "delayNode",
    position: { x: 340, y: 810 },
    data: {
      label: "LG-01: Delay 48 Horas",
      category: "logic",
      nodeType: "logic_delay",
      description: "Pausa de seguimiento antes de enviar recordatorio",
      delayHours: 48,
      workingHoursOnly: true,
    } as NodeConfigData,
  },
  {
    id: "node-ac-05",
    type: "actionNode",
    position: { x: 340, y: 940 },
    data: {
      label: "AC-05: Enviar Follow-up de Valor",
      category: "action",
      nodeType: "action_dm",
      description: "Seguimiento consultivo de valor agregado",
      dmText: "¿Pudiste revisar el framework {{first_name}}? Te comparto un caso practico...",
    } as NodeConfigData,
  },
  {
    id: "node-end-01",
    type: "controlNode",
    position: { x: 340, y: 1070 },
    data: {
      label: "CT-01: Finalizar Secuencia",
      category: "control",
      nodeType: "control_end",
      description: "Secuencia finalizada exitosamente para este contacto",
    } as NodeConfigData,
  },
];

export const defaultCampaignEdges: Edge[] = [
  { id: "e-tr-ac1", source: "node-tr-01", target: "node-ac-01", animated: true },
  { id: "e-ac1-ac2", source: "node-ac-01", target: "node-ac-02" },
  { id: "e-ac2-ac3", source: "node-ac-02", target: "node-ac-03" },
  { id: "e-ac3-delay1", source: "node-ac-03", target: "node-delay-01" },
  { id: "e-delay1-ac4", source: "node-delay-01", target: "node-ac-04" },
  { id: "e-ac4-delay2", source: "node-ac-04", target: "node-delay-02" },
  { id: "e-delay2-ac5", source: "node-delay-02", target: "node-ac-05" },
  { id: "e-ac5-end", source: "node-ac-05", target: "node-end-01" },
];

export const availablePaletteNodes = [
  {
    type: "actionNode",
    label: "AC-01: Visitar Perfil",
    category: "action" as const,
    nodeType: "action_visit" as const,
    description: "Visita el perfil de LinkedIn para figurar en sus notificaciones",
  },
  {
    type: "actionNode",
    label: "AC-02: Dar Like y Comentar",
    category: "action" as const,
    nodeType: "action_like_comment" as const,
    description: "Reacciona con Like y publica un comentario en el post en un solo paso",
  },
  {
    type: "actionNode",
    label: "AC-03: Seguir y Conectar",
    category: "action" as const,
    nodeType: "action_follow_connect" as const,
    description: "Sigue el perfil y envia solicitud de conexion con nota opcional en un solo paso",
  },
  {
    type: "actionNode",
    label: "AC-04: Enviar DM + Adjunto",
    category: "action" as const,
    nodeType: "action_dm" as const,
    description: "Envia mensaje directo con documento PDF o enlace",
  },
  {
    type: "actionNode",
    label: "AC-05: InMail Sales Nav",
    category: "action" as const,
    nodeType: "action_inmail" as const,
    description: "Envia InMail a prospectos fuera de red sin consumir conexion",
  },
  {
    type: "delayNode",
    label: "LG-01: Delay / Retardo",
    category: "logic" as const,
    nodeType: "logic_delay" as const,
    description: "Pausa en dias u horas con ventana de horario laboral",
  },
  {
    type: "controlNode",
    label: "CT-01: Finalizar Flujo",
    category: "control" as const,
    nodeType: "control_end" as const,
    description: "Concluye la secuencia para este prospecto",
  },
];
