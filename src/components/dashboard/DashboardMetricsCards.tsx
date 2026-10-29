"use client";

import { useTranslations } from "next-intl";
import type { DashboardMetricOverview } from "@/lib/dashboard/types";
import { Link } from "@/i18n/navigation";

interface DashboardMetricsCardsProps {
  overview: DashboardMetricOverview;
}

export default function DashboardMetricsCards({
  overview,
}: DashboardMetricsCardsProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Leads Captados */}
      <Link
        href="/leads"
        className="group block rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      >
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          {t("metrics.leadsCaptured")}
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {overview.totalLeads}
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            +{overview.hotLeads} HOT
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {t("metrics.leadsBreakdown", {
            hot: overview.hotLeads,
            warm: overview.warmLeads,
          })}
        </p>
      </Link>

      {/* 2. Oportunidades Activas */}
      <Link
        href="/pipeline"
        className="group block rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      >
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          {t("metrics.activeDeals")}
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview.activeDeals}
          </span>
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
            8 Etapas
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {t("metrics.activeDealsDesc")}
        </p>
      </Link>

      {/* 3. Reuniones Agendadas */}
      <Link
        href="/pipeline"
        className="group block rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      >
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          {t("metrics.meetingsScheduled")}
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {overview.scheduledMeetings}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            Cal.com
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {t("metrics.meetingsScheduledDesc")}
        </p>
      </Link>

      {/* 4. Clientes Ganados */}
      <Link
        href="/pipeline"
        className="group block rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      >
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          {t("metrics.closedWon")}
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {overview.closedWon}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            Cierres
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {t("metrics.closedWonDesc")}
        </p>
      </Link>

      {/* 5. Tasa de Conversión */}
      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          {t("metrics.conversionRate")}
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
            {overview.conversionRate}%
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            Inbound
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {t("metrics.conversionRateDesc")}
        </p>
      </div>

      {/* 6. Cuentas Conectadas */}
      <Link
        href="/unipile/accounts"
        className="group block rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
      >
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          {t("metrics.connectedAccounts")}
        </span>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview.connectedAccounts}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            Activas OK
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {t("metrics.connectedAccountsDesc")}
        </p>
      </Link>
    </div>
  );
}
