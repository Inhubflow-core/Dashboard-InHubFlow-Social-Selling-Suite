"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Building2,
  Mail,
  Clock,
  Calendar,
  Webhook,
  Save,
  CheckCircle2,
  Globe,
  Bell,
  Shield,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function WorkspaceSettingsPage() {
  const { currentUser, isSuperAdmin, isClientAdmin } = useAuth();
  const isMember = currentUser.role === "member";

  const [companyName, setCompanyName] = useState("InHubFlow Workspace");
  const [billingEmail, setBillingEmail] = useState(currentUser.email || "");
  const [timezone, setTimezone] = useState("America/Santiago");
  const [workingStart, setWorkingStart] = useState("09:00");
  const [workingEnd, setWorkingEnd] = useState("18:00");
  const [workingDays, setWorkingDays] = useState(["1", "2", "3", "4", "5"]); // Mon-Fri
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.zapier.com/hooks/catch/12345/abcde");
  const [notifyOnReply, setNotifyOnReply] = useState(true);
  const [notifyOnMeeting, setNotifyOnMeeting] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.companyName) {
      setCompanyName(currentUser.companyName);
    }
  }, [currentUser]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("Configuración del espacio de trabajo guardada exitosamente.");
    setTimeout(() => setNotice(null), 3500);
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Configuración del Workspace" />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identidad de la Empresa */}
        <div className="rounded-lg border -300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b -300 pb-4 dark:border-gray-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Datos de la Organización (Tenant)
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Información general de tu empresa visible en reportes, campañas y firmas del equipo.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nombre de la Empresa / Agencia
              </label>
              <input
                type="text"
                required
                disabled={isMember}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border -300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Correo Electrónico de Notificaciones & Facturación
              </label>
              <input
                type="email"
                required
                disabled={isMember}
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border -300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Zona Horaria y Horario Laboral */}
        <div className="rounded-lg border -300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b -300 pb-4 dark:border-gray-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <Clock className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Ventana de Actividad Comercial (Pacing)
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Define las horas y días en que las secuencias de LinkedIn pueden enviar mensajes para garantizar un comportamiento humano y seguro.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Zona Horaria del Equipo
              </label>
              <select
                disabled={isMember}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 w-full rounded-lg border -300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="America/Santiago">Santiago, Chile (GMT-3)</option>
                <option value="America/Bogota">Bogotá / Lima (GMT-5)</option>
                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                <option value="Europe/Madrid">Madrid, España (GMT+1)</option>
                <option value="America/New_York">Nueva York (GMT-4)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Hora de Inicio de Envíos
              </label>
              <input
                type="time"
                disabled={isMember}
                value={workingStart}
                onChange={(e) => setWorkingStart(e.target.value)}
                className="mt-1.5 w-full rounded-lg border -300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Hora de Cierre de Envíos
              </label>
              <input
                type="time"
                disabled={isMember}
                value={workingEnd}
                onChange={(e) => setWorkingEnd(e.target.value)}
                className="mt-1.5 w-full rounded-lg border -300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Días de Prospección Habilitados
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { id: "1", label: "Lunes" },
                { id: "2", label: "Martes" },
                { id: "3", label: "Miércoles" },
                { id: "4", label: "Jueves" },
                { id: "5", label: "Viernes" },
                { id: "6", label: "Sábado" },
                { id: "0", label: "Domingo" },
              ].map((day) => {
                const isSelected = workingDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    disabled={isMember}
                    onClick={() => toggleDay(day.id)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-[#0099ff] text-white shadow-xs"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Webhooks de Notificación */}
        <div className="rounded-lg border -300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3 border-b -300 pb-4 dark:border-gray-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Webhook className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Webhooks de Integración Saliente
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Envía eventos en tiempo real a Zapier, Make o tu CRM cuando ocurra una interacción relevante.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                URL del Webhook (POST JSON)
              </label>
              <input
                type="url"
                disabled={isMember}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://tu-servidor.com/webhook"
                className="mt-1.5 w-full rounded-lg border -300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2.5 rounded-lg border -300 p-3 dark:border-gray-800">
                <input
                  type="checkbox"
                  disabled={isMember}
                  checked={notifyOnReply}
                  onChange={(e) => setNotifyOnReply(e.target.checked)}
                  className="size-4 rounded-lg accent-[#0099ff]"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  Disparar webhook cuando un lead responda un mensaje
                </span>
              </label>

              <label className="flex items-center gap-2.5 rounded-lg border -300 p-3 dark:border-gray-800">
                <input
                  type="checkbox"
                  disabled={isMember}
                  checked={notifyOnMeeting}
                  onChange={(e) => setNotifyOnMeeting(e.target.checked)}
                  className="size-4 rounded-lg accent-[#0099ff]"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  Disparar webhook cuando se agende una reunión en el calendario
                </span>
              </label>
            </div>
          </div>
        </div>

        {!isMember && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-5 py-2.5 text-xs font-semibold text-white shadow-theme-xs transition hover:bg-[#0088e6]"
            >
              <Save className="size-4" />
              <span>Guardar Configuración del Workspace</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
