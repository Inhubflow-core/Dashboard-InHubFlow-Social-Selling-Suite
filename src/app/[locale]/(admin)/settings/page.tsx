"use client";
import { useTranslations } from "next-intl";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Key,
  ShieldCheck,
  Copy,
  RefreshCw,
  Check,
  Lock,
  Smartphone,
  Laptop,
  Eye,
  EyeOff,
  Sliders,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function SettingsContent() {
  const t = useTranslations("settings");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "api-security" ? "api_security" : "workspace";

  const { currentUser, isSuperAdmin, isClientAdmin } = useAuth();
  const isMember = currentUser.role === "member";

  const [activeTab, setActiveTab] = useState<"workspace" | "api_security">(initialTab);

  // Estados de Workspace
  const [companyName, setCompanyName] = useState("InHubFlow Workspace");
  const [billingEmail, setBillingEmail] = useState(currentUser.email || "");
  const [timezone, setTimezone] = useState("America/Santiago");
  const [workingStart, setWorkingStart] = useState("09:00");
  const [workingEnd, setWorkingEnd] = useState("18:00");
  const [workingDays, setWorkingDays] = useState(["1", "2", "3", "4", "5"]); // Mon-Fri
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.zapier.com/hooks/catch/12345/abcde");
  const [notifyOnReply, setNotifyOnReply] = useState(true);
  const [notifyOnMeeting, setNotifyOnMeeting] = useState(true);

  // Estados de API & Seguridad
  const [apiKey, setApiKey] = useState("ihf_live_sk_948f2a1b8c0e7d6f5a4b3c2d1e0f");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.companyName) {
      setCompanyName(currentUser.companyName);
    }
  }, [currentUser]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "api-security") {
      setActiveTab("api_security");
    }
  }, [searchParams]);

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(t("noticeSaved"));
    setTimeout(() => setNotice(null), 3500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = () => {
    if (
      confirm(
        "¿Estás seguro de regenerar la API Key? Cualquier integración externa actual dejará de funcionar hasta que se actualice."
      )
    ) {
      const newKey = `ihf_live_sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      setApiKey(newKey);
      setNotice("API Key regenerada exitosamente.");
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="API y Workspace" />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Selector de Pestañas Unificado: Workspace vs API & Seguridad */}
      <div className="flex border-b border-gray-300 dark:border-gray-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "workspace"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Building2 className="size-4" />
            <span>Configuración del Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("api_security")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "api_security"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Key className="size-4" />
            <span>Claves de API & Seguridad</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: WORKSPACE ── */}
      {activeTab === "workspace" && (
        <form onSubmit={handleSaveWorkspace} className="space-y-6">
          {/* Identidad de la Empresa */}
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 border-b border-gray-300 pb-4 dark:border-gray-800">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {t("orgData")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("orgDataDesc")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("companyName")}
                </label>
                <input
                  type="text"
                  required
                  disabled={isMember}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("billingEmail")}
                </label>
                <input
                  type="email"
                  required
                  disabled={isMember}
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Zona Horaria y Horario Laboral */}
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 border-b border-gray-300 pb-4 dark:border-gray-800">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {t("pacingWindow")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("pacingWindowDesc")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("teamTimezone")}
                </label>
                <select
                  disabled={isMember}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  <option value="America/Santiago">Santiago, Chile (GMT-3)</option>
                  <option value="America/Bogota">Bogotá / Lima (GMT-5)</option>
                  <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
                  <option value="America/Sao_Paulo">São Paulo, Brasil (GMT-3)</option>
                  <option value="Europe/Madrid">Madrid, España (GMT+1)</option>
                  <option value="America/New_York">Nueva York (GMT-4)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("sendStart")}
                </label>
                <input
                  type="time"
                  disabled={isMember}
                  value={workingStart}
                  onChange={(e) => setWorkingStart(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("sendEnd")}
                </label>
                <input
                  type="time"
                  disabled={isMember}
                  value={workingEnd}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("enabledDays")}
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
                          ? "bg-[#0099ff] text-white"
                          : "border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Webhooks & Notificaciones */}
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 border-b border-gray-300 pb-4 dark:border-gray-800">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Webhook className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {t("webhooks")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("webhooksDesc")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("webhookUrl")}
                </label>
                <input
                  type="url"
                  disabled={isMember}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-2.5 font-mono text-xs text-gray-900 focus:outline-hidden disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    disabled={isMember}
                    checked={notifyOnReply}
                    onChange={(e) => setNotifyOnReply(e.target.checked)}
                    className="size-4 rounded-sm border-gray-300 text-[#0099ff] focus:ring-[#0099ff]"
                  />
                  <span>{t("notifyOnReply")}</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    disabled={isMember}
                    checked={notifyOnMeeting}
                    onChange={(e) => setNotifyOnMeeting(e.target.checked)}
                    className="size-4 rounded-sm border-gray-300 text-[#0099ff] focus:ring-[#0099ff]"
                  />
                  <span>{t("notifyOnMeeting")}</span>
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
                <span>{t("saveWorkspaceSettings")}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ── TAB 2: CLAVES DE API & SEGURIDAD ── */}
      {activeTab === "api_security" && (
        <div className="space-y-6">
          {/* Claves de API del Workspace */}
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 border-b border-gray-300 pb-4 dark:border-gray-800">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
                <Key className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  Claves de API de InHubFlow (REST API)
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Utiliza esta clave para autenticar peticiones programáticas a la API de InHubFlow desde tu backend o herramientas de automatización.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                API Secret Key (Producción)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    readOnly
                    value={apiKey}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 font-mono text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  <span>{copied ? "Copiada" : "Copiar"}</span>
                </button>

                {!isMember && (
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-600 transition hover:bg-red-500/20"
                  >
                    <RefreshCw className="size-4" />
                    <span>Regenerar</span>
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400">
                Mantén esta clave confidencial. Otorga acceso total a los prospectos y campañas de tu espacio de trabajo.
              </span>
            </div>
          </div>

          {/* Protocolos de Conexión Cloud LinkedIn */}
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3 border-b border-gray-300 pb-4 dark:border-gray-800">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  Cifrado & Aislamiento de Cuentas de LinkedIn
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Estándares de seguridad aplicados a las credenciales y tokens de sesión.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-lg border border-gray-300 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-base font-medium text-gray-800 dark:text-white/90">
                  Cifrado AES-256
                </span>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Todas las cookies y tokens de sesión de LinkedIn se cifran en reposo con claves derivadas de alta entropía.
                </p>
              </div>

              <div className="rounded-lg border border-gray-300 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-base font-medium text-gray-800 dark:text-white/90">
                  Rotación Residencial de IPs
                </span>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Cada cuenta de LinkedIn opera a través de proxies residenciales dedicados con User-Agents fijos.
                </p>
              </div>

              <div className="rounded-lg border border-gray-300 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-base font-medium text-gray-800 dark:text-white/90">
                  Aislamiento de Sesión
                </span>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  El frontend nunca recibe las credenciales crudas de LinkedIn; solo consulta estados booleanos validados.
                </p>
              </div>
            </div>
          </div>

          {/* Sesiones Activas */}
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Sesiones Activas en el Workspace
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dispositivos que han iniciado sesión recientemente en tu cuenta.
            </p>

            <div className="mt-4 divide-y divide-gray-300 dark:divide-gray-800 text-xs">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Laptop className="size-5 text-[#0099ff]" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Windows PC • Google Chrome (Esta sesión)
                    </div>
                    <div className="text-gray-400">Santiago, Chile • IP: 190.161.42.10</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                  ACTIVA AHORA
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-5 text-gray-400" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Apple iPhone 15 • Safari Mobile
                    </div>
                    <div className="text-gray-400">Santiago, Chile • Hace 4 horas</div>
                  </div>
                </div>
                <span className="text-gray-400">Cerrar sesión</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-gray-500">Cargando configuración...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
