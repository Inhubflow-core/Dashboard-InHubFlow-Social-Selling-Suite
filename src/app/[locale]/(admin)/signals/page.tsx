"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { UserCheck, Target, Users, Globe } from "lucide-react";
import MyPostsSignalRadarView from "@/components/signals/MyPostsSignalRadarView";
import CompetitorsSignalRadarView from "@/components/signals/CompetitorsSignalRadarView";
import LinkedInGroupsSignalRadarView from "@/components/signals/LinkedInGroupsSignalRadarView";
import GlobalSignalsView from "@/components/signals/GlobalSignalsView";

type SignalTab = "my-posts" | "competitors" | "groups" | "global";

function SignalsContent() {
  const tSidebar = useTranslations("sidebar.items");
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const resolveTab = (param: string | null): SignalTab => {
    if (!param) return "my-posts";
    switch (param.toLowerCase()) {
      case "my-posts":
      case "myposts":
      case "my_posts":
      case "posts":
        return "my-posts";
      case "competitors":
      case "competitor":
      case "competencia":
        return "competitors";
      case "groups":
      case "group":
      case "grupos":
        return "groups";
      case "global":
      case "globales":
        return "global";
      default:
        return "my-posts";
    }
  };

  const [activeTab, setActiveTab] = useState<SignalTab>(resolveTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(resolveTab(tabParam));
    }
  }, [tabParam]);

  const handleTabChange = (tab: SignalTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={tSidebar("signalRadar")} />

      {/* Selector de Pestañas Unificado: Mis Propios Posts | Post de la Competencia | Grupos de LinkedIn | Post Globales */}
      <div className="flex border-b border-gray-300 dark:border-gray-800">
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("my-posts")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "my-posts"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <UserCheck className="size-4" />
            <span>{tSidebar("myPosts")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("competitors")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "competitors"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Target className="size-4" />
            <span>{tSidebar("competitorPosts")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("groups")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "groups"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Users className="size-4" />
            <span>{tSidebar("groupPosts")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("global")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "global"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Globe className="size-4" />
            <span>{tSidebar("globalPosts")}</span>
          </button>
        </div>
      </div>

      {/* Contenido de cada pestaña */}
      <div className="pt-1">
        {activeTab === "my-posts" && <MyPostsSignalRadarView hideBreadcrumb />}
        {activeTab === "competitors" && <CompetitorsSignalRadarView hideBreadcrumb />}
        {activeTab === "groups" && <LinkedInGroupsSignalRadarView hideBreadcrumb />}
        {activeTab === "global" && <GlobalSignalsView hideBreadcrumb />}
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const tCommon = useTranslations("signals.common");
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
          {tCommon("loadingRadar")}
        </div>
      }
    >
      <SignalsContent />
    </Suspense>
  );
}
