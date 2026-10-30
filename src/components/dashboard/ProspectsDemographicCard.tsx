"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { GeographicDemographicItem } from "@/lib/dashboard/types";
import DemographicCountryMap from "./DemographicCountryMap";

interface ProspectsDemographicCardProps {
  demographics: GeographicDemographicItem[];
}

export default function ProspectsDemographicCard({
  demographics,
}: ProspectsDemographicCardProps) {
  const t = useTranslations("dashboard.demographics");

  const markers = demographics.map((d) => ({
    latLng: d.coordinates,
    name: d.countryName,
    style: {
      fill: "#0099ff",
      borderWidth: 1.5,
      borderColor: "#ffffff",
    },
  }));

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            {t("title")}
          </h3>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            {t("badge")}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("desc")}
        </p>
      </div>

      <div className="my-3 overflow-hidden rounded-lg border border-gray-100 bg-gray-50/70 p-2 dark:border-gray-800 dark:bg-gray-800/40">
        <DemographicCountryMap markers={markers} />
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        {demographics.map((item) => (
          <div
            key={item.countryCode}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative h-5 w-5 overflow-hidden rounded-full flex-shrink-0 shadow-xs border border-gray-200 dark:border-gray-700">
                <Image
                  src={item.flagSrc}
                  alt={item.countryName}
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white block leading-tight">
                  {item.countryName}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  {item.prospectsCount} {t("prospectsCountLabel")}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block leading-tight">
                {item.acceptanceRate}%
              </span>
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-tight">
                {t("acceptanceLabel")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
