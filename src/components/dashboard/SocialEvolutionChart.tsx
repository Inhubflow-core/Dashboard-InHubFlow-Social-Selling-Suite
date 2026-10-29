"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useTranslations } from "next-intl";
import type { EvolutionData } from "@/lib/dashboard/types";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface SocialEvolutionChartProps {
  monthlyData: EvolutionData;
  weeklyData: EvolutionData;
}

export default function SocialEvolutionChart({
  monthlyData,
  weeklyData,
}: SocialEvolutionChartProps) {
  const t = useTranslations("dashboard");
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");

  const currentData = period === "monthly" ? monthlyData : weeklyData;

  const series = currentData.series.map((s) => ({
    name: s.name,
    data: s.data,
  }));

  const colors = currentData.series.map((s) => s.color);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 330,
      type: "area",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    colors: colors,
    stroke: {
      curve: "smooth",
      width: [2.5, 2.5, 2.5, 2.5],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      theme: "light",
      shared: true,
      intersect: false,
      style: {
        fontSize: "12px",
        fontFamily: "Outfit, sans-serif",
      },
    },
    xaxis: {
      categories: currentData.categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "12px",
        },
      },
    },
    legend: {
      show: false, // Usamos leyenda personalizada arriba con estadísticas
    },
  };

  // Calcular totales para los badges de la leyenda superior
  const kpiSummaries = currentData.series.map((s) => {
    const total = s.data.reduce((a, b) => a + b, 0);
    const lastValue = s.data[s.data.length - 1];
    return {
      name: s.name,
      total,
      lastValue,
      color: s.color,
    };
  });

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      {/* Header del gráfico */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
              {t("charts.evolution.title")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("charts.evolution.desc")}
          </p>
        </div>

        {/* Selector de Período */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60">
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              period === "monthly"
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t("timeRange.months12")}
          </button>
          <button
            type="button"
            onClick={() => setPeriod("weekly")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              period === "weekly"
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t("timeRange.weeks8")}
          </button>
        </div>
      </div>

      {/* Leyenda interactiva de KPIs con colores diferenciados */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiSummaries.map((kpi, idx) => (
          <div
            key={idx}
            className="flex flex-col rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: kpi.color }}
              ></span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                {kpi.name}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {kpi.lastValue}
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: kpi.color }}
              >
                +{Math.round((kpi.lastValue / (kpi.total || 1)) * 100)}% tracc.
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Renderizado de ApexChart */}
      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="min-w-[650px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={330}
          />
        </div>
      </div>
    </div>
  );
}
