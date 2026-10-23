"use client";
import { useTranslations } from "next-intl";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Ticket,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  HelpCircle,
  Check,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SupportTicket {
  id: string;
  subject: string;
  category: "technical" | "billing" | "campaigns" | "linkedin";
  priority: "low" | "medium" | "high";
  status: "open" | "in_review" | "resolved";
  createdAt: string;
  lastReply: string;
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "TICK-4091",
    subject: "Consulta sobre asignación de slots para segundo operador",
    category: "campaigns",
    priority: "medium",
    status: "resolved",
    createdAt: "2026-10-07T11:20:00Z",
    lastReply: "El equipo de soporte asignó la cuenta y los permisos quedaron habilitados.",
  },
  {
    id: "TICK-4105",
    subject: "Verificación de latencia de sincronización LinkedIn",
    category: "linkedin",
    priority: "low",
    status: "in_review",
    createdAt: "2026-10-09T08:15:00Z",
    lastReply: "Estamos monitoreando la cola de webhooks de tu cuenta de LinkedIn.",
  },
];

export default function SupportTicketsPage() {
  const t = useTranslations("support");
  const { currentUser, isSuperAdmin } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicket["category"]>("technical");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("medium");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    const newTicket: SupportTicket = {
      id: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: subject.trim(),
      category,
      priority,
      status: "open",
      createdAt: new Date().toISOString(),
      lastReply: "Ticket recibido. Un ingeniero de soporte lo atenderá en breve.",
    };

    setTickets([newTicket, ...tickets]);
    setIsModalOpen(false);
    setSubject("");
    setDescription("");
    setNotice(`Ticket ${newTicket.id} creado con éxito. Notificamos al equipo de soporte.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const getStatusBadge = (status: SupportTicket["status"]) => {
    switch (status) {
      case "open":
        return { label: "Abierto", bg: "bg-blue-500/10 text-blue-600" };
      case "in_review":
        return { label: "En Revisión", bg: "bg-amber-500/10 text-amber-600" };
      case "resolved":
        return { label: "Resuelto", bg: "bg-emerald-500/10 text-emerald-600" };
    }
  };

  const getPriorityBadge = (priority: SupportTicket["priority"]) => {
    switch (priority) {
      case "high":
        return { label: "Alta", color: "text-red-600" };
      case "medium":
        return { label: "Media", color: "text-amber-600" };
      case "low":
        return { label: "Baja", color: "text-gray-500" };
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="Tickets de Soporte Técnico" />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header y Acción en formato estándar de Card */}
      <div className="w-full rounded-lg border border-gray-300 bg-white px-6 py-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Asistencia & Tickets de Soporte
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comunícate directamente con los ingenieros y especialistas de soporte de InHubFlow.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
          >
            <Plus className="size-4" />
            <span>Abrir Nuevo Ticket</span>
          </button>
        </div>
      </div>

      {/* SLAs de Respuesta según Plan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">SLA Starter</span>
          <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            Respuesta &lt; 24 Horas
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Soporte por ticket y correo.</p>
        </div>

        <div className="rounded-lg border border-[#0099ff]/30 bg-[#0099ff]/5 p-4 shadow-theme-xs">
          <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">SLA Growth</span>
          <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            Respuesta &lt; 8 Horas
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Soporte preferente multi-cuenta.</p>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">SLA Business</span>
          <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            Respuesta &lt; 2 Horas
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Canal prioritario 24/7 y asistencia remota.</p>
        </div>
      </div>

      {/* Tabla de Tickets */}
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-300 bg-gray-50/75 text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/50">
            <tr>
              <th className="px-5 py-3">Ticket ID</th>
              <th className="px-5 py-3">Asunto</th>
              <th className="px-5 py-3">Categoría</th>
              <th className="px-5 py-3">Prioridad</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Última Respuesta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
            {tickets.map((t) => {
              const status = getStatusBadge(t.status);
              const priority = getPriorityBadge(t.priority);
              return (
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                  <td className="px-5 py-3.5 font-mono font-semibold text-[#0099ff]">
                    {t.id}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                    {t.subject}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 uppercase">
                    {t.category}
                  </td>
                  <td className={`px-5 py-3.5 font-bold ${priority.color}`}>
                    {priority.label}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3.5 text-gray-500">
                    {t.lastReply}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Ticket */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-gray-300 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Crear Nuevo Ticket de Soporte
            </h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Describe tu consulta o problema con el mayor detalle posible.
            </p>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Asunto del Ticket
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Problema al conectar cuenta de LinkedIn de operador"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupportTicket["category"])}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="technical">Incidencia Técnica</option>
                    <option value="linkedin">Conexión de Cuentas LinkedIn</option>
                    <option value="campaigns">Secuencias & Campañas</option>
                    <option value="billing">Planes & Facturación</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Prioridad
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket["priority"])}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="low">Baja (Consulta general)</option>
                    <option value="medium">Media (Afecta parte del flujo)</option>
                    <option value="high">Alta (Bloqueo total)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Descripción Detallada
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explica qué ocurrió, qué cuenta se vio afectada y los pasos para reproducir..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0088e6]"
                >
                  Enviar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
