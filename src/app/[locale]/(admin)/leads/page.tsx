"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Users, ListFilter } from "lucide-react";
import LeadsDirectoryView from "@/components/leads/LeadsDirectoryView";
import SignalListsView from "@/components/leads/SignalListsView";

type LeadsTab = "directory" | "lists";

function LeadsContent() {
  const tSidebar = useTranslations("sidebar.items");
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const resolveTab = (param: string | null): LeadsTab => {
    if (!param) return "directory";
    switch (param.toLowerCase()) {
      case "lists":
      case "listas":
      case "list":
        return "lists";
      case "directory":
      case "directorio":
      default:
        return "directory";
    }
  };

  const [activeTab, setActiveTab] = useState<LeadsTab>(resolveTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(resolveTab(tabParam));
    }
  }, [tabParam]);

  const handleTabChange = (tab: LeadsTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={tSidebar("leads")} />

      {/* Selector de Pestañas Unificado: Directorio de Leads | Listas por Señal */}
      <div className="flex border-b border-gray-300 dark:border-gray-800">
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("directory")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "directory"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Users className="size-4" />
            <span>{tSidebar("leadsDirectory")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("lists")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "lists"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <ListFilter className="size-4" />
            <span>{tSidebar("leadsLists")}</span>
          </button>
        </div>
      </div>

      {/* Contenido de cada pestaña */}
      <div className="pt-1">
        {activeTab === "directory" && (
          <LeadsDirectoryView
            hideBreadcrumb
            onTabChange={(tab) => handleTabChange(tab as LeadsTab)}
          />
        )}
        {activeTab === "lists" && (
          <SignalListsView
            hideBreadcrumb
            onTabChange={(tab) => handleTabChange(tab as LeadsTab)}
          />
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const t = useTranslations("leads");
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
          {t("loadingLeadsModule")}
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}
