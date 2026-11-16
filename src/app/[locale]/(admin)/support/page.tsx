"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { getStoredAccounts } from "@/lib/unipile/store";
import {
  CheckCircle2,
  AlertTriangle,
  LifeBuoy,
  MessageSquare,
  ShieldCheck,
  Server,
  Send,
  ArrowRight,
} from "lucide-react";

export default function SupportPage() {
  const { currentUser } = useAuth();
  const [unipileOk, setUnipileOk] = useState<boolean | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("linkedin_connection");
  const [details, setDetails] = useState("");
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  useEffect(() => {
    const accounts = getStoredAccounts();
    setConnectedCount(accounts.filter((a) => a.status === "OK").length);

    fetch("/api/unipile/status")
      .then((res) => res.json())
      .then((data) => {
        setUnipileOk(Boolean(data?.configured && !data?.isExpired));
      })
      .catch(() => setUnipileOk(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) return;
    setSubmittedNotice(
      `Ticket registrado para ${currentUser.email || currentUser.name}. Nuestro equipo técnico responderá en menos de 24 horas.`
    );
    setSubject("");
    setDetails("");
    setTimeout(() => setSubmittedNotice(null), 5000);
  };

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="Centro de Soporte & Diagnóstico" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-300 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <Server className="size-5 text-[#0099ff]" />
            <div>
              <p className="text-xs font-medium text-gray-500">Estado LinkedIn Cloud (Unipile)</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                {unipileOk === null
                  ? "Verificando..."
                  : unipileOk
                    ? "Conectado y Operativo"
                    : "Requiere revisión de credenciales"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            {connectedCount > 0 ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="size-5 text-amber-500" />
            )}
            <div>
              <p className="text-xs font-medium text-gray-500">Cuentas LinkedIn Activas</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                {connectedCount} {connectedCount === 1 ? "cuenta activa" : "cuentas activas"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-500" />
            <div>
              <p className="text-xs font-medium text-gray-500">Plan del Workspace</p>
              <p className="mt-0.5 text-sm font-bold uppercase text-gray-900 dark:text-white">
                {currentUser.planTier} ({currentUser.slotsLimit} slots)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-7">
          <div className="mb-4 flex items-center gap-2.5 border-b border-gray-200 pb-4 dark:border-gray-800">
            <LifeBuoy className="size-5 text-[#0099ff]" />
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Enviar Solicitud de Soporte
              </h2>
              <p className="text-xs text-gray-500">
                Adjunta los detalles de tu caso para asistencia directa.
              </p>
            </div>
          </div>

          {submittedNotice && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{submittedNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-xs text-gray-900 focus:border-[#0099ff] focus:outline-hidden dark:border-gray-700 dark:text-white"
              >
                <option value="linkedin_connection">Conexión de Cuenta LinkedIn / Cookie</option>
                <option value="campaigns_pacing">Secuencias y Límites de Pacing</option>
                <option value="sdr_ai">Agente SDR IA / Reglas de Respuesta</option>
                <option value="billing_slots">Planes, Facturación y Slots</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Asunto
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Error al sincronizar cuenta de LinkedIn"
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-xs text-gray-900 focus:border-[#0099ff] focus:outline-hidden dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Descripción
              </label>
              <textarea
                rows={4}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe qué estabas intentando hacer y qué resultado obtuviste..."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-xs text-gray-900 focus:border-[#0099ff] focus:outline-hidden dark:border-gray-700 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0088e6]"
            >
              <Send className="size-3.5" />
              <span>Enviar Ticket de Soporte</span>
            </button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Accesos Rápidos de Diagnóstico
            </h3>
            <div className="mt-4 space-y-2.5 text-xs">
              <Link
                href="/linkedin-accounts"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:border-[#0099ff] dark:border-gray-800"
              >
                <span>Verificar o reconectar cuentas de LinkedIn</span>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>
              <Link
                href="/settings?tab=api-security"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:border-[#0099ff] dark:border-gray-800"
              >
                <span>Revisar API Key y estado de Webhooks</span>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>
              <Link
                href="/plans"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition hover:border-[#0099ff] dark:border-gray-800"
              >
                <span>Gestionar Plan y capacidad de Slots</span>
                <ArrowRight className="size-4 text-gray-400" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <MessageSquare className="size-4 text-[#0099ff]" />
              <span>Buenas Prácticas Anti-Bloqueo</span>
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs text-gray-500 dark:text-gray-400">
              <li>Mantén un máximo de 20 invitaciones y 20 DMs diarios por cuenta nueva.</li>
              <li>Configura horarios laborales reales en la zona horaria del perfil.</li>
              <li>Usa el Radar de Señales (Nivel 1–4) antes de lanzar secuencias en frío.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
