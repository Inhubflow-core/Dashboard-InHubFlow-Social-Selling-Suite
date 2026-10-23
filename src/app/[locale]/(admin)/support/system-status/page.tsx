"use client";

import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Cpu,
  Database,
  Radio,
  Layers,
} from "lucide-react";

interface ServiceStatus {
  name: string;
  category: string;
  uptime: string;
  latency: string;
  status: "operational" | "degraded" | "maintenance";
}

const SERVICES: ServiceStatus[] = [
  {
    name: "InHubFlow LinkedIn Cloud Bridge",
    category: "Mensajería & Conexión",
    uptime: "99.98%",
    latency: "142 ms",
    status: "operational",
  },
  {
    name: "Gemini 3.6 Flash LLM Engine",
    category: "Inteligencia Artificial SDR",
    uptime: "99.95%",
    latency: "215 ms",
    status: "operational",
  },
  {
    name: "Signal Radar Scraping Nodes",
    category: "Monitoreo en Tiempo Real",
    uptime: "100.0%",
    latency: "180 ms",
    status: "operational",
  },
  {
    name: "Workflow Sequence Worker",
    category: "Automatización & Delays",
    uptime: "99.99%",
    latency: "95 ms",
    status: "operational",
  },
  {
    name: "Base de Datos Multi-Tenant & RAG",
    category: "Almacenamiento Seguro",
    uptime: "100.0%",
    latency: "18 ms",
    status: "operational",
  },
  {
    name: "Webhooks & Delivery Dispatcher",
    category: "Integraciones Salientes",
    uptime: "99.97%",
    latency: "110 ms",
    status: "operational",
  },
];

export default function SystemStatusPage() {
  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="Estado del Sistema & Infraestructura" />

      {/* Banner Principal de Salud */}
      <div className="flex flex-col gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
              Todos los Sistemas Operando con Normalidad
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              La infraestructura de InHubFlow y los conectores de LinkedIn operan al 100% de disponibilidad.
            </p>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Última verificación: <span className="font-semibold text-gray-700 dark:text-gray-200">Hace 45 segundos</span>
        </div>
      </div>

      {/* Métricas Globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Uptime Últimos 90 Días</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            99.98%
          </div>
          <p className="mt-1 text-xs text-gray-500">Cero interrupciones críticas no planificadas.</p>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Latencia Media de Respuesta</span>
          <div className="mt-2 text-2xl font-bold text-[#0099ff]">
            165 ms
          </div>
          <p className="mt-1 text-xs text-gray-500">Optimizado para flujos en tiempo real.</p>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">Capacidad de Pacing</span>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            100% Protegido
          </div>
          <p className="mt-1 text-xs text-gray-500">Jitter humano y rotación de proxies activos.</p>
        </div>
      </div>

      {/* Listado de Servicios */}
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-300 p-5 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Componentes del Ecosistema InHubFlow
          </h3>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-300 bg-gray-50/75 text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/50">
            <tr>
              <th className="px-5 py-3">Servicio</th>
              <th className="px-5 py-3">Área</th>
              <th className="px-5 py-3">Disponibilidad</th>
              <th className="px-5 py-3">Latencia</th>
              <th className="px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
            {SERVICES.map((srv, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                  {srv.name}
                </td>
                <td className="px-5 py-4 text-gray-500">
                  {srv.category}
                </td>
                <td className="px-5 py-4 font-mono font-medium text-gray-700 dark:text-gray-300">
                  {srv.uptime}
                </td>
                <td className="px-5 py-4 font-mono text-gray-500">
                  {srv.latency}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    OPERATIVO
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
