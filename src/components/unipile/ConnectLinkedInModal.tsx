"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Globe,
  Loader2,
  KeyRound,
  Rocket,
  Lightbulb,
} from "lucide-react";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import { addStoredAccount } from "@/lib/unipile/store";
import { useAuth } from "@/context/AuthContext";

interface ConnectLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountConnected: (account: ConnectedLinkedInAccount) => void;
  initialAccount?: ConnectedLinkedInAccount | null;
  initialStep?: 1 | 2;
}

const BLANK_FORM = {
  name: "",
  email: "",
  daily_connection_limit: 20,
  daily_message_limit: 20,
  daily_visit_limit: 20,
  active_hours_start: 9,
  active_hours_end: 18,
  timezone: "Europe/Madrid",
  working_days: "1,2,3,4,5",
};

const TIMEZONES = [
  { value: "Pacific/Midway", label: "UTC−11 — Midway Island" },
  { value: "Pacific/Honolulu", label: "UTC−10 — Hawaii" },
  { value: "America/Anchorage", label: "UTC−9  — Alaska" },
  { value: "America/Los_Angeles", label: "UTC−8  — Pacific Time (US)" },
  { value: "America/Denver", label: "UTC−7  — Mountain Time (US)" },
  { value: "America/Chicago", label: "UTC−6  — Central Time (US)" },
  { value: "America/New_York", label: "UTC−5  — Eastern Time (US)" },
  { value: "America/Caracas", label: "UTC−4  — Caracas, La Paz" },
  { value: "America/Sao_Paulo", label: "UTC−3  — São Paulo, Buenos Aires" },
  { value: "America/Noronha", label: "UTC−2  — Mid-Atlantic" },
  { value: "Atlantic/Azores", label: "UTC−1  — Azores" },
  { value: "UTC", label: "UTC+0  — London (no DST)" },
  { value: "Europe/London", label: "UTC+0/+1 — London (BST)" },
  { value: "Europe/Madrid", label: "UTC+1/+2 — Madrid, París, Berlín" },
  { value: "Europe/Helsinki", label: "UTC+2/+3 — Helsinki, Kyiv, Tallinn" },
  { value: "Europe/Moscow", label: "UTC+3  — Moscow, Istanbul" },
  { value: "Asia/Dubai", label: "UTC+4  — Dubai, Abu Dhabi" },
  { value: "Asia/Karachi", label: "UTC+5  — Karachi, Islamabad" },
  { value: "Asia/Kolkata", label: "UTC+5:30 — India" },
  { value: "Asia/Dhaka", label: "UTC+6  — Dhaka, Almaty" },
  { value: "Asia/Bangkok", label: "UTC+7  — Bangkok, Jakarta, Hanoi" },
  { value: "Asia/Shanghai", label: "UTC+8  — Beijing, Singapore, HK" },
  { value: "Asia/Tokyo", label: "UTC+9  — Tokyo, Seoul" },
  { value: "Australia/Sydney", label: "UTC+10/+11 — Sydney" },
  { value: "Pacific/Auckland", label: "UTC+12/+13 — Auckland" },
];

const WEEKDAYS = [
  { iso: 1, short: "Lun" },
  { iso: 2, short: "Mar" },
  { iso: 3, short: "Mié" },
  { iso: 4, short: "Jue" },
  { iso: 5, short: "Vie" },
  { iso: 6, short: "Sáb" },
  { iso: 7, short: "Dom" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export default function ConnectLinkedInModal({
  isOpen,
  onClose,
  onAccountConnected,
  initialAccount = null,
  initialStep = 1,
}: ConnectLinkedInModalProps) {
  const { currentUser } = useAuth();

  // Paso del slider: 1 = Configuración de límites y horario, 2 = Autenticación y opciones avanzadas
  const [modalStep, setModalStep] = useState<1 | 2>(initialStep);

  // Formulario del Paso 1
  const [form, setForm] = useState(BLANK_FORM);

  // Formulario del Paso 2 (Autenticación Nativa)
  const [authMode, setAuthMode] = useState<"credentials" | "cookie">("credentials");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authCookieLiAt, setAuthCookieLiAt] = useState("");
  const [authCookieLiA, setAuthCookieLiA] = useState("");
  const [authCountry, setAuthCountry] = useState(""); // "" = Automático (Según tu IP)
  const [authCustomProxy, setAuthCustomProxy] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Estados de Verificación en Dos Pasos (2FA / Checkpoint)
  const [isCheckpoint, setIsCheckpoint] = useState(false);
  const [checkpointCode, setCheckpointCode] = useState("");
  const [checkpointRemoteAccountId, setCheckpointRemoteAccountId] = useState<string | null>(null);
  const [checkpointLoading, setCheckpointLoading] = useState(false);

  // Modal final de recomendación y éxito estilo B2B
  const [showSuccessAdviceModal, setShowSuccessAdviceModal] = useState(false);
  const [connectedAccountResult, setConnectedAccountResult] = useState<ConnectedLinkedInAccount | null>(null);

  // Inicializar o resetear datos cuando cambia isOpen o initialAccount
  useEffect(() => {
    if (isOpen) {
      if (initialAccount) {
        setForm({
          name: initialAccount.name || "",
          email: initialAccount.email || "",
          daily_connection_limit: Math.min(20, initialAccount.daily_connection_limit ?? 20),
          daily_message_limit: Math.min(20, initialAccount.daily_message_limit ?? 20),
          daily_visit_limit: Math.min(20, initialAccount.daily_visit_limit ?? 20),
          active_hours_start: initialAccount.active_hours_start ?? 9,
          active_hours_end: initialAccount.active_hours_end ?? 18,
          timezone: initialAccount.timezone ?? "Europe/Madrid",
          working_days: initialAccount.working_days ?? "1,2,3,4,5",
        });
        setAuthEmail(initialAccount.email || "");
        setModalStep(initialStep || 2);
        if (initialAccount.status === "CHECKPOINT") {
          setIsCheckpoint(true);
          setCheckpointRemoteAccountId(initialAccount.unipileAccountId);
        } else {
          setIsCheckpoint(false);
        }
      } else {
        setForm(BLANK_FORM);
        setAuthEmail("");
        setModalStep(1);
        setIsCheckpoint(false);
      }
      setAuthPassword("");
      setShowAuthPassword(false);
      setAuthCookieLiAt("");
      setAuthCookieLiA("");
      setAuthCountry(""); // Por defecto siempre Automático (Según tu IP)
      setAuthCustomProxy("");
      setAuthError(null);
      setCheckpointCode("");
      setShowSuccessAdviceModal(false);
      setConnectedAccountResult(null);
    }
  }, [isOpen, initialAccount, initialStep]);

  if (!isOpen) return null;

  // Manejo de avance de Paso 1 al Paso 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setAuthError("Por favor ingresa un nombre para mostrar y un correo electrónico válido.");
      return;
    }

    if (form.active_hours_start >= form.active_hours_end) {
      setAuthError("La hora de inicio debe ser anterior a la de fin en el horario de prospección.");
      return;
    }

    setAuthError(null);
    if (!authEmail.trim()) {
      setAuthEmail(form.email.trim());
    }
    setModalStep(2);
  };

  // Manejo de autenticación nativa en Paso 2
  const handleNativeLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === "cookie") {
      if (!authCookieLiAt.trim()) {
        setAuthError("Por favor ingresa el valor de la cookie li_at de LinkedIn.");
        return;
      }
    } else {
      if (!authEmail.trim() || !authPassword) {
        setAuthError("Por favor ingresa tu correo y contraseña de LinkedIn.");
        return;
      }
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/unipile/auth-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: authMode,
          accountId: initialAccount?.id || undefined,
          reconnectAccountId: initialAccount?.unipileAccountId || undefined,
          name: form.name.trim() || undefined,
          username: authEmail.trim(),
          password: authPassword,
          accessToken: authCookieLiAt.trim(),
          premiumToken: authCookieLiA.trim() || undefined,
          country: authCountry || undefined,
          proxy: authCustomProxy.trim() || undefined,
        }),
      });

      const data = await res.json();
      setAuthLoading(false);

      if (!res.ok) {
        setAuthError(data.error || "No se pudo autenticar con LinkedIn.");
        return;
      }

      // LinkedIn solicita 2FA (Checkpoint)
      if (data.checkpoint) {
        setIsCheckpoint(true);
        setCheckpointRemoteAccountId(data.remoteAccountId);
        setAuthError(null);
        return;
      }

      // Conexión exitosa directa
      finalizeConnection(data.remoteAccountId);
    } catch (err: unknown) {
      setAuthLoading(false);
      setAuthError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    }
  };

  // Manejo de resolución de 2FA
  const handleSolveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointRemoteAccountId || !checkpointCode.trim()) {
      setAuthError("Por favor ingresa el código de verificación recibido.");
      return;
    }

    setCheckpointLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/unipile/solve-checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remoteAccountId: checkpointRemoteAccountId,
          code: checkpointCode.trim(),
        }),
      });

      const data = await res.json();
      setCheckpointLoading(false);

      if (!res.ok) {
        setAuthError(data.error || "Código incorrecto o expirado al validar con LinkedIn.");
        return;
      }

      // Verificación exitosa
      finalizeConnection(data.remoteAccountId || checkpointRemoteAccountId);
    } catch (err: unknown) {
      setCheckpointLoading(false);
      setAuthError(err instanceof Error ? err.message : "Error al verificar código con LinkedIn.");
    }
  };

  // Finalizar conexión, guardar en store y desplegar modal de recomendación estilo B2B
  const finalizeConnection = (remoteAccountId: string) => {
    const finalAccount: ConnectedLinkedInAccount = {
      id: initialAccount?.id || `acc-li-${remoteAccountId || Date.now()}`,
      unipileAccountId: remoteAccountId || `up_acc_${Date.now()}`,
      name: form.name.trim() || initialAccount?.name || authEmail.split("@")[0] || "Cuenta LinkedIn",
      email: form.email.trim() || initialAccount?.email || authEmail.trim(),
      headline: initialAccount?.headline || "Perfil sincronizado con InHubFlow LinkedIn Cloud",
      profilePictureUrl: initialAccount?.profilePictureUrl || "/images/user/owner.png",
      publicProfileUrl: initialAccount?.publicProfileUrl,
      status: "OK",
      authMode: authMode,
      connectedAt: initialAccount?.connectedAt || new Date().toISOString(),
      lastSyncAt: "Recién conectado",
      ownerId: initialAccount?.ownerId || currentUser?.id,
      assignedUserId: initialAccount?.assignedUserId ?? currentUser?.id,
      assignedUserName: initialAccount?.assignedUserName ?? currentUser?.name ?? "Administrador",
      dailyActionsCount: initialAccount?.dailyActionsCount || {
        invitationsSent: 0,
        messagesSent: 0,
        profilesVisited: 0,
      },
      daily_connection_limit: form.daily_connection_limit,
      daily_message_limit: form.daily_message_limit,
      daily_visit_limit: form.daily_visit_limit,
      active_hours_start: form.active_hours_start,
      active_hours_end: form.active_hours_end,
      timezone: form.timezone,
      working_days: form.working_days,
    };

    addStoredAccount(finalAccount);
    onAccountConnected(finalAccount);
    setConnectedAccountResult(finalAccount);
    setShowSuccessAdviceModal(true);
  };

  const handleFinishAll = () => {
    setShowSuccessAdviceModal(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="relative w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 overflow-hidden my-8">
          {/* Header Superior Común Idéntico a B2B */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              {modalStep === 2 && !initialAccount ? (
                <button
                  type="button"
                  onClick={() => {
                    setModalStep(1);
                    setAuthError(null);
                  }}
                  className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Volver al Paso 1"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center font-bold text-lg select-none">
                  in
                </div>
              )}
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white leading-snug">
                  {modalStep === 1
                    ? (initialAccount ? "Editar Cuenta de LinkedIn" : "Configurar Cuenta de LinkedIn")
                    : isCheckpoint
                    ? "Verificación de Dos Pasos (2FA)"
                    : "Conectar Cuenta de LinkedIn"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {modalStep === 1
                    ? "Paso 1 de 2: Parámetros y límites de prospección"
                    : isCheckpoint
                    ? "Ingresa el código de 6 dígitos enviado por LinkedIn"
                    : "Paso 2 de 2: Autenticación y opciones avanzadas"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Slider Container con transición horizontal de 2 pasos */}
          <div className="relative overflow-hidden w-full">
            <div
              className="flex w-[200%] transition-transform duration-500 ease-in-out"
              style={{ transform: modalStep === 1 ? "translateX(0%)" : "translateX(-50%)" }}
            >
              {/* ─── SLIDE 1: Formulario de Configuración y Límites ─── */}
              <div className="w-1/2 shrink-0 flex flex-col justify-between">
                <form onSubmit={handleProceedToStep2}>
                  <div className="max-h-[500px] overflow-y-auto px-6 py-4 flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                        Nombre para mostrar
                      </label>
                      <input
                        type="text"
                        className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder="Ej. Roberto Orse LinkedIn"
                        value={form.name}
                        onChange={(e) => {
                          setForm({ ...form, name: e.target.value });
                          setAuthError(null);
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                        Correo de LinkedIn
                      </label>
                      <input
                        type="email"
                        className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder="tu-correo@linkedin.com"
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          setAuthError(null);
                        }}
                        required
                      />
                    </div>

                    {/* 3 Columnas de Límites Diarios (Máximo de seguridad 20) */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                          Conexiones/día
                        </label>
                        <input
                          type="number"
                          className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          value={form.daily_connection_limit}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm({ ...form, daily_connection_limit: Math.min(20, Math.max(1, val)) });
                          }}
                          min={1}
                          max={20}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                          Mensajes/día
                        </label>
                        <input
                          type="number"
                          className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          value={form.daily_message_limit}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm({ ...form, daily_message_limit: Math.min(20, Math.max(1, val)) });
                          }}
                          min={1}
                          max={20}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                          Visitas/día
                        </label>
                        <input
                          type="number"
                          className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          value={form.daily_visit_limit}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm({ ...form, daily_visit_limit: Math.min(20, Math.max(0, val)) });
                          }}
                          min={0}
                          max={20}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 leading-snug">
                      🔒 Límite de seguridad recomendado: Máximo 20 acciones/día para proteger tu perfil de LinkedIn.
                    </p>

                    {/* Sección Horario de Prospección */}
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex flex-col gap-3">
                      <p className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                        Horario de Prospección
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                            Inicio
                          </label>
                          <select
                            className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                            value={form.active_hours_start}
                            onChange={(e) => setForm({ ...form, active_hours_start: Number(e.target.value) })}
                          >
                            {HOURS.map((h) => (
                              <option key={h} value={h}>
                                {fmtHour(h)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                            Fin
                          </label>
                          <select
                            className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                            value={form.active_hours_end}
                            onChange={(e) => setForm({ ...form, active_hours_end: Number(e.target.value) })}
                          >
                            {HOURS.map((h) => (
                              <option key={h} value={h}>
                                {fmtHour(h)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {form.active_hours_start >= form.active_hours_end ? (
                        <p className="text-xs text-red-500 font-medium">
                          La hora de inicio debe ser anterior a la de fin
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {fmtHour(form.active_hours_start)} – {fmtHour(form.active_hours_end)} (
                          {form.active_hours_end - form.active_hours_start}h activas)
                        </p>
                      )}

                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                          Zona Horaria
                        </label>
                        <select
                          className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                          value={form.timezone}
                          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                          Días Laborales
                        </label>
                        <div className="flex gap-1.5">
                          {WEEKDAYS.map((day) => {
                            const active = form.working_days.split(",").includes(String(day.iso));
                            return (
                              <button
                                key={day.iso}
                                type="button"
                                onClick={() => {
                                  const current = form.working_days.split(",").filter(Boolean);
                                  const next = active
                                    ? current.filter((d) => d !== String(day.iso))
                                    : [...current, String(day.iso)];
                                  if (next.length > 0) {
                                    setForm({ ...form, working_days: next.sort().join(",") });
                                  }
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                  active
                                    ? "bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
                                    : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400"
                                }`}
                              >
                                {day.short}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {authError && (
                      <p className="text-xs text-red-500 font-medium">{authError}</p>
                    )}
                  </div>

                  {/* Footer Slide 1 */}
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={onClose}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm cursor-pointer"
                    >
                      <span>Añadir y Conectar</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </form>
              </div>

              {/* ─── SLIDE 2: Autenticación Nativa y Checkpoint 2FA ─── */}
              <div className="w-1/2 shrink-0 flex flex-col justify-between">
                {!isCheckpoint ? (
                  <form onSubmit={handleNativeLogin}>
                    <div className="max-h-[500px] overflow-y-auto px-6 py-4 flex flex-col gap-3">
                      {/* Selector de Método: Credenciales vs Cookies */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                          Método de Conexión
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("credentials");
                              setAuthError(null);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              authMode === "credentials"
                                ? "bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
                                : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400"
                            }`}
                          >
                            Credenciales (Correo y Clave)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("cookie");
                              setAuthError(null);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              authMode === "cookie"
                                ? "bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 font-semibold"
                                : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400"
                            }`}
                          >
                            Cookie de Sesión (li_at)
                          </button>
                        </div>
                      </div>

                      {authMode === "credentials" ? (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                              Correo o teléfono de LinkedIn
                            </label>
                            <input
                              type="text"
                              className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                              placeholder="ejemplo@empresa.com"
                              value={authEmail}
                              onChange={(e) => {
                                setAuthEmail(e.target.value);
                                setAuthError(null);
                              }}
                              disabled={authLoading}
                              required
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                              Contraseña de LinkedIn
                            </label>
                            <div className="relative">
                              <input
                                type={showAuthPassword ? "text" : "password"}
                                className="h-9 w-full pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                placeholder="••••••••••••"
                                value={authPassword}
                                onChange={(e) => {
                                  setAuthPassword(e.target.value);
                                  setAuthError(null);
                                }}
                                disabled={authLoading}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowAuthPassword(!showAuthPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                tabIndex={-1}
                              >
                                {showAuthPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                              Cookie li_at (Obligatoria)
                            </label>
                            <input
                              type="password"
                              className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                              placeholder="AQEDAQ..."
                              value={authCookieLiAt}
                              onChange={(e) => {
                                setAuthCookieLiAt(e.target.value);
                                setAuthError(null);
                              }}
                              disabled={authLoading}
                              required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Copia el valor de la cookie <code>li_at</code> desde la consola o inspector de cookies de tu navegador.
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                              Cookie li_a (Opcional - Sales Navigator / Recruiter)
                            </label>
                            <input
                              type="password"
                              className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                              placeholder="AQEDAQ... (opcional)"
                              value={authCookieLiA}
                              onChange={(e) => setAuthCookieLiA(e.target.value)}
                              disabled={authLoading}
                            />
                          </div>
                        </>
                      )}

                      {/* Opciones Avanzadas: Proxy y País */}
                      <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex flex-col gap-3">
                        <p className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                          Opciones Avanzadas (Proxy y País)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                              País del Proxy
                            </label>
                            <select
                              className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                              value={authCountry}
                              onChange={(e) => setAuthCountry(e.target.value)}
                              disabled={authLoading}
                            >
                              <option value="">Automático (Según tu IP)</option>
                              <option value="BR">Brasil (BR)</option>
                              <option value="ES">España (ES)</option>
                              <option value="US">Estados Unidos (US)</option>
                              <option value="MX">México (MX)</option>
                              <option value="CO">Colombia (CO)</option>
                              <option value="AR">Argentina (AR)</option>
                              <option value="CL">Chile (CL)</option>
                              <option value="PE">Perú (PE)</option>
                              <option value="GB">Reino Unido (GB)</option>
                              <option value="FR">Francia (FR)</option>
                              <option value="DE">Alemania (DE)</option>
                              <option value="IT">Italia (IT)</option>
                              <option value="PT">Portugal (PT)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 pb-1 block">
                              Proxy Personalizado (Opcional)
                            </label>
                            <input
                              type="text"
                              className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                              placeholder="host:port:user:pass"
                              value={authCustomProxy}
                              onChange={(e) => setAuthCustomProxy(e.target.value)}
                              disabled={authLoading}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 leading-snug">
                          Si no defines un proxy propio, se asignará automáticamente un proxy de alta reputación según el país seleccionado.
                        </p>
                      </div>

                      {authError && (
                        <p className="text-xs text-red-500 font-medium">{authError}</p>
                      )}
                    </div>

                    {/* Footer Slide 2 */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                      <button
                        type="button"
                        onClick={() => {
                          setModalStep(1);
                          setAuthError(null);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        disabled={authLoading}
                      >
                        Volver
                      </button>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {authLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Conectando...</span>
                          </>
                        ) : (
                          <>
                            <span>Conectar Cuenta</span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  // ── Sub-vista 2FA Checkpoint ──
                  <form onSubmit={handleSolveCheckpoint}>
                    <div className="max-h-[500px] overflow-y-auto px-6 py-6 flex flex-col gap-4">
                      <div>
                        <label className="text-sm font-bold text-gray-900 dark:text-white pb-1 block">
                          Verificación de Dos Pasos (2FA)
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          LinkedIn ha solicitado verificar tu identidad. Ingresa el código recibido por SMS o en tu aplicación autenticadora.
                        </p>
                      </div>

                      <div>
                        <input
                          type="text"
                          className="h-12 w-full text-center text-xl font-mono font-bold tracking-widest rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          placeholder="123456"
                          value={checkpointCode}
                          onChange={(e) => {
                            setCheckpointCode(e.target.value);
                            setAuthError(null);
                          }}
                          disabled={checkpointLoading}
                          autoFocus
                          required
                        />
                      </div>

                      {authError && (
                        <p className="text-xs text-red-500 font-medium">{authError}</p>
                      )}

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCheckpoint(false);
                            setAuthError(null);
                            setCheckpointCode("");
                          }}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                          disabled={checkpointLoading}
                        >
                          ← Volver a ingresar datos
                        </button>
                      </div>
                    </div>

                    {/* Footer 2FA */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        disabled={checkpointLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={checkpointLoading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {checkpointLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Verificando...</span>
                          </>
                        ) : (
                          <>
                            <span>Verificar y Conectar</span>
                            <Check className="size-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Elegante de Recomendación para Estabilidad (Idéntico a B2B) ── */}
      {showSuccessAdviceModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-4 text-3xl">
              🚀
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              ¡Cuenta Conectada con Éxito!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Tu espacio de trabajo ya está sincronizado con LinkedIn y listo para ejecutar campañas de Social Selling.
            </p>

            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">💡</span>
                <div>
                  <h4 className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">
                    Buenas Prácticas de Automatización
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
                    Tus acciones se ejecutarán de forma inteligente en segundo plano. Para proyectar un comportamiento humano y seguro ante LinkedIn, te sugerimos no realizar envíos masivos manuales mientras las secuencias automáticas estén trabajando.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishAll}
              className="w-full py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg shadow-lg shadow-brand-500/25 transition-all duration-200 cursor-pointer"
            >
              Entendido, ¡a interactuar!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
