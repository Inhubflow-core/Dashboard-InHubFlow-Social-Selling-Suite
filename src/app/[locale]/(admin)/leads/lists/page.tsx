"use client";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useLeadsStore } from "@/lib/leads/store";
import type { LeadListGroup } from "@/lib/leads/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function SignalListsPage() {
  const { lists, leads, isLoaded, createList, deleteList } = useLeadsStore();

  const [highlightedListId, setHighlightedListId] = useState<string | null>(null);

  const hasCheckedUrlRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded || hasCheckedUrlRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const lId = params.get("listId");
    const competitorParam = params.get("competitor");
    if (lId || competitorParam) {
      hasCheckedUrlRef.current = true;
      if (lId) setHighlightedListId(lId);
      let found = lists.find((l) => l.id === lId || l.sourceMonitorId === lId);
      if (!found && competitorParam) {
        found = lists.find(
          (l) =>
            (l.competitorName && l.competitorName.toLowerCase() === competitorParam.toLowerCase()) ||
            l.name.toLowerCase().includes(competitorParam.toLowerCase())
        );
      }
      if (found) {
        setHighlightedListId(found.id);
      }
    }
  }, [isLoaded, lists]);

  const handleDeleteList = (list: LeadListGroup) => {
    const count = getRealLeadsCount(list);
    const confirmed = window.confirm(
      `¿Eliminar la lista "${list.name}"?\n\nEsta acción borrará de forma permanente la lista dinámica y los ${count} contactos/leads dentro de ella.`
    );
    if (confirmed) {
      deleteList(list.id);
    }
  };

  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newSignalSource, setNewSignalSource] = useState("Post SISTEMA");
  const [newSignalLevel, setNewSignalLevel] = useState<"level_1" | "level_2" | "level_3">("level_1");
  const [newAssignedCampaign, setNewAssignedCampaign] = useState("Secuencia Lead Magnet Automatizada (Nivel 1)");

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const newList: LeadListGroup = {
      id: `list-${Date.now()}`,
      name: newListName,
      description: newListDesc,
      signalSource: newSignalSource,
      signalLevel: newSignalLevel,
      leadsCount: 0,
      assignedCampaign: newAssignedCampaign,
      createdAt: new Date().toISOString(),
    };

    createList(newList);
    setIsCreatingList(false);
    setNewListName("");
    setNewListDesc("");
  };

  const getRealLeadsCount = (list: LeadListGroup) => {
    const matching = leads.filter(
      (l) =>
        l.listId === list.id ||
        (list.competitorName && (
          l.company?.toLowerCase().includes(list.competitorName.toLowerCase()) ||
          l.signalSource?.toLowerCase().includes(list.competitorName.toLowerCase())
        ))
    );
    return matching.length > 0 ? matching.length : list.leadsCount;
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Listas Dinamicas por Señal" />

      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Segmentos Alimentados por Señales
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cada monitor de señales canaliza automaticamente los perfiles captados hacia su lista correspondiente para iniciar campañas personalizadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/leads"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            Ver Directorio 360
          </a>
          <button
            type="button"
            onClick={() => setIsCreatingList(!isCreatingList)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
          >
            {isCreatingList ? "Cerrar Formulario" : "+ Crear Nueva Lista"}
          </button>
        </div>
      </div>

      {/* Formulario de Creación de Lista */}
      {isCreatingList && (
        <ComponentCard
          title="Crear Nueva Lista Dinamica"
          desc="Define la fuente de señal y la campaña de prospeccion que alimentara esta lista."
        >
          <form onSubmit={handleCreateList} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Nombre de la Lista
                </label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ej. Leads Nivel 1 - Post AUDITORIA"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Campaña Asignada
                </label>
                <input
                  type="text"
                  value={newAssignedCampaign}
                  onChange={(e) => setNewAssignedCampaign(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Fuente de la Señal
                </label>
                <input
                  type="text"
                  value={newSignalSource}
                  onChange={(e) => setNewSignalSource(e.target.value)}
                  placeholder="Ej. Post SISTEMA (Lead Magnet)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Nivel de Intencion
                </label>
                <select
                  value={newSignalLevel}
                  onChange={(e) => setNewSignalLevel(e.target.value as "level_1" | "level_2" | "level_3")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="level_1">Nivel 1: Mis Posts (Lead Magnet)</option>
                  <option value="level_2">Nivel 2: Posts de la Competencia</option>
                  <option value="level_3">Nivel 3: LinkedIn Global</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                Descripcion de la Lista
              </label>
              <textarea
                rows={2}
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder="Descripcion opcional de los prospectos agrupados..."
                className="w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingList(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Guardar Lista
              </button>
            </div>
          </form>
        </ComponentCard>
      )}

      {/* Grid de Listas Dinámicas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!isLoaded ? (
          <p className="text-xs text-gray-400 py-4">Cargando listas...</p>
        ) : (
          lists.map((list) => {
            const count = getRealLeadsCount(list);
            const isHighlighted = highlightedListId === list.id;

            return (
              <div
                key={list.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-theme-xs transition dark:bg-gray-900 ${
                  isHighlighted
                    ? "border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/10 dark:border-brand-400"
                    : "border-gray-200 bg-white hover:border-brand-500/60 dark:border-gray-800"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          list.signalLevel === "level_1"
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
                            : list.signalLevel === "level_2"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {list.signalLevel === "level_1"
                          ? "Nivel 1: Mis Posts"
                          : list.signalLevel === "level_2"
                          ? "Nivel 2: Competencia"
                          : "Nivel 3: Global"}
                      </span>
                      {isHighlighted && (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          Lista Seleccionada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                        {count} Leads
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteList(list)}
                        title="Eliminar lista y todos sus prospectos"
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {list.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {list.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Origen de Señal:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {list.signalSource}
                      </span>
                    </div>
                    {list.competitorName && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Competidor Objetivo:</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                          {list.competitorName}
                        </span>
                      </div>
                    )}
                    {list.keywords && list.keywords.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span className="text-gray-400 text-[11px]">Filtros:</span>
                        {list.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Campaña Asignada:</span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400 truncate max-w-[200px]">
                        {list.assignedCampaign}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                  <Link
                    href={`/leads/lists/${list.id}`}
                    className="flex-1 rounded-lg border border-gray-300 py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 transition"
                  >
                    Ver Prospectos ({count}) &rarr;
                  </Link>
                  <Link
                    href={`/campaigns?listId=${list.id}${list.competitorName ? `&competitor=${encodeURIComponent(list.competitorName)}` : ""}`}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
                  >
                    Lanzar Campaña
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
