"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ExternalLink,
  Key,
  ShieldCheck,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Cookie,
  UserCheck,
} from "lucide-react";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import { addStoredAccount } from "@/lib/unipile/store";

interface ConnectLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountConnected: (account: ConnectedLinkedInAccount) => void;
}

export default function ConnectLinkedInModal({
  isOpen,
  onClose,
  onAccountConnected,
}: ConnectLinkedInModalProps) {
  const [activeTab, setActiveTab] = useState<"hosted" | "native">("hosted");

  // Estados de Hosted Auth
  const [hostedLoading, setHostedLoading] = useState(false);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);

  // Estados de Native Auth
  const [nativeMode, setNativeMode] = useState<"credentials" | "cookie">("credentials");
  const [accountName, setAccountName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cookieLiAt, setCookieLiAt] = useState("");
  const [country, setCountry] = useState("ES");
  const [proxy, setProxy] = useState("");
  const [nativeLoading, setNativeLoading] = useState(false);

  // Checkpoint 2FA
  const [isCheckpoint, setIsCheckpoint] = useState(false);
  const [checkpointAccountId, setCheckpointAccountId] = useState("");
  const [checkpointCode, setCheckpointCode] = useState("");
  const [checkpointLoading, setCheckpointLoading] = useState(false);

  // Errores y notificaciones
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sincronizar la última cuenta conectada desde Unipile
  const syncLatestAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/unipile/accounts");
      const data = await res.json();
      if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
        const latest: ConnectedLinkedInAccount = data.accounts[0];
        addStoredAccount(latest);
        onAccountConnected(latest);
        onClose();
        return true;
      }
    } catch (err) {
      console.error("Error sincronizando cuentas en modal:", err);
    }
    return false;
  }, [onAccountConnected, onClose]);

  // Escuchar mensaje postMessage desde ventana emergente (hosted auth callback)
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "LINKEDIN_AUTH_SUCCESS") {
        setSuccessNotice("¡Cuenta autorizada en LinkedIn con éxito! Sincronizando...");
        await syncLatestAccount();
      } else if (event.data?.type === "LINKEDIN_AUTH_ERROR") {
        setErrorMsg("La conexión con LinkedIn no pudo completarse.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, syncLatestAccount]);

  if (!isOpen) return null;

  // Generar enlace Hosted Auth (Método recomendado)
  const handleGenerateHostedLink = async () => {
    setHostedLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/unipile/hosted-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName.trim() || undefined,
        }),
      });

      const data = await res.json();
      setHostedLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || "No se pudo generar el enlace seguro de Unipile.");
        return;
      }

      setHostedUrl(data.url);

      if (data.url) {
        const popup = window.open(data.url, "_blank", "width=600,height=750");
        setSuccessNotice(
          data.mock
            ? "Enlace simulado abierto. No se ha conectado ninguna cuenta real."
            : "Ventana de conexión abierta. Completa la autorización en LinkedIn; la cuenta se sincronizará automáticamente."
        );

        if (popup) {
          const pollTimer = setInterval(async () => {
            try {
              if (popup.closed) {
                clearInterval(pollTimer);
                await syncLatestAccount();
              }
            } catch {
              clearInterval(pollTimer);
            }
          }, 1500);
        }
      } else {
        setErrorMsg("Unipile no devolvio un enlace de autenticacion valido.");
      }
    } catch (err: unknown) {
      setHostedLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "Error de conexion con el servidor");
    }
  };

  // Conexión Nativa (Credenciales directas o Cookie)
  const handleNativeConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setNativeLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/unipile/auth-native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: nativeMode,
          name: accountName.trim() || undefined,
          username: email.trim(),
          password,
          accessToken: cookieLiAt.trim(),
          country,
          proxy: proxy.trim() || undefined,
        }),
      });

      const data = await res.json();
      setNativeLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || "Error al conectar con LinkedIn.");
        return;
      }

      // LinkedIn pide 2FA (Checkpoint)
      if (data.checkpoint) {
        setIsCheckpoint(true);
        setCheckpointAccountId(data.remoteAccountId);
        setErrorMsg(null);
        return;
      }

      // En demo no se debe presentar una cuenta simulada como conexion real.
      if (data.mock) {
        setSuccessNotice("Autenticacion simulada correctamente. No se ha conectado ninguna cuenta real.");
        setNativeLoading(false);
        return;
      }

      // Conexión exitosa
      const newAcc: ConnectedLinkedInAccount = {
        id: `acc-li-${data.remoteAccountId || Date.now()}`,
        unipileAccountId: data.remoteAccountId || `up_acc_${Date.now()}`,
        name: accountName.trim() || email.split("@")[0] || "Cuenta LinkedIn",
        headline: "Perfil autenticado mediante transporte nativo de Unipile",
        profilePictureUrl: "/images/user/owner.png",
        status: "OK",
        authMode: nativeMode,
        connectedAt: new Date().toISOString(),
        lastSyncAt: "Recien conectado",
        dailyActionsCount: {
          invitationsSent: 0,
          messagesSent: 0,
          profilesVisited: 0,
        },
      };

      addStoredAccount(newAcc);
      onAccountConnected(newAcc);
      onClose();
    } catch (err: unknown) {
      setNativeLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    }
  };

  // Resolver Checkpoint 2FA
  const handleSolveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointCode.trim()) {
      setErrorMsg("Por favor ingresa el codigo de verificacion recibido.");
      return;
    }

    setCheckpointLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/unipile/solve-checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remoteAccountId: checkpointAccountId,
          code: checkpointCode.trim(),
        }),
      });

      const data = await res.json();
      setCheckpointLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || "Codigo invalido o expirado.");
        return;
      }

      const newAcc: ConnectedLinkedInAccount = {
        id: `acc-li-${checkpointAccountId}`,
        unipileAccountId: checkpointAccountId,
        name: accountName.trim() || email.split("@")[0] || "Cuenta LinkedIn Verificada",
        headline: "Perfil autenticado con verificacion 2FA exitosa",
        profilePictureUrl: "/images/user/owner.png",
        status: "OK",
        authMode: nativeMode,
        connectedAt: new Date().toISOString(),
        lastSyncAt: "Recien conectado",
        dailyActionsCount: {
          invitationsSent: 0,
          messagesSent: 0,
          profilesVisited: 0,
        },
      };

      addStoredAccount(newAcc);
      onAccountConnected(newAcc);
      onClose();
    } catch (err: unknown) {
      setCheckpointLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "Error al validar codigo 2FA.");
    }
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900 my-8">
        {/* Boton Cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="size-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Conectar Cuenta de LinkedIn (Unipile)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Transporte oficial y seguro validado para prospeccion y envio de mensajes.
            </p>
          </div>
        </div>

        {/* Mensajes de error o éxito */}
        {errorMsg && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successNotice && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Vista Checkpoint 2FA */}
        {isCheckpoint ? (
          <form onSubmit={handleSolveCheckpoint} className="mt-5 space-y-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 font-semibold text-sm">
                <Lock className="size-4" />
                <span>Verificacion de Dos Pasos Requerida (2FA)</span>
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                LinkedIn envio un codigo de verificacion a tu aplicacion autenticadora, correo electronico o telefono movil. Ingresalo para completar la conexion.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Codigo de Verificacion (6 digitos)
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={checkpointCode}
                onChange={(e) => setCheckpointCode(e.target.value)}
                placeholder="Ej. 123456"
                className="w-full tracking-widest text-center text-lg font-mono rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckpoint(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={checkpointLoading}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {checkpointLoading && <Loader2 className="size-3.5 animate-spin" />}
                Confirmar y Activar Cuenta
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Selector de Pestañas de Autenticación */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setActiveTab("hosted")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                  activeTab === "hosted"
                    ? "bg-white text-brand-600 shadow-xs dark:bg-gray-900 dark:text-brand-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                Hosted Auth (Oficial)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("native")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${
                  activeTab === "native"
                    ? "bg-white text-brand-600 shadow-xs dark:bg-gray-900 dark:text-brand-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <Key className="size-3.5" />
                Conexion Directa (Credenciales)
              </button>
            </div>

            {/* Pestaña 1: Hosted Auth */}
            {activeTab === "hosted" && (
              <div className="space-y-4 pt-1">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                    Metodo Recomendado: Flujo Oficial de Unipile
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Abre una ventana segura gestionada por Unipile donde ingresas tu sesion de LinkedIn. No almacena contraseñas en texto plano y renueva tokens automaticamente.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Etiqueta o Nombre de la Cuenta (Opcional)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ej. Roberto OrSe - Perfil Personal"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {hostedUrl && (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate font-mono">
                      {hostedUrl}
                    </span>
                    <a
                      href={hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-600"
                    >
                      <ExternalLink className="size-3" />
                      Abrir Enlace
                    </a>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateHostedLink}
                    disabled={hostedLoading}
                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {hostedLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="size-3.5" />
                    )}
                    Generar Enlace de Conexion
                  </button>
                </div>
              </div>
            )}

            {/* Pestaña 2: Native Auth (Credenciales o Cookie li_at) */}
            {activeTab === "native" && (
              <form onSubmit={handleNativeConnect} className="space-y-3.5 pt-1">
                {/* Selector de modo nativo */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNativeMode("credentials")}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      nativeMode === "credentials"
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300"
                        : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    Correo y Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => setNativeMode("cookie")}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      nativeMode === "cookie"
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300"
                        : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    <Cookie className="inline size-3 mr-1" />
                    Cookie li_at (Sin contraseña)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre o Titular de la Cuenta
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ej. Roberto OrSe"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {nativeMode === "credentials" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Correo o Telefono de LinkedIn
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu-correo@empresa.com"
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contraseña de LinkedIn
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor de la Cookie li_at de LinkedIn
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={cookieLiAt}
                      onChange={(e) => setCookieLiAt(e.target.value)}
                      placeholder="AQEDATk... (Copia el valor de la cookie li_at desde las herramientas de desarrollador)"
                      className="w-full font-mono text-[11px] rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ubicacion Proxy (Pais)
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="ES">España (ES)</option>
                      <option value="MX">Mexico (MX)</option>
                      <option value="US">Estados Unidos (US)</option>
                      <option value="CO">Colombia (CO)</option>
                      <option value="AR">Argentina (AR)</option>
                      <option value="CL">Chile (CL)</option>
                      <option value="BR">Brasil (BR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Proxy Dedicado (Opcional)
                    </label>
                    <input
                      type="text"
                      value={proxy}
                      onChange={(e) => setProxy(e.target.value)}
                      placeholder="host:port:user:pass"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={nativeLoading}
                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {nativeLoading && <Loader2 className="size-3.5 animate-spin" />}
                    Conectar con Unipile
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
