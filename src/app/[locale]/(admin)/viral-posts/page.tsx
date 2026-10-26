"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Flame, Bot, FileText, Calendar } from "lucide-react";
import ViralRadarView from "@/components/viral-posts/ViralRadarView";
import CreateViralPostView from "@/components/viral-posts/CreateViralPostView";
import PostsListView from "@/components/viral-posts/PostsListView";
import EditorialCalendarView from "@/components/viral-posts/EditorialCalendarView";

type ViralTab = "radar" | "create" | "list" | "calendar";

function ViralPostsContent() {
  const tSidebar = useTranslations("sidebar.items");
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const resolveTab = (param: string | null): ViralTab => {
    if (!param) return "radar";
    switch (param.toLowerCase()) {
      case "finder":
      case "radar":
        return "radar";
      case "create":
      case "modeler":
      case "modelador":
        return "create";
      case "list":
      case "posts":
      case "publicaciones":
        return "list";
      case "calendar":
      case "calendario":
        return "calendar";
      default:
        return "radar";
    }
  };

  const [activeTab, setActiveTab] = useState<ViralTab>(resolveTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(resolveTab(tabParam));
    }
  }, [tabParam]);

  const handleTabChange = (tab: ViralTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={tSidebar("viralPosts")} />

      {/* Selector de Pestañas Unificado: Post Finder | Modelador IA | Publicaciones | Calendario Editorial */}
      <div className="flex border-b border-gray-300 dark:border-gray-800">
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("radar")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "radar"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Flame className="size-4" />
            <span>{tSidebar("viralRadar")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("create")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "create"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Bot className="size-4" />
            <span>{tSidebar("createPost")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("list")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "list"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <FileText className="size-4" />
            <span>{tSidebar("postList")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("calendar")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "calendar"
                ? "border-[#0099ff] text-[#0099ff]"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Calendar className="size-4" />
            <span>{tSidebar("editorialCalendar")}</span>
          </button>
        </div>
      </div>

      {/* Contenido de cada pestaña */}
      <div className="pt-1">
        {activeTab === "radar" && (
          <ViralRadarView
            hideBreadcrumb
            onTabChange={(tab) => handleTabChange(tab as ViralTab)}
          />
        )}
        {activeTab === "create" && (
          <CreateViralPostView
            hideBreadcrumb
            onTabChange={(tab) => handleTabChange(tab as ViralTab)}
          />
        )}
        {activeTab === "list" && (
          <PostsListView
            hideBreadcrumb
            onTabChange={(tab) => handleTabChange(tab as ViralTab)}
          />
        )}
        {activeTab === "calendar" && (
          <EditorialCalendarView
            hideBreadcrumb
            onTabChange={(tab) => handleTabChange(tab as ViralTab)}
          />
        )}
      </div>
    </div>
  );
}

export default function ViralPostsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
          Cargando Viral Post Engine...
        </div>
      }
    >
      <ViralPostsContent />
    </Suspense>
  );
}
