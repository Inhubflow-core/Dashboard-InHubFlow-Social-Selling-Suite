"use client";

import { useState, useEffect } from "react";
import {
  X,
  Sliders,
  ShieldCheck,
  Clock,
  UserCheck,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";

interface ConfigureAccountLimitsModalProps {
  isOpen: boolean;
  account: ConnectedLinkedInAccount | null;
  onClose: () => void;
  onSave: (updated: ConnectedLinkedInAccount) => void;
}

export default function ConfigureAccountLimitsModal({
  isOpen,
  account,
  onClose,
  onSave,
}: ConfigureAccountLimitsModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [connectionLimit, setConnectionLimit] = useState(20);
  const [messageLimit, setMessageLimit] = useState(20);
  const [visitLimit, setVisitLimit] = useState(20);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [workingDays, setWorkingDays] = useState("1,2,3,4,5");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name || "");
      setEmail(account.email || "");
      setConnectionLimit(account.daily_connection_limit ?? 20);
      setMessageLimit(account.daily_message_limit ?? 20);
      setVisitLimit(account.daily_visit_limit ?? 20);
      setStartHour(account.active_hours_start ?? 9);
      setEndHour(account.active_hours_end ?? 18);
      setTimezone(account.timezone || "Europe/Madrid");
      setWorkingDays(account.working_days || "1,2,3,4,5");
      setSavedSuccess(false);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated: ConnectedLinkedInAccount = {
      ...account,
      name: name.trim() || account.name,
      email: email.trim() || account.email,
      daily_connection_limit: Math.min(20, Math.max(1, Number(connectionLimit))),
      daily_message_limit: Math.min(20, Math.max(1, Number(messageLimit))),
      daily_visit_limit: Math.min(50, Math.max(1, Number(visitLimit))),
      active_hours_start: Number(startHour),
      active_hours_end: Number(endHour),
      timezone,
      working_days: workingDays,
    };

    onSave(updated);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-7 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Sliders className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Límites y Seguridad de LinkedIn
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ajustes de pacing humano para {account.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Notificación de recomendación de LinkedIn */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-50/50 p-3.5 text-xs text-blue-800 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300">
          <ShieldCheck className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <span>
            <strong>Algoritmo de Seguridad B2B:</strong> El tope de seguridad recomendado para evitar alertas o bloqueos de LinkedIn es de <strong>máximo 20 solicitudes de conexión</strong> y <strong>20 mensajes directos al día</strong> con intervalos humanos aleatorios.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Identificación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nombre para mostrar
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Correo de LinkedIn
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@linkedin.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Límites Diarios */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40 space-y-3.5">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Límites Diarios de Acciones (Tope Máx. 20)
            </h4>

            {/* Solicitudes de Conexión */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                  <UserCheck className="size-3.5 text-brand-500" />
                  Solicitudes de Conexión / día:
                </span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {connectionLimit} / 20 máx
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={connectionLimit}
                  onChange={(e) => setConnectionLimit(Number(e.target.value))}
                  className="w-full accent-[#0099ff]"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={connectionLimit}
                  onChange={(e) => setConnectionLimit(Math.min(20, Math.max(1, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs font-bold dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            {/* Mensajes Directos */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                  <Send className="size-3.5 text-blue-500" />
                  Mensajes Directos (DMs) / día:
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {messageLimit} / 20 máx
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={messageLimit}
                  onChange={(e) => setMessageLimit(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={messageLimit}
                  onChange={(e) => setMessageLimit(Math.min(20, Math.max(1, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs font-bold dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            {/* Visitas de Perfil */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                  <Eye className="size-3.5 text-indigo-500" />
                  Visitas de Perfil / día:
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {visitLimit} / 20 máx
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={visitLimit}
                  onChange={(e) => setVisitLimit(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={visitLimit}
                  onChange={(e) => setVisitLimit(Math.min(20, Math.max(1, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-xs font-bold dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Horario Comercial */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40 space-y-3">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="size-3.5 text-gray-500" />
              Ventana de Actividad Comercial
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">
                  Hora de inicio
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">
                  Hora de finalización
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Zona horaria
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="Europe/Madrid">Europe/Madrid (CET / GMT+1)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET / GMT+1)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (BRT / GMT-3)</option>
                <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (ART / GMT-3)</option>
                <option value="America/Bogota">America/Bogota (COT / GMT-5)</option>
                <option value="America/Mexico_City">America/Mexico_City (CST / GMT-6)</option>
                <option value="America/New_York">America/New_York (EST / GMT-5)</option>
                <option value="UTC">UTC Universal</option>
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0099ff] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0088e6] disabled:opacity-50 transition"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <span>Guardar Configuración</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
