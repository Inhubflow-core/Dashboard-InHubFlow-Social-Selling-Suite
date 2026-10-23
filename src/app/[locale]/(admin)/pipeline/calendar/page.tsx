"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { addCommercialMeeting, getMeetings } from "@/lib/pipeline/store";
import type { CommercialMeeting } from "@/lib/pipeline/types";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PipelineCalendarPage() {
  const [meetings, setMeetings] = useState<CommercialMeeting[]>([]);
  const [selectedTimeZone, setSelectedTimeZone] = useState("America/Buenos_Aires (GMT-3)");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulario nueva cita
  const [newLeadName, setNewLeadName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTitle, setNewTitle] = useState("Demostracion InHubFlow Social Selling");
  const [newDate, setNewDate] = useState("Viernes, 17 de Octubre");
  const [newTime, setNewTime] = useState("10:00 AM - 10:45 AM");
  const [newDuration, setNewDuration] = useState("45 min");
  const [newProvider, setNewProvider] = useState<"Google Calendar" | "Outlook" | "Cal.com">("Cal.com");
  const [newLink, setNewLink] = useState("https://meet.google.com/inh-custom-demo");
  const [newDealValue, setNewDealValue] = useState("$2,000/mes");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    setMeetings(getMeetings());
    // Auto-detect browser timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setSelectedTimeZone(`${tz} (Detectada)`);
      }
    } catch {
      // fallback
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchSearch =
        m.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchProvider = filterProvider === "all" || m.provider === filterProvider;
      const matchStatus = filterStatus === "all" || m.status === filterStatus;

      return matchSearch && matchProvider && matchStatus;
    });
  }, [meetings, searchQuery, filterProvider, filterStatus]);

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newCompany) return;

    const updated = addCommercialMeeting({
      leadName: newLeadName,
      company: newCompany,
      title: newTitle,
      date: newDate,
      time: newTime,
      duration: newDuration,
      provider: newProvider,
      meetingLink: newLink,
      status: "Confirmada",
      timeZone: selectedTimeZone,
      attendees: ["roberto@inhubflow.com"],
      dealValue: newDealValue,
      notes: newNotes,
    });

    setMeetings(updated);
    setIsModalOpen(false);
    setNewLeadName("");
    setNewCompany("");
    setNewNotes("");
    showToast("Reunion comercial agendada y sincronizada");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 border border-brand-500/30 px-4 py-2.5 text-xs text-white shadow-xl dark:bg-black">
          <Sparkles className="size-4 text-brand-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div>
          <PageBreadcrumb pageTitle="Calendario de Citas Comerciales" />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
            Gestion y sincronizacion bidireccional de videollamadas cerradas desde LinkedIn con Google Calendar, Outlook y Cal.com.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pipeline"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition shadow-2xs"
          >
            Ver Tablero Kanban
          </Link>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Agendar Cita Manual</span>
          </button>
        </div>
      </div>

      {/* Barra de Integraciones y Zona Horaria */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Proveedores Conectados */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-800 dark:text-white">
              Sincronizacion Activa:
            </span>

            <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              <CheckCircle2 className="size-3 text-blue-500" />
              <span>Google Calendar</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-50/60 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
              <CheckCircle2 className="size-3 text-cyan-500" />
              <span>Cal.com Webhook</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Outlook 365</span>
            </div>
          </div>

          {/* Selector de Zona Horaria */}
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-brand-500 shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Zona Horaria:
            </span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="America/Buenos_Aires (GMT-3)">America/Buenos Aires (GMT-3)</option>
              <option value="America/Mexico_City (GMT-6)">America/Mexico City (GMT-6)</option>
              <option value="America/Bogota (GMT-5)">America/Bogota / Lima (GMT-5)</option>
              <option value="America/Santiago (GMT-4)">America/Santiago (GMT-4)</option>
              <option value="Europe/Madrid (GMT+1)">Europe/Madrid (GMT+1)</option>
              <option value="America/New_York (GMT-5)">America/New York (GMT-5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Métricas de Citas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Reuniones esta Semana</span>
            <CalendarIcon className="size-4 text-brand-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {meetings.length} <span className="text-xs font-normal text-gray-400">citas</span>
          </p>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
            100% asistencias confirmadas
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Show Rate (Asistencia)</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            91.4%
          </p>
          <span className="text-xs text-gray-400 mt-0.5 block">
            Recordatorios automaticos por DM
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Duracion Promedio</span>
            <Clock className="size-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            38 min
          </p>
          <span className="text-xs text-gray-400 mt-0.5 block">
            Sesiones de demo comercial
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Pipeline Agendado</span>
            <Sparkles className="size-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            $7,200 <span className="text-xs font-normal text-gray-400">MRR</span>
          </p>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5 block">
            3 oportunidades calificadas
          </span>
        </div>
      </div>

      {/* Filtros de Citas */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="size-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por prospecto, empresa o titulo..."
            className="w-full text-xs text-gray-800 bg-transparent focus:outline-hidden dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">Todos los proveedores</option>
            <option value="Google Calendar">Google Calendar</option>
            <option value="Cal.com">Cal.com</option>
            <option value="Outlook">Outlook</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">Todos los estados</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Completada">Completada</option>
            <option value="Reprogramada">Reprogramada</option>
          </select>
        </div>
      </div>

      {/* Lista Principal de Reuniones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna Izquierda: Vista de Citas Agendadas (Cards) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              Agenda de Videollamadas ({filteredMeetings.length})
            </h3>
            <span className="text-xs text-gray-400">
              Sincronizado hace 2 minutos
            </span>
          </div>

          {filteredMeetings.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
              No hay citas que coincidan con la busqueda.
            </div>
          ) : (
            filteredMeetings.map((meet) => (
              <div
                key={meet.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-brand-500 transition dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                        {meet.time}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {meet.date}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {meet.status}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {meet.provider}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white pt-1">
                      {meet.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <User className="size-3.5 text-gray-400" />
                      <span className="font-semibold">{meet.leadName}</span>
                      <span>de</span>
                      <span className="font-medium text-brand-600 dark:text-brand-400">
                        {meet.company}
                      </span>
                    </div>
                  </div>

                  {meet.dealValue && (
                    <div className="text-right shrink-0">
                      <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                        Valor Deal
                      </span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {meet.dealValue}
                      </p>
                    </div>
                  )}
                </div>

                {meet.notes && (
                  <p className="mt-2.5 rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Objetivo: </span>
                    {meet.notes}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <a
                      href={meet.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Video className="size-3.5" />
                      <span>Unirse a Reunion</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(meet.meetingLink);
                        showToast("Enlace de reunion copiado al portapapeles");
                      }}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition flex items-center gap-1"
                    >
                      <LinkIcon className="size-3" />
                      <span>Copiar Enlace</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/inbox"
                      className="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1 dark:text-brand-400"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Abrir Chat en Inbox</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Columna Derecha: Panel de Configuración y Enlace de Agendamiento Rápido */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase mb-2">
              Tu Enlace de Agendamiento
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Comparte este enlace directamente en LinkedIn o insertalo en los flujos automatizados para que los leads elijan su horario.
            </p>

            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-2.5 dark:border-brand-900 dark:bg-brand-950/20 mb-3">
              <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 block mb-0.5">
                Cal.com / InHubFlow SDR
              </span>
              <p className="font-mono text-xs text-gray-800 dark:text-gray-200 truncate">
                https://cal.inhubflow.com/sdr-meeting
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText("https://cal.inhubflow.com/sdr-meeting");
                showToast("Enlace https://cal.inhubflow.com/sdr-meeting copiado");
              }}
              className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <LinkIcon className="size-3.5" />
              <span>Copiar Enlace de Agenda</span>
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase mb-2">
              Protocolo de Asistencia (Show-Up)
            </h4>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Envio de invitacion automatica por Google Calendar con enlace Meet.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Recordatorio por mensaje privado de LinkedIn 2 horas antes de la llamada.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Actualizacion automatica a etapa "Reunion Agendada" en el Kanban.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal para Agendar Cita Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Agendar Reunion Comercial
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3.5 pt-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Nombre del Prospecto:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Valeria Rios"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Empresa:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. InnovaCorp"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Titulo de la Sesion:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Fecha:
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Horario:
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Proveedor:
                  </label>
                  <select
                    value={newProvider}
                    onChange={(e) =>
                      setNewProvider(e.target.value as "Google Calendar" | "Outlook" | "Cal.com")
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Google Calendar">Google Calendar</option>
                    <option value="Cal.com">Cal.com</option>
                    <option value="Outlook">Outlook</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Valor Estimado Deal:
                  </label>
                  <input
                    type="text"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Enlace Videollamada (Meet / Zoom / Teams):
                </label>
                <input
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Notas / Objetivo:
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el caso de uso del prospecto..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition"
                >
                  Confirmar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
