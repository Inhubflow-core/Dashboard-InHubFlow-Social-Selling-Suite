"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Check,
  ShieldAlert,
  Zap,
  Building,
  User,
  ArrowRight,
  Layers,
} from "lucide-react";
import { OFFICIAL_PLANS_LIST } from "@/lib/saas/plans";
import type { PlanTier } from "@/lib/saas/types";
import { useAuth } from "@/context/AuthContext";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "capacity_reached" | "manual_upgrade";
}

export default function PlanUpgradeModal({
  isOpen,
  onClose,
  reason = "capacity_reached",
}: PlanUpgradeModalProps) {
  const t = useTranslations("planUpgradeModal");
  const { currentUser, updateUserPlan, capacity } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = (tier: PlanTier) => {
    updateUserPlan(tier);
    setSuccessNotice(t("successNotice", { tier: tier.toUpperCase() }));
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto bg-gray-900/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl rounded-lg border border-gray-300 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 md:p-8">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t("closeModal")}
        >
          <X className="size-5" />
        </button>

        {/* Encabezado */}
        <div className="mb-6 text-center">
          {reason === "capacity_reached" ? (
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
              <ShieldAlert className="size-4" />
              <span>{t("quotaReached", { used: capacity.usedSlots, total: capacity.totalSlots })}</span>
            </div>
          ) : (
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[#0099ff]/30 bg-[#0099ff]/10 px-3 py-1 text-xs font-semibold text-[#0099ff]">
              <Layers className="size-4" />
              <span>{t("scaleCapacity")}</span>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            {reason === "capacity_reached"
              ? t("titleCapacity")
              : t("titleUpgrade")}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("subtitle")}
          </p>

          {/* Toggle Mensual / Anual */}
          <div className="mt-5 inline-flex items-center rounded-lg border border-gray-300 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-800/60">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {t("monthlyBilling")}
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                billingCycle === "annual"
                  ? "bg-[#0099ff] text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <span>{t("annualBilling")}</span>
              <span className="rounded-lg bg-white/20 px-1 py-0.5 text-xs font-bold text-white">
                {t("save20")}
              </span>
            </button>
          </div>
        </div>

        {/* Notificación de éxito */}
        {successNotice && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-500">
            {successNotice}
          </div>
        )}

        {/* Grid de los 3 Planes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {OFFICIAL_PLANS_LIST.map((plan) => {
            const isCurrent = currentUser.planTier === plan.id;
            const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-lg border p-6 transition-all ${
                  plan.popular
                    ? "border-[#0099ff] bg-gradient-to-b from-[#0099ff]/5 to-transparent shadow-lg dark:from-[#0099ff]/10"
                    : "border-gray-300 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800/40"
                }`}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0099ff] px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                    {t("recommended")}
                  </div>
                )}

                {/* Encabezado del Plan */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                      {plan.name}
                    </span>
                    {plan.id === "starter" && <User className="size-4 text-gray-400" />}
                    {plan.id === "growth" && <Zap className="size-4 text-[#0099ff]" />}
                    {plan.id === "business" && <Building className="size-4 text-[#0099ff]" />}
                  </div>

                  {/* Destacado de Slots */}
                  <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-900/60">
                    <div className="text-2xl font-extrabold text-[#0099ff]">
                      {plan.slots === 1 ? t("singleAccount") : t("multipleAccounts", { count: plan.slots })}
                    </div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {plan.slots === 1
                        ? t("singleSlotSimultaneous")
                        : t("multipleSlotsSimultaneous", { count: plan.slots })}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 min-h-[32px]">
                    {plan.tagline}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      ${price}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("perMonth")}
                    </span>
                  </div>
                </div>

                {/* Lista de Características */}
                <div className="mb-6 flex-1 space-y-2.5 border-t border-gray-300 pt-4 dark:border-gray-800">
                  {plan.features.slice(0, 6).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      <div
                        className={`mt-0.5 rounded-full p-0.5 ${
                          feat.included
                            ? feat.highlight
                              ? "bg-[#0099ff] text-white"
                              : "bg-[#0099ff]/10 text-[#0099ff]"
                            : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                        }`}
                      >
                        <Check className="size-3" />
                      </div>
                      <span
                        className={`${
                          feat.included
                            ? feat.highlight
                              ? "font-semibold text-gray-900 dark:text-white"
                              : "text-gray-600 dark:text-gray-300"
                            : "text-gray-400 line-through dark:text-gray-600"
                        }`}
                      >
                        {feat.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Botón de Selección */}
                <button
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                    isCurrent
                      ? "cursor-default border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      : plan.popular
                      ? "bg-[#0099ff] text-white shadow-md shadow-[#0099ff]/20 hover:bg-[#0088e6]"
                      : "border border-gray-200 bg-white text-gray-800 hover:border-[#0099ff] hover:text-[#0099ff] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {isCurrent ? (
                    t("currentPlan")
                  ) : (
                    <>
                      <span>{t("selectPlan", { name: plan.name })}</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Pie informativo */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-gray-300 pt-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row">
          <div>
            {t("footerProtection")}
          </div>
          <div>
            {t("footerEnterprise")}
          </div>
        </div>
      </div>
    </div>
  );
}
