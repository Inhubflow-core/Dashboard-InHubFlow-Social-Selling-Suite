"use client";

import React, { useState, useEffect } from "react";
import {
  Webhook,
  Play,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  UserCheck,
  Radio,
  Shield,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { addIncomingMessageToConversation } from "@/lib/inbox/store";
import { addStoredSignalLead } from "@/lib/signals/store";
import { addStoredPendingAction } from "@/lib/sdr/store";

interface WebhookLog {
  id: string;
  timestamp: string;
  event: string;
  status: "success" | "error";
  summary: string;
  payload: Record<string, unknown>;
  response: Record<string, unknown>;
}

export default function UnipileWebhookSimulator() {
  const [activeTab, setActiveTab] = useState<"message" | "invitation" | "comment" | "account">("message");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Estados para formulario de simulación
  const [simLeadName, setSimLeadName] = useState("Alejandro Ramos");
  const [simMessageText, setSimMessageText] = useState(
    "Hola Roberto, vi tu caso de exito sobre prospeccion B2B con IA y me gustaria coordinar una demo de 15 minutos esta semana."
  );
  const [simPostTitle, setSimPostTitle] = useState("Estrategias de Social Selling B2B para 2026");
  const [simCommentText, setSimCommentText] = useState("SISTEMA por favor Roberto, me interesa implementarlo en mi equipo!");
  const [simAuthorName, setSimAuthorName] = useState("Mariana Costa");
  const [simAccountStatus, setSimAccountStatus] = useState<"OK" | "CHECKPOINT" | "ERROR">("OK");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleTriggerSimulation = async (type: "incoming_message" | "invitation_accepted" | "keyword_comment" | "account_status") => {
    setIsSubmitting(true);
    try {
      let bodyData: Record<string, unknown> = { type };

      if (type === "incoming_message") {
        bodyData = {
          ...bodyData,
          senderName: simLeadName,
          message: simMessageText,
          chatId: "conv-1",
        };
      } else if (type === "invitation_accepted") {
        bodyData = {
          ...bodyData,
          senderName: "Carlos Benitez (VP Sales)",
        };
      } else if (type === "keyword_comment") {
        bodyData = {
          ...bodyData,
          postTitle: simPostTitle,
          commentText: simCommentText,
          authorName: simAuthorName,
        };
      } else if (type === "account_status") {
        bodyData = {
          ...bodyData,
          status: simAccountStatus,
        };
      }

      const res = await fetch("/api/unipile/simulate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (data.ok) {
        // Impactar stores del navegador para que el usuario lo vea en tiempo real
        if (type === "incoming_message") {
          addIncomingMessageToConversation("conv-1", simMessageText, simLeadName);
          // También encolar acción sugerida en el SDR IA
          addStoredPendingAction({
            id: `act-sim-${Date.now()}`,
            threadId: "conv-1",
            accountId: "acc-li-01",
            accountName: "Roberto OrSe",
            prospectName: simLeadName,
            prospectTitle: "VP Sales en CloudScale",
            prospectCompany: "CloudScale Technologies",
            prospectAvatar: "AR",
            lastInboundMessage: simMessageText,
            intent: "meeting_request",
            confidence: 0.96,
            riskLevel: "low",
            suggestedReply: `Hola ${simLeadName.split(" ")[0]}, con mucho gusto te muestro el framework. Puedes agendar directamente en mi calendario: https://cal.inhubflow.com/demo-20min`,
            citations: ["Protocolo de Agendamiento de Reuniones", "Propuesta de Valor de InHubFlow"],
            createdAt: new Date().toISOString(),
            status: "pending",
          });
          showNotice("Mensaje inyectado en el Inbox y encolado en el Asistente SDR IA con éxito.");
        } else if (type === "keyword_comment") {
          addStoredSignalLead({
            id: `lead-sig-${Date.now()}`,
            monitorId: "mon-l1-01",
            fullName: simAuthorName,
            headline: "Directora de Operaciones B2B en TechLatam",
            company: "TechLatam",
            location: "Madrid, España",
            linkedinUrl: "https://www.linkedin.com/in/mariana-costa-tech",
            connectionDegree: "2nd",
            intentLevel: "very_high",
            signalSnippet: `Comento '${simCommentText}' en: ${simPostTitle}`,
            detectedAt: "Recien detectado",
            status: "new",
            attachedResource: "Guia_Oficial_Social_Selling.pdf",
          });
          showNotice("Lead capturado en vivo por el Signal Radar con palabra clave 'SISTEMA'.");
        } else if (type === "invitation_accepted") {
          showNotice("Invitacion aceptada: Lead avanzado en el funnel de Social Selling.");
        } else if (type === "account_status") {
          showNotice(`Estado de la cuenta actualizado a: ${simAccountStatus}`);
        }

        const newLog: WebhookLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: data.payload?.event || type,
          status: "success",
          summary: data.result?.message || "Evento procesado correctamente",
          payload: data.payload,
          response: data.result,
        };
        setLogs((prev) => [newLog, ...prev].slice(0, 20));
      } else {
        showNotice("Error al ejecutar simulacion: " + (data.error || "Desconocido"));
      }
    } catch (err: unknown) {
      showNotice("Fallo en peticion HTTP al webhook");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Estado del Sandbox Unipile */}
      <div className="rounded-2xl border border-[#0099ff]/20 bg-[#0099ff]/5 p-5 dark:border-[#0099ff]/30 dark:bg-[#0099ff]/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0099ff] text-white shadow-md shadow-[#0099ff]/20">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Sandbox de Integración Cloud InHubFlow & Emulador de Webhooks
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500"></span>
                  Pruebas Ilimitadas (0/7 dias consumidos)
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                Todo el flujo de LinkedIn (Inbox, Signal Radar, SDR IA y Webhooks) está completamente listo y blindado para probar. La plataforma sincroniza de forma segura y automatizada en producción.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => copyToClipboard("/api/unipile/webhook", "webhook-endpoint")}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {copiedKey === "webhook-endpoint" ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span>URL Copiada</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copiar Endpoint Webhook</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {feedbackNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Selector de Evento a Simular */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Disparador de Eventos Webhook en Vivo
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecciona el tipo de evento de LinkedIn para simular la recepcion en tiempo real
            </p>
          </div>

          <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab("message")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "message"
                  ? "bg-white text-[#0099ff] shadow-sm dark:bg-gray-900 dark:text-[#0099ff]"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="size-3.5" />
              <span>Mensaje Entrante</span>
            </button>

            <button
              onClick={() => setActiveTab("comment")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "comment"
                  ? "bg-white text-[#0099ff] shadow-sm dark:bg-gray-900 dark:text-[#0099ff]"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Radio className="size-3.5" />
              <span>Signal Radar (Comentario)</span>
            </button>

            <button
              onClick={() => setActiveTab("invitation")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "invitation"
                  ? "bg-white text-[#0099ff] shadow-sm dark:bg-gray-900 dark:text-[#0099ff]"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <UserCheck className="size-3.5" />
              <span>Conexion Aceptada</span>
            </button>

            <button
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "account"
                  ? "bg-white text-[#0099ff] shadow-sm dark:bg-gray-900 dark:text-[#0099ff]"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Activity className="size-3.5" />
              <span>Estado de Cuenta</span>
            </button>
          </div>
        </div>

        {/* Formulario segun Tab activo */}
        <div className="mt-5 space-y-4">
          {activeTab === "message" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Nombre del Prospecto (Remitente)
                  </label>
                  <input
                    type="text"
                    value={simLeadName}
                    onChange={(e) => setSimLeadName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-[#0099ff] focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Destino en Suite
                  </label>
                  <div className="mt-1.5 flex h-[38px] items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-400">
                    Inbox Unificado + Cola de Aprobacion SDR IA
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Contenido del Mensaje de LinkedIn
                </label>
                <textarea
                  rows={3}
                  value={simMessageText}
                  onChange={(e) => setSimMessageText(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-medium text-gray-900 focus:border-[#0099ff] focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleTriggerSimulation("incoming_message")}
                  className="flex items-center gap-2 rounded-xl bg-[#0099ff] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#0099ff]/25 hover:bg-[#0088ee] disabled:opacity-50"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{isSubmitting ? "Disparando..." : "Disparar Mensaje Entrante a Inbox & SDR"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "comment" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Nombre del Prospecto
                  </label>
                  <input
                    type="text"
                    value={simAuthorName}
                    onChange={(e) => setSimAuthorName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-[#0099ff] focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Publicacion de LinkedIn Monitoreada
                  </label>
                  <input
                    type="text"
                    value={simPostTitle}
                    onChange={(e) => setSimPostTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-[#0099ff] focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Comentario (incluye palabra clave como SISTEMA, GUIA, INFO)
                </label>
                <input
                  type="text"
                  value={simCommentText}
                  onChange={(e) => setSimCommentText(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-[#0099ff] focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleTriggerSimulation("keyword_comment")}
                  className="flex items-center gap-2 rounded-xl bg-[#0099ff] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#0099ff]/25 hover:bg-[#0088ee] disabled:opacity-50"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{isSubmitting ? "Disparando..." : "Disparar Comentario & Capturar Lead en Signal Radar"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "invitation" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                <p>
                  Simula que el decisor <strong className="text-gray-900 dark:text-white">Carlos Benitez (VP Sales)</strong> acaba de aceptar la solicitud de conexion enviada por tu cuenta de LinkedIn. El evento disparara la actualizacion automatica del grado de relacion a 1er grado y despertara la secuencia de bienvenida.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleTriggerSimulation("invitation_accepted")}
                  className="flex items-center gap-2 rounded-xl bg-[#0099ff] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#0099ff]/25 hover:bg-[#0088ee] disabled:opacity-50"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{isSubmitting ? "Disparando..." : "Disparar Aceptacion de Conexion (1er Grado)"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Seleccionar Estado a Simular
                </label>
                <div className="mt-2 flex gap-3">
                  {(["OK", "CHECKPOINT", "ERROR"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSimAccountStatus(st)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                        simAccountStatus === st
                          ? "border-[#0099ff] bg-[#0099ff]/10 text-[#0099ff]"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleTriggerSimulation("account_status")}
                  className="flex items-center gap-2 rounded-xl bg-[#0099ff] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#0099ff]/25 hover:bg-[#0088ee] disabled:opacity-50"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>{isSubmitting ? "Disparando..." : `Disparar Cambio de Estado (${simAccountStatus})`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registro de Auditoría de Webhooks en Vivo */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-[#0099ff]" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Inspector de Webhooks Recibidos ({logs.length})
            </h3>
          </div>

          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Limpiar Consola
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="py-10 text-center">
            <Layers className="mx-auto size-8 text-gray-300 dark:text-gray-700" />
            <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              No hay eventos en la consola en este momento. Haz clic en cualquiera de los botones superiores para disparar una prueba en vivo.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      HTTP 200 OK
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {log.event}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">{log.timestamp}</span>
                </div>

                <p className="mt-2 font-sans text-xs text-gray-700 dark:text-gray-300">
                  {log.summary}
                </p>

                <div className="mt-3 rounded-lg bg-gray-900 p-3 text-[11px] text-gray-200 overflow-x-auto">
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
