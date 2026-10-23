"use client";
import { useTranslations } from "next-intl";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Check,
  Zap,
  Building,
  User,
  ShieldCheck,
  Layers,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { OFFICIAL_PLANS_LIST, getPlanConfig } from "@/lib/saas/plans";
import type { PlanTier } from "@/lib/saas/types";
import SlotsCapacityCard from "@/components/saas/SlotsCapacityCard";

export default function PlansPricingPage() {
  const t = useTranslations("plans");
  const { currentUser, updateUserPlan, capacity, isSuperAdmin } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [notice, setNotice] = useState<string | null>(null);

  const handleSelectPlan = (tier: PlanTier) => {
    updateUserPlan(tier);
    setNotice(`Plan actualizado exitosamente a ${tier.toUpperCase()}. Tus nuevos slots ya estan habilitados.`);
    setTimeout(() => setNotice(null), 3500);
  };

  if (currentUser.role === "member") {
    return (
      <div className="w-full space-y-6">
        <PageBreadcrumb pageTitle="Planes & Suscripcion" />
        <div className="rounded-lg border border-gray-300 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
            <ShieldCheck className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Gestion de Planes & Facturacion
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">
            Tu cuenta forma parte del espacio de trabajo gestionado por tu Administrador. Los planes, cupos multislot y la facturacion son administrados directamente por el propietario de la organizacion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="Planes & Suscripcion" />

      {/* Capacidad Actual de Slots */}
      <SlotsCapacityCard />

      {/* Notificación temporal */}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Encabezado y Selector de Ciclo de Facturación */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#0099ff]/30 bg-[#0099ff]/10 px-3.5 py-1 text-xs font-semibold text-[#0099ff]">
          <Layers className="size-3.5" />
          <span>InHubFlow | Social Selling Suite</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          {t("choosePlanTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          {t("choosePlanDesc")}
        </p>

        {/* Toggle Facturación */}
        <div className="mt-5 inline-flex items-center rounded-lg border border-gray-300 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-800/60">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              billingCycle === "monthly"
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Facturacion Mensual
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

      {/* Grid de los 3 Planes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0099ff] px-3.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                  Recomendado
                </div>
              )}

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
                <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-gray-900/60">
                  <div className="text-3xl font-extrabold text-[#0099ff]">
                    {plan.slots} {plan.slots === 1 ? "Cuenta" : "Cuentas"}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {plan.slots === 1
                      ? "1 Slot · Solo Administrador (Monousuario)"
                      : plan.slots === 5
                      ? "5 Slots · 1 Admin + hasta 4 miembros Team"
                      : "10 Slots · 1 Admin + hasta 9 miembros Team"}
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 min-h-[36px]">
                  {plan.tagline}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    ${price}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    / mes
                  </span>
                </div>
                {billingCycle === "annual" && (
                  <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Facturado anualmente (${price * 12}/ano)
                  </div>
                )}
              </div>

              {/* Lista de Características */}
              <div className="mb-6 flex-1 space-y-3 border-t border-gray-300 pt-5 dark:border-gray-800">
                <div className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                  Incluye:
                </div>
                {plan.features.map((feat, idx) => (
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

              {/* Botón de Acción */}
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
                  t("yourCurrentPlan")
                ) : (
                  <>
                    <span>{t("switchTo", { name: plan.name })}</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Preguntas Frecuentes / Detalles de Slots */}
      <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          {t("faqTitle")}
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("faq1Q")}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("faq1A")}
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("faq2Q")}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("faq2A")}
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("faq3Q")}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("faq3A")}
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("faq4Q")}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("faq4A")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
