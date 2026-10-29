"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useDashboardAnalytics } from "@/lib/dashboard/store";
import DashboardMetricsCards from "./DashboardMetricsCards";
import SocialEvolutionChart from "./SocialEvolutionChart";
import MonthlyProspectingTarget from "./MonthlyProspectingTarget";
import PipelineFunnelChart from "./PipelineFunnelChart";
import SignalDistributionChart from "./SignalDistributionChart";

export default function DashboardMainView() {
  const t = useTranslations("dashboard");
  const analytics = useDashboardAnalytics();

  const modules = [
    {
      name: t("modules.viralPostsName"),
      desc: t("modules.viralPostsDesc"),
      link: "/viral-posts/radar",
      action: t("modules.viralPostsAction"),
      tag: `${analytics.overview.queuedPosts} publicaciones listas`,
    },
    {
      name: t("modules.signalsName"),
      desc: t("modules.signalsDesc"),
      link: "/signals/my-posts",
      action: t("modules.signalsAction"),
      tag: `${analytics.signalDistribution.total} señales captadas`,
    },
    {
      name: t("modules.campaignsName"),
      desc: t("modules.campaignsDesc"),
      link: "/campaigns",
      action: t("modules.campaignsAction"),
      tag: `${analytics.overview.activeCampaigns} secuencias activas`,
    },
    {
      name: t("modules.leadsName"),
      desc: t("modules.leadsDesc"),
      link: "/leads",
      action: t("modules.leadsAction"),
      tag: `${analytics.overview.totalLeads} prospectos 360`,
    },
    {
      name: t("modules.inboxName"),
      desc: t("modules.inboxDesc"),
      link: "/inbox",
      action: t("modules.inboxAction"),
      tag: "SDR Co-Pilot activo",
    },
    {
      name: t("modules.pipelineName"),
      desc: t("modules.pipelineDesc"),
      link: "/pipeline",
      action: t("modules.pipelineAction"),
      tag: `${analytics.overview.activeDeals} deals en embudo`,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Encabezado con estado en vivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageBreadcrumb pageTitle={t("pageTitle")} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60"></span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            LinkedIn Cloud Sincronizado
          </span>
        </div>
      </div>

      {/* 1. Métricas Principales de Alto Impacto */}
      <DashboardMetricsCards overview={analytics.overview} />

      {/* 2. Fila Principal de Gráficos: Evolución Multi-KPI + Meta de Prospección */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SocialEvolutionChart
            monthlyData={analytics.evolutionMonthly}
            weeklyData={analytics.evolutionWeekly}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <MonthlyProspectingTarget
            scheduledMeetings={analytics.overview.scheduledMeetings}
            targetMeetings={25}
          />
        </div>
      </div>

      {/* 3. Fila Secundaria de Gráficos: Embudo de Conversión Pipeline + Distribución de Señales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PipelineFunnelChart stages={analytics.funnelStages} />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <SignalDistributionChart distribution={analytics.signalDistribution} />
        </div>
      </div>

      {/* 4. Arquitectura del Ecosistema InHubFlow Social Selling */}
      <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              {t("ecosystemTitle")}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("ecosystemSubtitle")}
            </p>
          </div>
          <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
            6 Módulos Operativos al 100%
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-4 transition hover:border-brand-500 hover:bg-white dark:border-gray-800 dark:bg-gray-800/40 dark:hover:bg-gray-800"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {mod.name}
                  </h4>
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                    {mod.tag}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                  {mod.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                <Link
                  href={mod.link}
                  className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  {mod.action} &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
