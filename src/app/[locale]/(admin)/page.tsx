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
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
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
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
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
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs hover:border-brand-500 transition dark:border-gray-800 dark:bg-gray-900/60"
            >
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {mod.name}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                  {mod.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
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

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <ComponentCard
            title="Monitores de Señales Activos (Radar en Vivo)"
            desc="Deteccion en tiempo real de prospectos con alta intencion de compra en LinkedIn."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/3">
                <div>
                  <span className="text-xs font-bold text-brand-600 uppercase">Nivel 1</span>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">
                    Lead Magnet Post: "Framework SISTEMA"
                  </p>
                  <p className="text-[11px] text-gray-500">
                    28 leads captados | Auto-respuesta y DM con PDF activo
                  </p>
                </div>
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-400">
                  En Linea
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/3">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase">Nivel 2</span>
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">
                    Auditoria de Competencia: Adapta IA
                  </p>
                  <p className="text-[11px] text-gray-500">
                    19 decisores identificados en los ultimos 3 posts
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                  Sincronizado
                </span>
              </div>
            </div>
          </ComponentCard>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <ComponentCard
            title="Pacing & Seguridad LinkedIn"
            desc="Limites de navegacion humana."
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Invitaciones Diarias:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">12 / 25</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-2 rounded-full bg-brand-500 w-[48%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Mensajes Directos (DMs):</span>
                  <span className="font-semibold text-gray-900 dark:text-white">18 / 40</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-2 rounded-full bg-brand-500 w-[45%]"></div>
                </div>
              </div>

              <div className="rounded-xl bg-brand-50 p-3 text-[11px] text-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
                Jitter de seguridad activo: Pausas aleatorias de 3 a 12 minutos entre interacciones consecutivas.
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
