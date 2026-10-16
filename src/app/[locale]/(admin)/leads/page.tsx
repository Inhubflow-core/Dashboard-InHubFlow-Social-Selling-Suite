"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { exportLeadsToCsv, useLeadsStore } from "@/lib/leads/store";
import type { CrmStage, Lead360Item, SequenceStatus } from "@/lib/leads/types";
import { useMemo, useState } from "react";

export default function LeadsPage() {
  const { leads, lists, isLoaded, updateLeadStage, updateLeadSequenceStatus, deleteLead } =
    useLeadsStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedListFilter, setSelectedListFilter] = useState<string>("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<Lead360Item | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesList = selectedListFilter === "all" || lead.listId === selectedListFilter;
      const matchesStage = selectedStageFilter === "all" || lead.stage === selectedStageFilter;

      return matchesSearch && matchesList && matchesStage;
    });
  }, [leads, searchTerm, selectedListFilter, selectedStageFilter]);

  const getStageLabel = (stage: CrmStage) => {
    switch (stage) {
      case "lead_captured":
        return { label: "1. Lead Captado", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
      case "in_sequence":
        return { label: "2. En Secuencia", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
      case "connected_material_sent":
        return { label: "3. Material Entregado", color: "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300" };
      case "active_conversation":
        return { label: "4. Conversacion Activa", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
      case "meeting_scheduled":
        return { label: "5. Reunion Agendada", color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" };
      case "proposal_presented":
        return { label: "6. Propuesta Presentada", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
      case "closed_won":
        return { label: "7. Ganado (Closed Won)", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
      case "closed_lost":
        return { label: "Perdido (Closed Lost)", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
    }
  };

  const getSequenceBadge = (status: SequenceStatus) => {
    switch (status) {
      case "in_progress":
        return { label: "En Progreso", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
      case "replied":
        return { label: "Respondio DM", color: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" };
      case "completed":
        return { label: "Completado", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
      case "paused":
        return { label: "Pausado", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Directorio de Leads (Ficha 360 del Contacto)" />

      {/* Barra de control y exportación */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Base Central de Prospectos Calificados
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Contactos captados por monitores de señales en LinkedIn con trazabilidad de interacciones y datos de contacto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/leads/lists"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            Ver Listas por Señal ({lists.length})
          </a>
          <button
            type="button"
            onClick={() => exportLeadsToCsv(filteredLeads)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
          >
            Exportar a CSV ({filteredLeads.length})
          </button>
        </div>
      </div>

      {/* Filtros de Búsqueda y Segmentación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, cargo, empresa o ubicacion..."
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <select
            value={selectedListFilter}
            onChange={(e) => setSelectedListFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Todas las Listas de Señales</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Todas las Etapas del Embudo</option>
            <option value="lead_captured">Lead Captado</option>
            <option value="in_sequence">En Secuencia</option>
            <option value="connected_material_sent">Material Entregado</option>
            <option value="active_conversation">Conversacion Activa</option>
            <option value="meeting_scheduled">Reunion Agendada</option>
            <option value="proposal_presented">Propuesta Presentada</option>
            <option value="closed_won">Ganado (Closed Won)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Directorio 360 */}
      <ComponentCard title={`Prospectos Registrados (${filteredLeads.length})`}>
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando prospectos...</p>
        ) : filteredLeads.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">
            No se encontraron contactos que coincidan con la busqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="pb-3">Prospecto</th>
                  <th className="pb-3">Cargo y Empresa</th>
                  <th className="pb-3">Origen de Señal</th>
                  <th className="pb-3">Puntuacion</th>
                  <th className="pb-3">Etapa CRM</th>
                  <th className="pb-3">Estado Secuencia</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs dark:divide-gray-800">
                {filteredLeads.map((lead) => {
                  const stageBadge = getStageLabel(lead.stage);
                  const sequenceBadge = getSequenceBadge(lead.sequenceStatus);

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {lead.firstName[0]}
                            {lead.lastName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {lead.fullName}
                              </h4>
                              {lead.language && (
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${
                                    lead.language === "en"
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                      : lead.language === "pt"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  }`}
                                  title={`Idioma: ${lead.language.toUpperCase()}`}
                                >
                                  {lead.language.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">{lead.location}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4">
                        <p className="text-gray-800 dark:text-gray-200 font-medium">
                          {lead.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {lead.company}
                        </p>
                      </td>

                      <td className="py-4">
                        <span className="rounded bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          {lead.signalSource}
                        </span>
                      </td>

                      <td className="py-4">
                        <span className="font-bold text-xs text-brand-600 dark:text-brand-400">
                          {lead.intentScore}/100
                        </span>
                      </td>

                      <td className="py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stageBadge.color}`}>
                          {stageBadge.label}
                        </span>
                      </td>

                      <td className="py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sequenceBadge.color}`}>
                          {sequenceBadge.label}
                        </span>
                      </td>

                      <td className="py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadFor360(lead)}
                          className="rounded-md border border-brand-500 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20"
                        >
                          Ficha 360
                        </button>
                        <a
                          href="/inbox"
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          Chat
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>

      {/* Modal Interactivo: Ficha 360 del Contacto */}
      {selectedLeadFor360 && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-5">
            {/* Cabecera de la Ficha 360 */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedLeadFor360.firstName[0]}
                  {selectedLeadFor360.lastName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {selectedLeadFor360.fullName}
                    </h3>
                    {selectedLeadFor360.language && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                          selectedLeadFor360.language === "en"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                            : selectedLeadFor360.language === "pt"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                        title={`Idioma detectado: ${selectedLeadFor360.language.toUpperCase()}`}
                      >
                        {selectedLeadFor360.language.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedLeadFor360.title} en {selectedLeadFor360.company} • {selectedLeadFor360.location}
                  </p>
                  <a
                    href={selectedLeadFor360.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Ver Perfil en LinkedIn &rarr;
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadFor360(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
              >
                Cerrar
              </button>
            </div>

            {/* Datos de Contacto y Estado Rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Email Corporativo</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedLeadFor360.email || "No disponible"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Telefono</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedLeadFor360.phone || "No disponible"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Puntuacion de Intencion</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {selectedLeadFor360.intentScore} / 100
                </span>
              </div>
            </div>

            {/* Configuración Rápida de Etapa y Secuencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-xl dark:border-gray-800">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Etapa en el Pipeline Comercial
                </label>
                <select
                  value={selectedLeadFor360.stage}
                  onChange={(e) => {
                    const nextStage = e.target.value as CrmStage;
                    updateLeadStage(selectedLeadFor360.id, nextStage);
                    setSelectedLeadFor360({
                      ...selectedLeadFor360,
                      stage: nextStage,
                    });
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="lead_captured">1. Lead Captado</option>
                  <option value="in_sequence">2. En Secuencia</option>
                  <option value="connected_material_sent">3. Conectado / Material Entregado</option>
                  <option value="active_conversation">4. Conversacion Activa</option>
                  <option value="meeting_scheduled">5. Reunion Agendada</option>
                  <option value="proposal_presented">6. Propuesta Presentada</option>
                  <option value="closed_won">7. Ganado (Closed Won)</option>
                  <option value="closed_lost">Perdido (Closed Lost)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Estado de la Secuencia
                </label>
                <select
                  value={selectedLeadFor360.sequenceStatus}
                  onChange={(e) => {
                    const nextStatus = e.target.value as SequenceStatus;
                    updateLeadSequenceStatus(selectedLeadFor360.id, nextStatus);
                    setSelectedLeadFor360({
                      ...selectedLeadFor360,
                      sequenceStatus: nextStatus,
                    });
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="in_progress">En Progreso</option>
                  <option value="replied">Respondio (Detenido)</option>
                  <option value="paused">Pausado Manualmente</option>
                  <option value="completed">Completado</option>
                </select>
              </div>
            </div>

            {/* Historial Cronológico de Flujo (Timeline) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3">
                Historial Cronologico del Flujo (Timeline de Automatizacion)
              </h4>
              <div className="space-y-3 border-l-2 border-brand-500/50 pl-4 ml-2">
                {selectedLeadFor360.timeline.map((event) => (
                  <div key={event.id} className="relative space-y-1">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500"></span>
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                        {event.title}
                      </h5>
                      <span className="text-[10px] text-gray-400">{event.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {event.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  deleteLead(selectedLeadFor360.id);
                  setSelectedLeadFor360(null);
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400"
              >
                Eliminar Prospecto
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeadFor360(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cerrar
                </button>
                <a
                  href="/inbox"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
                >
                  Abrir Conversacion en Inbox
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
