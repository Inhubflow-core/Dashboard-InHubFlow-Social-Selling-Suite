"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useTranslations } from "next-intl";
import type { SignalDistributionData } from "@/lib/dashboard/types";
import { Link } from "@/i18n/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface SignalDistributionChartProps {
  distribution: SignalDistributionData;
}

export default function SignalDistributionChart({
  distribution,
}: SignalDistributionChartProps) {
  const t = useTranslations("dashboard");

  const series = [
    distribution.level1Count,
    distribution.level2Count,
    distribution.level3Count,
  ];

  const labels = [
    t("charts.signalsDistribution.level1"),
    t("charts.signalsDistribution.level2"),
    t("charts.signalsDistribution.level3"),
  ];

  const colors = ["#0099ff", "#8b5cf6", "#f59e0b"];

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 260,
    },
    colors: colors,
    labels: labels,
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "Total Leads",
              fontSize: "12px",
              fontWeight: 500,
              color: "#6B7280",
              formatter: function () {
                return `${distribution.total}`;
              },
            },
            value: {
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
            },
          },
        },
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val) => `${val} leads captados`,
      },
    },
    stroke: {
      width: 2,
      colors: ["#ffffff"],
    },
  };

  const level1Pct = Math.round((distribution.level1Count / (distribution.total || 1)) * 100);
  const level2Pct = Math.round((distribution.level2Count / (distribution.total || 1)) * 100);
  const level3Pct = Math.round((distribution.level3Count / (distribution.total || 1)) * 100);

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            {t("charts.signalsDistribution.title")}
          </h3>
          <Link
            href="/signals/my-posts"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            {t("modules.signalsAction")} &rarr;
          </Link>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("charts.signalsDistribution.desc")}
        </p>
      </div>

      <div className="my-2 flex justify-center">
        <ReactApexChart
          options={options}
          series={series}
          type="donut"
          height={240}
        />
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0099ff]"></span>
            <span className="text-gray-600 dark:text-gray-400">Nivel 1 (Mis Posts)</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="text-gray-900 dark:text-white font-semibold">
              {distribution.level1Count}
            </span>
            <span className="text-gray-400 text-[11px]">({level1Pct}%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]"></span>
            <span className="text-gray-600 dark:text-gray-400">Nivel 2 (Competencia)</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="text-gray-900 dark:text-white font-semibold">
              {distribution.level2Count}
            </span>
            <span className="text-gray-400 text-[11px]">({level2Pct}%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]"></span>
            <span className="text-gray-600 dark:text-gray-400">Nivel 3 (Grupos & Palabras)</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="text-gray-900 dark:text-white font-semibold">
              {distribution.level3Count}
            </span>
            <span className="text-gray-400 text-[11px]">({level3Pct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
