"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useTranslations } from "next-intl";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface MonthlyProspectingTargetProps {
  scheduledMeetings: number;
  targetMeetings?: number;
}

export default function MonthlyProspectingTarget({
  scheduledMeetings,
  targetMeetings = 20,
}: MonthlyProspectingTargetProps) {
  const t = useTranslations("dashboard");

  const progressPercent = Math.min(
    100,
    Math.round((scheduledMeetings / Math.max(1, targetMeetings)) * 100)
  );

  const series = [progressPercent];

  const options: ApexOptions = {
    colors: ["#0099ff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 340,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: "60%",
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 0,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            fontSize: "36px",
            fontWeight: "700",
            offsetY: -20,
            color: "#111827",
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        gradientToColors: ["#10b981"],
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Objetivo"],
  };

  const projectedMeetings = Math.round(scheduledMeetings * 1.35);

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            {t("charts.target.title")}
          </h3>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            En ritmo
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("charts.target.desc")}
        </p>
      </div>

      <div className="relative my-auto flex w-full justify-center">
        <ReactApexChart
          options={options}
          series={series}
          type="radialBar"
          height={320}
          width="100%"
        />
      </div>

      <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block uppercase">
              {t("charts.target.targetLabel")}
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {targetMeetings} citas
            </span>
          </div>
          <div className="border-x border-gray-200 dark:border-gray-800">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block uppercase">
              {t("charts.target.currentLabel")}
            </span>
            <span className="text-base font-bold text-brand-600 dark:text-brand-400">
              {scheduledMeetings} citas
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block uppercase">
              {t("charts.target.projectedLabel")}
            </span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {projectedMeetings} citas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
