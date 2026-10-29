"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useTranslations } from "next-intl";
import type { FunnelStageData } from "@/lib/dashboard/types";
import { Link } from "@/i18n/navigation";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PipelineFunnelChartProps {
  stages: FunnelStageData[];
}

export default function PipelineFunnelChart({ stages }: PipelineFunnelChartProps) {
  const t = useTranslations("dashboard");

  const categories = stages.map((s) => s.label);
  const data = stages.map((s) => s.count);
  const colors = stages.map((s) => s.color);

  const totalDeals = stages
    .filter((s) => s.id !== "closed_lost")
    .reduce((acc, curr) => acc + curr.count, 0);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 320,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 4,
        barHeight: "58%",
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: colors,
    dataLabels: {
      enabled: true,
      textAnchor: "start",
      offsetX: 10,
      style: {
        fontSize: "12px",
        fontWeight: 600,
        colors: ["#374151"],
      },
      formatter: function (val) {
        return `${val} prospectos`;
      },
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["#fff"],
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          colors: "#6B7280",
          fontSize: "11px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#374151",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    grid: {
      borderColor: "#f3f4f6",
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val) => `${val} prospectos activos`,
      },
    },
    legend: {
      show: false,
    },
  };

  const series = [
    {
      name: "Prospectos",
      data: data,
    },
  ];

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            {t("charts.funnel.title")}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("charts.funnel.desc")}
          </p>
        </div>

        <Link
          href="/pipeline"
          className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          {t("modules.pipelineAction")} &rarr;
        </Link>
      </div>

      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="min-w-[420px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={320}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Volumen activo en embudo
        </span>
        <span className="text-xs font-bold text-gray-900 dark:text-white">
          {totalDeals} oportunidades en gestión
        </span>
      </div>
    </div>
  );
}
