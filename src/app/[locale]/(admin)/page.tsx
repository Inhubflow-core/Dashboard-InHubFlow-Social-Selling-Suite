import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LineChartOne from "@/components/charts/line/LineChartOne";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Panel de Control | InHubFlow Social Selling",
  description: "Suite de Social Selling para LinkedIn: generacion de contenido viral, monitoreo de señales y secuencias de prospeccion.",
};

export default async function SocialSellingDashboard() {
  const t = await getTranslations("dashboard");

  const metrics = [
    {
      title: t("metrics.leadsCaptured"),
      value: "82",
      change: t("metrics.leadsCapturedChange"),
      highlight: true,
    },
    {
      title: t("metrics.queuedPosts"),
      value: "5",
      change: t("metrics.queuedPostsChange"),
      highlight: false,
    },
    {
      title: t("metrics.activeSequences"),
      value: "18",
      change: t("metrics.activeSequencesChange"),
      highlight: false,
    },
    {
      title: t("metrics.responseRate"),
      value: "42.8%",
      change: t("metrics.responseRateChange"),
      highlight: true,
    },
  ];

  const modules = [
    {
      name: t("modules.viralPostsName"),
      desc: t("modules.viralPostsDesc"),
      link: "/viral-posts/radar",
      action: t("modules.viralPostsAction"),
    },
    {
      name: t("modules.signalsName"),
      desc: t("modules.signalsDesc"),
      link: "/signals/my-posts",
      action: t("modules.signalsAction"),
    },
    {
      name: t("modules.campaignsName"),
      desc: t("modules.campaignsDesc"),
      link: "/campaigns",
      action: t("modules.campaignsAction"),
    },
    {
      name: t("modules.leadsName"),
      desc: t("modules.leadsDesc"),
      link: "/leads",
      action: t("modules.leadsAction"),
    },
    {
      name: t("modules.inboxName"),
      desc: t("modules.inboxDesc"),
      link: "/inbox",
      action: t("modules.inboxAction"),
    },
    {
      name: t("modules.pipelineName"),
      desc: t("modules.pipelineDesc"),
      link: "/pipeline",
      action: t("modules.pipelineAction"),
    },
  ];

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle={t("pageTitle")} />

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
        title={t("chartTitle")}
        desc={t("chartDesc")}
      >
        <LineChartOne />
      </ComponentCard>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {t("ecosystemTitle")}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t("ecosystemSubtitle")}
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
