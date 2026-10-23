import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LineChartOne from "@/components/charts/line/LineChartOne";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de Control | InHubFlow Social Selling",
  description: "Suite de Social Selling para LinkedIn: generacion de contenido viral, monitoreo de señales y secuencias de prospeccion.",
};

const metrics = [
  {
    title: "Leads Captados (Señales)",
    value: "82",
    change: "+28% vs semana anterior",
    highlight: true,
  },
  {
    title: "Publicaciones en Cola",
    value: "5",
    change: "3 programadas para esta semana",
    highlight: false,
  },
  {
    title: "Secuencias Activas (Workflow)",
    value: "18",
    change: "Pacing humano seguro (InHubFlow)",
    highlight: false,
  },
  {
    title: "Tasa de Respuesta Inbound",
    value: "42.8%",
    change: "+14 pts por Lead Magnets",
    highlight: true,
  },
];

const modules = [
  {
    name: "1. Viral Post Engine",
    desc: "Crea y programa posts de texto, imagenes y carruseles PDF para 1 mes en 5 minutos.",
    link: "/viral-posts/radar",
    action: "Ir a Post Finder",
  },
  {
    name: "2. Signal Radar",
    desc: "Escanea en tiempo real interacciones en tus posts, en los de la competencia y en tendencias de la red.",
    link: "/signals/my-posts",
    action: "Ver Monitores",
  },
  {
    name: "3. Campañas (Workflow)",
    desc: "Constructor interactivo de secuencias en lienzo de nodos con React Flow, delays y condiciones.",
    link: "/campaigns",
    action: "Abrir Canvas",
  },
  {
    name: "4. Leads & CRM",
    desc: "Directorio 360 de contactos captados, listas dinamicas por señal y trazabilidad de interacciones.",
    link: "/leads",
    action: "Ver Directorio",
  },
  {
    name: "5. Inbox Unificado",
    desc: "Buzon comercial libre de ruido con SDR Co-Pilot asistido por IA para agendar reuniones.",
    link: "/inbox",
    action: "Abrir Inbox",
  },
  {
    name: "6. Pipeline CRM",
    desc: "Kanban comercial de 7 etapas y calendario de citas para monitorear el avance hacia el cierre.",
    link: "/pipeline",
    action: "Ver Kanban",
  },
];

export default function SocialSellingDashboard() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Panel de Control | InHubFlow Social Selling" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {m.title}
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span
                className={`text-2xl font-bold ${
                  m.highlight
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {m.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{m.change}</p>
          </div>
        ))}
      </div>

      {/* Grafico de Evolucion y Traccion (Line Chart 1) */}
      <ComponentCard
        title="Line Chart 1"
        desc="Evolucion temporal de interacciones y captacion de leads en LinkedIn."
      >
        <LineChartOne />
      </ComponentCard>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Ecosistema de Modulos de Social Selling
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Arquitectura de Conversion Inbound
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs hover:border-brand-500 transition dark:border-gray-800 dark:bg-gray-900/60"
            >
              <div>
                <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {mod.name}
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {mod.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-800">
                <a
                  href={mod.link}
                  className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  {mod.action} &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
