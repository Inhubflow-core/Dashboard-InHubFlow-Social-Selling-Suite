"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getInboxConversations,
  markConversationAsRead,
  saveInboxConversations,
  sendMessageToConversation,
  updateConversationStage,
} from "@/lib/inbox/store";
import type { ChatConversation } from "@/lib/inbox/types";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Calendar,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  FileText,
  MapPin,
  Mic,
  Paperclip,
  Play,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const STAGES = [
  { id: "lead_captured", name: "1. Lead Captado" },
  { id: "in_sequence", name: "2. En Secuencia" },
  { id: "connected_material_sent", name: "3. Conectado / Material Entregado" },
  { id: "interested", name: "4. Conversacion Activa / Interesado" },
  { id: "meeting_scheduled", name: "5. Reunion Agendada" },
  { id: "proposal_sent", name: "6. Propuesta Presentada" },
  { id: "won", name: "7. Ganado (Closed Won)" },
];

export default function InboxPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tabFilter, setTabFilter] = useState<"all" | "unread" | "interested" | "meeting">("all");
  const [messageInput, setMessageInput] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    const list = getInboxConversations();
    setConversations(list);
    if (list.length > 0 && !activeConvId) {
      setActiveConvId(list[0].id);
    }
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0] || null;
  }, [conversations, activeConvId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        c.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCampaign = filterCampaign === "all" || c.campaignSource === filterCampaign;

      let matchTab = true;
      if (tabFilter === "unread") matchTab = c.unread;
      if (tabFilter === "interested") matchTab = c.crmStageId === "interested";
      if (tabFilter === "meeting") matchTab = c.crmStageId === "meeting_scheduled";

      return matchSearch && matchCampaign && matchTab;
    });
  }, [conversations, searchQuery, filterCampaign, tabFilter]);

  const uniqueCampaigns = useMemo(() => {
    return Array.from(new Set(conversations.map((c) => c.campaignSource)));
  }, [conversations]);

  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConvId(conv.id);
    if (conv.unread) {
      const updated = markConversationAsRead(conv.id);
      setConversations(updated);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : messageInput;
    if (!text.trim() || !activeConversation) return;

    const updated = sendMessageToConversation(activeConversation.id, text.trim());
    setConversations(updated);
    setMessageInput("");

    // Sincronizar salida con LinkedIn vía Unipile
    fetch("/api/unipile/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: activeConversation.id,
        text: text.trim(),
      }),
    }).catch((err) => console.warn("[Inbox] Error enviando a Unipile:", err));
  };

  const handleSelectAiSuggestion = (suggestion: string) => {
    setMessageInput(suggestion);
  };

  const handleSendAiSuggestionDirectly = (suggestion: string) => {
    handleSendMessage(suggestion);
    showNotice("Respuesta inteligente enviada por SDR Co-Pilot");
  };

  const handleSendMeetingLink = () => {
    if (!activeConversation) return;
    const meetingText =
      "Puedes elegir el horario que mejor te convenga directamente en mi calendario de reuniones: https://cal.inhubflow.com/sdr-meeting";
    const updated = sendMessageToConversation(activeConversation.id, meetingText);
    setConversations(updated);
    showNotice("Enlace de agendamiento enviado exitosamente");
  };

  const handleSendVoiceNote = () => {
    if (!activeConversation) return;
    const updated = sendMessageToConversation(
      activeConversation.id,
      "Te comparto esta breve nota de voz con los detalles:",
      {
        name: "Nota_de_voz_SDR.mp3",
        type: "audio",
        size: "0:42 seg",
      }
    );
    setConversations(updated);
    showNotice("Nota de voz de LinkedIn enviada");
  };

  const handleSendPdfAttachment = () => {
    if (!activeConversation) return;
    const updated = sendMessageToConversation(
      activeConversation.id,
      "Aqui tienes el documento adjunto complementario con la metodologia:",
      {
        name: "InHubFlow_Social_Selling_Playbook.pdf",
        type: "pdf",
        size: "3.2 MB",
      }
    );
    setConversations(updated);
    showNotice("Documento PDF adjuntado y enviado al prospecto");
  };

  const handleChangeStage = (newStageId: string) => {
    if (!activeConversation) return;
    const found = STAGES.find((s) => s.id === newStageId);
    if (!found) return;
    const updated = updateConversationStage(activeConversation.id, found.name, found.id);
    setConversations(updated);
    showNotice(`Etapa de CRM actualizada a: ${found.name}`);
  };

  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Toast Notificacion */}
      {notificationMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 border border-brand-500/30 px-4 py-2.5 text-xs text-white shadow-xl dark:bg-black">
          <Sparkles className="size-4 text-brand-400 animate-pulse" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <PageBreadcrumb pageTitle="Inbox Unificado (Enfocado en Ventas)" />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
            Buzon depurado exclusivamente para prospectos de campanas activas con asistencia de SDR Co-Pilot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sincronización Cloud Activa (LinkedIn)
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="flex-1 grid grid-cols-12 gap-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        {/* Panel Izquierdo: Lista de Conversaciones */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900">
          {/* Filtros superiores */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2 bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prospecto, empresa o mensaje..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex gap-1.5">
              <select
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                aria-label="Filtrar por campana"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">Todas las Campanas</option>
                {uniqueCampaigns.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>

            {/* Pestañas rápidas */}
            <div className="flex gap-1 pt-1">
              <button
                type="button"
                onClick={() => setTabFilter("all")}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  tabFilter === "all"
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("unread")}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  tabFilter === "unread"
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                No leidas
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("interested")}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  tabFilter === "interested"
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Interesados
              </button>
              <button
                type="button"
                onClick={() => setTabFilter("meeting")}
                className={`flex-1 rounded-md py-1 text-xs font-medium transition ${
                  tabFilter === "meeting"
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Reuniones
              </button>
            </div>
          </div>

          {/* Lista scrolleable */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No se encontraron conversaciones con los filtros aplicados.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 cursor-pointer transition relative ${
                      isActive
                        ? "bg-brand-50/80 border-l-4 border-l-brand-500 dark:bg-brand-950/20"
                        : "hover:bg-gray-50 dark:hover:bg-white/3"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center dark:bg-brand-950 dark:text-brand-300">
                          {conv.avatarInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                              {conv.leadName}
                            </h4>
                            {conv.unread && (
                              <span className="size-2 rounded-full bg-brand-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[170px]">
                            {conv.leadTitle} - {conv.company}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-2">
                      {conv.lastMessage}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {conv.campaignSource.replace("Nivel ", "N")}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          conv.crmStageId === "meeting_scheduled"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                            : conv.crmStageId === "interested"
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {conv.crmStage}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Derecho: Chat Activo + SDR Co-Pilot */}
        {activeConversation ? (
          <div className="col-span-12 md:col-span-8 lg:col-span-8 flex flex-col h-full bg-gray-50/30 dark:bg-gray-900/40">
            {/* Header del Chat */}
            <div className="p-3.5 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-500 text-white font-bold text-sm flex items-center justify-center">
                  {activeConversation.avatarInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {activeConversation.leadName}
                    </h3>
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.2 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                      LinkedIn 1st
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeConversation.leadTitle} en {activeConversation.company} | {activeConversation.location}
                  </p>
                </div>
              </div>

              {/* Acciones Rápidas de Pipeline */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="crm-stage-select" className="text-xs text-gray-400 font-medium hidden sm:inline">
                    Etapa CRM:
                  </label>
                  <select
                    id="crm-stage-select"
                    value={activeConversation.crmStageId}
                    onChange={(e) => handleChangeStage(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleChangeStage("interested")}
                  className="rounded-lg border border-brand-500 bg-brand-50/50 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:bg-brand-950/20 dark:text-brand-400 transition"
                >
                  Marcar Interesado
                </button>

                <button
                  type="button"
                  onClick={handleSendMeetingLink}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1"
                >
                  <Calendar className="size-3.5" />
                  <span>Enviar Calendario</span>
                </button>
              </div>
            </div>

            {/* Barra de Contexto de Campaña */}
            <div className="px-4 py-1.5 bg-gray-100/70 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Origen:</span>
                <span>{activeConversation.campaignSource}</span>
                {activeConversation.leadMagnetUsed && (
                  <span className="rounded bg-brand-100/50 text-brand-700 px-1.5 py-0.5 text-xs dark:bg-brand-950/50 dark:text-brand-300 font-mono">
                    Recurso: {activeConversation.leadMagnetUsed}
                  </span>
                )}
              </div>
              <a
                href={`/leads`}
                className="text-brand-600 hover:underline flex items-center gap-1 dark:text-brand-400"
              >
                <span>Ver Ficha</span>
                <ChevronRight className="size-3" />
              </a>
            </div>

            {/* Flujo de Mensajes */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-lg rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                      msg.isSender
                        ? "bg-brand-500 text-white rounded-tr-none"
                        : "bg-white border border-gray-200 text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-white rounded-tl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span
                        className={`text-xs font-bold ${
                          msg.isSender ? "text-white/80" : "text-brand-600 dark:text-brand-400"
                        }`}
                      >
                        {msg.senderName}
                      </span>
                      <span
                        className={`text-xs ${
                          msg.isSender ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Adjuntos: PDF o Audio */}
                    {msg.attachment && msg.attachment.type === "pdf" && (
                      <div
                        className={`mt-2.5 rounded-xl p-2.5 flex items-center justify-between gap-3 ${
                          msg.isSender
                            ? "bg-white/15 border border-white/20"
                            : "bg-gray-50 border border-gray-200 dark:bg-gray-900/60 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="size-5 text-red-400" />
                          <div>
                            <p className="text-xs font-semibold truncate max-w-[200px]">
                              {msg.attachment.name}
                            </p>
                            {msg.attachment.size && (
                              <p
                                className={`text-xs ${
                                  msg.isSender ? "text-white/70" : "text-gray-400"
                                }`}
                              >
                                {msg.attachment.size} - Documento PDF
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => showNotice(`Descargando ${msg.attachment?.name}...`)}
                          className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                            msg.isSender
                              ? "bg-white text-brand-600 hover:bg-white/90"
                              : "bg-brand-500 text-white hover:bg-brand-600"
                          }`}
                        >
                          Ver Archivo
                        </button>
                      </div>
                    )}

                    {msg.attachment && msg.attachment.type === "audio" && (
                      <div
                        className={`mt-2.5 rounded-xl p-2.5 flex items-center justify-between gap-3 ${
                          msg.isSender
                            ? "bg-white/15 border border-white/20"
                            : "bg-gray-50 border border-gray-200 dark:bg-gray-900/60 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setIsPlayingAudio(
                                isPlayingAudio === msg.id ? null : msg.id
                              )
                            }
                            className={`size-8 rounded-full flex items-center justify-center transition ${
                              msg.isSender
                                ? "bg-white text-brand-600"
                                : "bg-brand-500 text-white"
                            }`}
                          >
                            {isPlayingAudio === msg.id ? (
                              <Volume2 className="size-4 animate-bounce" />
                            ) : (
                              <Play className="size-4 ml-0.5" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold">Nota de Voz LinkedIn</span>
                              <span
                                className={`text-xs ${
                                  msg.isSender ? "text-white/80" : "text-gray-400"
                                }`}
                              >
                                {msg.attachment.size || "0:30"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[3, 6, 9, 5, 8, 12, 10, 7, 4, 11, 8, 4].map((h, i) => (
                                <span
                                  key={i}
                                  style={{ height: `${h}px` }}
                                  className={`w-1 rounded-full ${
                                    msg.isSender
                                      ? "bg-white/60"
                                      : "bg-brand-500/60"
                                  } ${isPlayingAudio === msg.id ? "animate-pulse" : ""}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Widget SDR Co-Pilot (3 Respuestas IA Clicables) */}
            <div className="p-3 bg-brand-50/60 border-t border-brand-200 dark:bg-brand-950/20 dark:border-brand-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Bot className="size-4 text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                    SDR Co-Pilot (Respuestas Sugeridas con IA):
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Haz clic para insertar o enviar directo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {activeConversation.aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-brand-200 bg-white p-2.5 shadow-2xs hover:border-brand-500 hover:shadow-xs transition dark:border-gray-700 dark:bg-gray-800"
                  >
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                      "{suggestion}"
                    </p>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between dark:border-gray-700/60">
                      <button
                        type="button"
                        onClick={() => handleSelectAiSuggestion(suggestion)}
                        className="text-xs font-semibold text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-300"
                      >
                        Cargar en texto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendAiSuggestionDirectly(suggestion)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                      >
                        <span>Enviar</span>
                        <ArrowRight className="size-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barra de Entrada de Mensajes y Acciones Multimedia */}
            <div className="p-3 bg-white border-t border-gray-100 dark:border-gray-800 dark:bg-gray-900 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendPdfAttachment}
                  title="Adjuntar Playbook / Lead Magnet PDF"
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Paperclip className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  title="Enviar Nota de Voz de LinkedIn"
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Mic className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendMeetingLink}
                  title="Insertar enlace de reunion Cal.com"
                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition flex items-center gap-1.5 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Calendar className="size-3.5" />
                  <span className="hidden sm:inline">Cal.com</span>
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Escribe una respuesta o selecciona una sugerencia del SDR Co-Pilot..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Enviar</span>
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-12 md:col-span-8 flex items-center justify-center p-8 text-gray-400 text-xs">
            Selecciona una conversacion para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}
