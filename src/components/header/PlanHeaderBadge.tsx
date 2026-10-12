"use client";

import React, { useState } from "react";
import { Layers } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPlanConfig } from "@/lib/saas/plans";
import PlanUpgradeModal from "@/components/saas/PlanUpgradeModal";
import { useTranslations } from "next-intl";

export default function PlanHeaderBadge() {
  const { currentUser, capacity, isSuperAdmin } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const plan = getPlanConfig(currentUser.planTier);
  const t = useTranslations("header.plan");

  if (isSuperAdmin) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsUpgradeModalOpen(true)}
        className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all sm:inline-flex ${
          capacity.isAtCapacity
            ? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white"
            : "border-[#0099ff]/30 bg-[#0099ff]/10 text-[#0099ff] hover:bg-[#0099ff] hover:text-white"
        }`}
        title={t("viewCapacity")}
      >
        <Layers className="size-3.5" />
        <span>
          {plan.name} ({capacity.usedSlots}/{capacity.totalSlots} Slots)
        </span>
      </button>

      <PlanUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason={capacity.isAtCapacity ? "capacity_reached" : "manual_upgrade"}
      />
    </>
  );
}
