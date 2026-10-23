"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Key,
  ShieldCheck,
  Copy,
  RefreshCw,
  Check,
  Lock,
  Smartphone,
  Laptop,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SecuritySettingsPage() {
  const { currentUser, isSuperAdmin } = useAuth();
  const isMember = currentUser.role === "member";

  const [apiKey, setApiKey] = useState("ihf_live_sk_948f2a1b8c0e7d6f5a4b3c2d1e0f");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = () => {
    if (confirm("¿Estás seguro de regenerar la API Key? Cualquier integración externa actual dejará de funcionar hasta que se actualice.")) {
      const newKey = `ihf_live_sk_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      setApiKey(newKey);
      setNotice("API Key regenerada exitosamente.");
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="API Keys & Seguridad" />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Claves de API del Workspace */}
      <div className="rounded-lg border -300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 border-b -300 pb-4 dark:border-gray-800">
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
                className="w-full rounded-lg border -300 bg-gray-50 p-2.5 font-mono text-xs text-gray-900 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
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
              onClick={handleCopyKey}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              <span>{copied ? "Copiada" : "Copiar"}</span>
            </button>

            {!isMember && (
              <button
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
      <div className="rounded-lg border -300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 border-b -300 pb-4 dark:border-gray-800">
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
          <div className="rounded-lg border -300 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <span className="text-base font-medium text-gray-800 dark:text-white/90">
              Cifrado AES-256
            </span>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Todas las cookies y tokens de sesión de LinkedIn se cifran en reposo con claves derivadas de alta entropía.
            </p>
          </div>

          <div className="rounded-lg border -300 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <span className="text-base font-medium text-gray-800 dark:text-white/90">
              Rotación Residencial de IPs
            </span>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Cada cuenta de LinkedIn opera a través de proxies residenciales dedicados con User-Agents fijos.
            </p>
          </div>

          <div className="rounded-lg border -300 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
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
      <div className="rounded-lg border -300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Sesiones Activas en el Workspace
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Dispositivos que han iniciado sesión recientemente en tu cuenta.
        </p>

        <div className="mt-4 divide-y -300 dark:divide-gray-800 text-xs">
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
  );
}
