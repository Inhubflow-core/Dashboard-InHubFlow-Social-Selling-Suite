"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPlanConfig } from "@/lib/saas/plans";
import PlanUpgradeModal from "./PlanUpgradeModal";

interface SlotsCapacityCardProps {
  onUpgradeClick?: () => void;
  compact?: boolean;
}

export default function SlotsCapacityCard({
  onUpgradeClick,
  compact = false,
}: SlotsCapacityCardProps) {
  const t = useTranslations("slotsCapacity");
  const { currentUser, capacity, isSuperAdmin } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const plan = getPlanConfig(currentUser.planTier);

  const handleOpenUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setIsUpgradeModalOpen(true);
    }
  };

  if (isSuperAdmin) {
    return (
      <div className="rounded-lg border border-[#0099ff]/20 bg-gradient-to-r from-[#0099ff]/10 via-transparent to-transparent p-4 sm:p-5 dark:border-[#0099ff]/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0099ff] text-white shadow-md shadow-[#0099ff]/20">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium text-gray-800 dark:text-white/90">
                  {t("superAdminTitle")}
                </span>
                <span className="rounded-full bg-[#0099ff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0099ff]">
                  {t("unlimitedSlots")}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                {t("activeAccountsSuper", { count: capacity.usedSlots })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0099ff]">
            <span>{t("globalMasterMode")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-lg border transition-all ${
          capacity.isAtCapacity
            ? "border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent dark:border-amber-500/40"
            : "border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900/60"
        } ${compact ? "p-3.5" : "p-4 sm:p-5"}`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Info del Plan y Slots */}
          <div className="flex items-start gap-3.5">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm ${
                capacity.isAtCapacity ? "bg-amber-500" : "bg-[#0099ff]"
              }`}
            >
              <Layers className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-medium text-gray-800 dark:text-white/90">
                  {currentUser.companyName || t("defaultOrg")}
                </span>
                <span className="rounded-full bg-[#0099ff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0099ff]">
                  {plan.name} ({plan.slots} {plan.slots === 1 ? "Slot" : "Slots"})
                </span>
                {capacity.isAtCapacity && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                    <ShieldAlert className="size-3" />
                    {t("fullQuota")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {plan.slots === 1
                  ? t("singleSlotText", { count: capacity.usedSlots })
                  : plan.slots === 5
                  ? t("growthSlotsText", { count: capacity.usedSlots })
                  : t("businessSlotsText", { count: capacity.usedSlots })}
                {capacity.availableSlots > 0 ? t("freeSlots", { count: capacity.availableSlots }) : ""}
              </p>
            </div>
          </div>

          {/* Barra y Botón Upgrade */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center md:min-w-[320px]">
            {/* Barra de Progreso */}
            <div className="w-full flex-1">
              <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{t("accountCapacity")}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {capacity.usagePercentage}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    capacity.isAtCapacity ? "bg-amber-500" : "bg-[#0099ff]"
                  }`}
                  style={{ width: `${capacity.usagePercentage}%` }}
                />
              </div>
            </div>

            {/* Botón Upgrade */}
            <button
              onClick={handleOpenUpgrade}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                capacity.isAtCapacity
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600"
                  : "border border-[#0099ff]/40 bg-[#0099ff]/10 text-[#0099ff] hover:bg-[#0099ff] hover:text-white"
              }`}
            >
              <span>{capacity.isAtCapacity ? t("expandSlots") : t("changePlan")}</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PlanUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason={capacity.isAtCapacity ? "capacity_reached" : "manual_upgrade"}
      />
    </>
  );
}
