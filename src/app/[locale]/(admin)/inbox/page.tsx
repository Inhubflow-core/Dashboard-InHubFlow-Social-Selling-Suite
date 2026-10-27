"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProspectAvatar from "@/components/leads/ProspectAvatar";
import { Link } from "@/i18n/navigation";
import {
  addIncomingMessageToConversation,
  getInboxConversations,
  markConversationAsRead,
  saveInboxConversations,
  sendMessageToConversation,
  updateConversationStage,
  setConversationUnipileChatId,
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
  MessageSquare,
  Mic,
  Paperclip,
  Play,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Volume2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getStoredSdrConfig, setSdrMode } from "@/lib/sdr/store";
import type { SdrMode } from "@/lib/sdr/types";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("inbox");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tabFilter, setTabFilter] = useState<"all" | "unread">("all");
  const [messageInput, setMessageInput] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [sdrMode, setLocalSdrMode] = useState<SdrMode>("copilot");

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

      const matchTab = tabFilter === "all" ? true : c.unread;

      return matchSearch && matchCampaign && matchTab;
    });
  }, [conversations, searchQuery, filterCampaign, tabFilter]);

  const unreadCount = useMemo(() => {
    return conversations.filter((c) => c.unread).length;
  }, [conversations]);

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
        chatId: activeConversation.unipileChatId || activeConversation.id,
        leadName: activeConversation.leadName,
        leadId: activeConversation.leadId,
        text: text.trim(),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[Inbox] Error enviando a Unipile:", errData);
        } else {
          const data = await res.json();
          if (data.chatId && data.chatId !== activeConversation.unipileChatId) {
            setConversationUnipileChatId(activeConversation.id, data.chatId);
            activeConversation.unipileChatId = data.chatId;
          }
        }
      })
      .catch((err) => console.warn("[Inbox] Error enviando a Unipile:", err));
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
    handleSendMessage(meetingText);
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
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle={t("pageTitle")} />

      {/* Toast Notificacion */}
      {notificationMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-lg bg-gray-900 border border-brand-500/30 px-4 py-2.5 text-xs text-white shadow-xl dark:bg-black">
          <Sparkles className="size-4 text-brand-400 animate-pulse" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Card Principal: Bandeja de Entrada Comercial & Filtros */}
      <div className="w-full rounded-lg border border-gray-300 bg-white dark:border-gray-800 dark:bg-white/3 shadow-theme-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {t("pageTitle")}
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("cloudSync")}
              </span>
              <span className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                LinkedIn Cloud API
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("cardDesc")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sdr"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 shadow-theme-xs transition"
            >
              <Bot className="size-3.5 text-[#0099ff]" />
              <span>SDR Copilot</span>
            </Link>
          </div>
        </div>

        {/* Filtros de Búsqueda y Segmentación (exacto formato de Leads & CRM) */}
        <div className="border-t border-gray-300 px-6 py-4 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Col 1: Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Col 2: Selector de Campaña */}
          <div>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              aria-label={t("filterCampaignAria")}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs text-gray-700 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">{t("allCampaigns")}</option>
              {uniqueCampaigns.map((camp) => (
                <option key={camp} value={camp}>
                  {camp}
                </option>
              ))}
            </select>
          </div>

          {/* Col 3: Selector de Pestañas / Filtro de Estado (Todas / No Leídas) */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60 w-full justify-center">
            <button
              type="button"
              onClick={() => setTabFilter("all")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-medium transition ${
                tabFilter === "all"
                  ? "bg-[#0099ff] text-white shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
              }`}
            >
              <span>{t("filterAll")}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                tabFilter === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}>
                {conversations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTabFilter("unread")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-medium transition ${
                tabFilter === "unread"
                  ? "bg-[#0099ff] text-white shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
              }`}
            >
              <span>{t("filterUnread")}</span>
              {unreadCount > 0 ? (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  tabFilter === "unread" ? "bg-white text-[#0099ff]" : "bg-brand-500 text-white"
                }`}>
                  {unreadCount}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  0
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="w-full min-h-[680px] grid grid-cols-12 gap-0 rounded-lg border border-gray-300 bg-white overflow-hidden shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        {/* Panel Izquierdo: Lista de Conversaciones */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4 border-r border-gray-300 dark:border-gray-800 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {filteredConversations.length} {filteredConversations.length === 1 ? "Conversación" : "Conversaciones"}
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">
                {unreadCount} {t("filterUnread").toLowerCase()}
              </span>
            )}
          </div>

          {/* Lista scrolleable */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-300 dark:divide-gray-800">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                {t("noConversations")}
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
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ProspectAvatar
                          imageUrl={conv.avatarUrl}
                          name={conv.leadName}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {conv.leadName}
                            </h4>
                            {conv.unread && (
                              <span className="size-2 rounded-full bg-brand-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {conv.leadTitle}{conv.company ? ` · ${conv.company}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${conv.unread ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                      {conv.lastMessage}
                    </p>
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
            <div className="p-3.5 border-b border-gray-300 bg-white flex flex-wrap items-center justify-between gap-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <ProspectAvatar
                  imageUrl={activeConversation.avatarUrl}
                  name={activeConversation.leadName}
                  size="md"
                  className="size-10 shrink-0 rounded-full overflow-hidden"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {activeConversation.leadName}
                    </h3>
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-1.5 py-0.2 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
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
                    {t("crmStageLabel")}
                  </label>
                  <select
                    id="crm-stage-select"
                    value={activeConversation.crmStageId}
                    onChange={(e) => handleChangeStage(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
                  <span>{t("sendCalendar")}</span>
                </button>
              </div>
            </div>

            {/* Barra de Contexto de Campaña */}
            <div className="px-4 py-1.5 bg-gray-100/70 border-b border-gray-300 flex items-center justify-between text-xs text-gray-500 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{t("source")}</span>
                <span>{activeConversation.campaignSource}</span>
                {activeConversation.leadMagnetUsed && (
                  <span className="rounded-lg bg-brand-100/50 text-brand-700 px-1.5 py-0.5 text-xs dark:bg-brand-950/50 dark:text-brand-300 font-mono">
                    {t("resource")} {activeConversation.leadMagnetUsed}
                  </span>
                )}
              </div>
              <a
                href={`/leads`}
                className="text-brand-600 hover:underline flex items-center gap-1 dark:text-brand-400"
              >
                <span>{t("viewProfile")}</span>
                <ChevronRight className="size-3" />
              </a>
            </div>

            {/* Flujo de Mensajes */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.isSender ? "justify-end" : "justify-start"}`}
                >
                  {!msg.isSender && (
                    <ProspectAvatar
                      imageUrl={activeConversation.avatarUrl}
                      name={activeConversation.leadName}
                      size="xs"
                      className="size-7 shrink-0 rounded-full mb-1"
                    />
                  )}
                  <div
                    className={`max-w-lg rounded-lg p-3.5 text-sm leading-relaxed shadow-xs ${
                      msg.isSender
                        ? "bg-brand-500 text-white rounded-tr-none"
                        : "bg-white border border-gray-300 text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-white rounded-tl-none"
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

                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>

                    {/* Adjuntos: PDF o Audio */}
                    {msg.attachment && msg.attachment.type === "pdf" && (
                      <div
                        className={`mt-2.5 rounded-lg p-2.5 flex items-center justify-between gap-3 ${
                          msg.isSender
                            ? "bg-white/15 border border-white/20"
                            : "bg-gray-50 border border-gray-300 dark:bg-gray-900/60 dark:border-gray-700"
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
                          className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
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
                        className={`mt-2.5 rounded-lg p-2.5 flex items-center justify-between gap-3 ${
                          msg.isSender
                            ? "bg-white/15 border border-white/20"
                            : "bg-gray-50 border border-gray-300 dark:bg-gray-900/60 dark:border-gray-700"
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
                    {t("copilotHeader")}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("copilotHint")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {activeConversation.aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg border border-brand-200 bg-white p-2.5 shadow-2xs hover:border-brand-500 hover:shadow-xs transition dark:border-gray-700 dark:bg-gray-800"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      "{suggestion}"
                    </p>
                    <div className="mt-2 pt-2 border-t border-gray-300 flex items-center justify-between dark:border-gray-700/60">
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
                        <span>{t("send")}</span>
                        <ArrowRight className="size-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barra de Entrada de Mensajes y Acciones Multimedia */}
            <div className="p-3 bg-white border-t border-gray-300 dark:border-gray-800 dark:bg-gray-900 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendPdfAttachment}
                  title={t("attachPdfTitle")}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Paperclip className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  title={t("voiceNoteTitle")}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Mic className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSendMeetingLink}
                  title={t("calLinkTitle")}
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
                  placeholder={t("typeReplyPlaceholder")}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
            {t("selectConversationToStart")}
          </div>
        )}
      </div>
    </div>
  );
}
