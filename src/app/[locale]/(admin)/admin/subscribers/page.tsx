"use client";
import { useTranslations } from "next-intl";

import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Users,
  ShieldCheck,
  Layers,
  Sparkles,
  Search,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Filter,
  UserCheck,
  Building,
  Key,
  Mail,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getStoredUsers,
  addSubscriber,
  updateSubscriber,
  deleteSubscriber,
  getGlobalSaaSStats,
  getUserCapacity,
} from "@/lib/saas/store";
import { OFFICIAL_PLANS_LIST, getPlanConfig } from "@/lib/saas/plans";
import type { SaaSUser, PlanTier, SubscriptionStatus } from "@/lib/saas/types";

export default function AdminSubscribersPage() {
  const t = useTranslations("adminSubscribers");
  const { currentUser, isSuperAdmin, switchUser, refreshUserData } = useAuth();

  const [users, setUsers] = useState<SaaSUser[]>([]);
  const [stats, setStats] = useState(getGlobalSaaSStats());
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SaaSUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Formulario de Creación
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPlan, setNewPlan] = useState<PlanTier>("starter");
  const [newSlots, setNewSlots] = useState<number>(1);
  const [formError, setFormError] = useState("");

  // Formulario de Edición
  const [editCompany, setEditCompany] = useState("");
  const [editPlan, setEditPlan] = useState<PlanTier>("starter");
  const [editSlots, setEditSlots] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("active");

  const loadData = () => {
    setUsers(getStoredUsers());
    setStats(getGlobalSaaSStats());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Al cambiar el plan en el formulario de creación, autocalcular slots sugeridos
  useEffect(() => {
    const config = getPlanConfig(newPlan);
    setNewSlots(config.slots);
  }, [newPlan]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.companyName && u.companyName.toLowerCase().includes(search.toLowerCase()));

      const matchesPlan = planFilter === "all" || u.planTier === planFilter;
      const matchesStatus = statusFilter === "all" || u.subscriptionStatus === statusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [users, search, planFilter, statusFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newEmail || !newCompany) {
      setFormError(t("errorRequiredFields"));
      return;
    }

    try {
      addSubscriber({
        email: newEmail,
        name: newName || undefined,
        companyName: newCompany,
        planTier: newPlan,
        slotsLimit: newSlots,
      });

      loadData();
      refreshUserData();
      setIsCreateModalOpen(false);
      setNewEmail("");
      setNewName("");
      setNewCompany("");
      setNewPlan("starter");
      setNewSlots(1);
      setNotice(t("noticeCreated", { company: newCompany, slots: newSlots }));
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setFormError(err.message || t("errorGeneric"));
    }
  };

  const handleOpenEdit = (user: SaaSUser) => {
    setSelectedUser(user);
    setEditCompany(user.companyName || "");
    setEditPlan(user.planTier);
    setEditSlots(user.slotsLimit);
    setEditStatus(user.subscriptionStatus);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    updateSubscriber(selectedUser.id, {
      companyName: editCompany,
      planTier: editPlan,
      slotsLimit: editSlots,
      subscriptionStatus: editStatus,
    });

    loadData();
    refreshUserData();
    setIsEditModalOpen(false);
    setNotice(t("noticeUpdated", { email: selectedUser.email }));
    setTimeout(() => setNotice(null), 3500);
  };

  const handleDelete = (id: string, email: string) => {
    if (confirm(t("confirmDelete", { email }))) {
      const ok = deleteSubscriber(id);
      if (ok) {
        loadData();
        refreshUserData();
        setNotice(t("noticeDeleted", { email }));
        setTimeout(() => setNotice(null), 3000);
      } else {
        alert(t("alertCannotDeleteSuperAdmin"));
      }
    }
  };

  const handleSwitchToClient = (userId: string, email: string) => {
    switchUser(userId);
    setNotice(t("noticeSwitched", { email }));
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle={t("breadcrumb")} />

      {/* Notificación temporal */}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 p-3.5 text-sm font-medium text-brand-600 dark:text-brand-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Encabezado y Acción Principal en formato estándar de Card */}
      <div className="w-full rounded-lg border border-gray-300 bg-white px-6 py-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {t("headerTitle")}
              </h3>
              <span className="rounded-full bg-[#0099ff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0099ff]">
                {t("badgeSuperAdmin")}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("headerDesc")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-[#0088e6]"
            >
              <Plus className="size-4" />
              <span>{t("newSubscriberBtn")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Globales del SaaS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Clientes */}
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              {t("kpiSubscribedClients")}
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
              <Users className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalSubscribers}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("kpiSubscribedClientsDesc")}
          </p>
        </div>

        {/* Suscripciones Activas */}
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              {t("kpiActiveSubscriptions")}
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.activeSubscriptions}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("kpiActiveSubscriptionsDesc")}
          </p>
        </div>

        {/* Total Slots Asignados */}
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              {t("kpiContractedSlots")}
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Layers className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {t("kpiContractedSlotsCount", { count: stats.totalSlotsAllocated })}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("kpiContractedSlotsDesc")}
          </p>
        </div>

        {/* Cuentas Conectadas en Tiempo Real */}
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              {t("kpiLinkedProfiles")}
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <Zap className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalConnectedAccounts}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("kpiLinkedProfilesDesc")}
          </p>
        </div>
      </div>

      {/* Desglose por Planes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t("planStarterLabel")}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {stats.starterCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {t("slotsContracted", { count: stats.starterCount * 1 })}
          </div>
        </div>

        <div className="rounded-lg border border-[#0099ff]/30 bg-[#0099ff]/5 p-4 dark:border-[#0099ff]/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0099ff]">
              {t("planGrowthLabel")}
            </span>
            <span className="rounded-full bg-[#0099ff] px-2 py-0.5 text-xs font-bold text-white">
              {stats.growthCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {t("slotsContracted", { count: stats.growthCount * 5 })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t("planBusinessLabel")}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {stats.businessCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {t("slotsContracted", { count: stats.businessCount * 10 })}
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-xs text-gray-900 outline-none transition focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">{t("filterAllPlans")}</option>
              <option value="starter">{t("planStarterLabel")}</option>
              <option value="growth">{t("planGrowthLabel")}</option>
              <option value="business">{t("planBusinessLabel")}</option>
              <option value="custom">{t("planCustomLabel")}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">{t("filterAllStatuses")}</option>
              <option value="active">{t("statusActive")}</option>
              <option value="trial">{t("statusTrial")}</option>
              <option value="past_due">{t("statusPastDue")}</option>
              <option value="canceled">{t("statusCanceled")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Suscriptores */}
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-300 bg-gray-50/60 text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3.5">{t("colSubscriber")}</th>
                <th className="px-5 py-3.5">{t("colRole")}</th>
                <th className="px-5 py-3.5">{t("colPlan")}</th>
                <th className="px-5 py-3.5">{t("colSlots")}</th>
                <th className="px-5 py-3.5">{t("colStatus")}</th>
                <th className="px-5 py-3.5">{t("colRegistered")}</th>
                <th className="px-5 py-3.5 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const capacity = getUserCapacity(u.id);
                  const isCurrentActive = currentUser.id === u.id;
                  const isSuper = u.role === "super_admin";

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40 ${
                        isCurrentActive ? "bg-[#0099ff]/5" : ""
                      }`}
                    >
                      {/* Cliente / Empresa */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {u.email}
                            </div>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {u.companyName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-4">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                            <ShieldCheck className="size-3" />
                            {t("roleSuperAdmin")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <UserCheck className="size-3" />
                            {t("roleClientAdmin")}
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            u.planTier === "starter"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              : u.planTier === "growth"
                              ? "bg-[#0099ff]/15 text-[#0099ff]"
                              : u.planTier === "business"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-purple-500/15 text-purple-600"
                          }`}
                        >
                          {u.planTier}
                        </span>
                      </td>

                      {/* Slots */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {isSuper
                            ? t("unlimitedSlots")
                            : u.slotsLimit === 1
                            ? t("singleSlot")
                            : t("multipleSlots", { count: u.slotsLimit })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t("accountsInUse", { count: capacity.usedSlots })}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.subscriptionStatus === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : u.subscriptionStatus === "trial"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {u.subscriptionStatus === "active"
                            ? t("statusActive")
                            : u.subscriptionStatus === "trial"
                            ? t("statusTrial")
                            : u.subscriptionStatus === "past_due"
                            ? t("statusPastDue")
                            : t("statusCanceled")}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Conmutar sesión a cliente */}
                          <button
                            onClick={() => handleSwitchToClient(u.id, u.email)}
                            title={t("actionSwitchTooltip")}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-[#0099ff]/10 hover:text-[#0099ff] dark:text-gray-400"
                          >
                            <ExternalLink className="size-4" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title={t("actionEditTooltip")}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Edit3 className="size-4" />
                          </button>

                          {/* Eliminar (si no es super admin) */}
                          {!isSuper && (
                            <button
                              onClick={() => handleDelete(u.id, u.email)}
                              title={t("actionDeleteTooltip")}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-gray-400"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear Suscriptor */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto bg-gray-900/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-lg border border-gray-300 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("modalCreateTitle")}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("modalCreateDesc")}
            </p>

            {formError && (
              <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("formEmail")}
                </label>
                <input
                  type="email"
                  required
                  placeholder="cliente@empresa.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("formContactName")}
                </label>
                <input
                  type="text"
                  placeholder={t("formContactPlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("formCompany")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("formCompanyPlaceholder")}
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("formInitialPlan")}
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as PlanTier)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="starter">{t("planStarterLabel")}</option>
                    <option value="growth">{t("planGrowthLabel")}</option>
                    <option value="business">{t("planBusinessLabel")}</option>
                    <option value="custom">{t("planCustomOption")}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("formSlotsLimit")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={newSlots}
                    onChange={(e) => setNewSlots(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-300 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                >
                  {t("btnCancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0088e6]"
                >
                  {t("btnCreateSubscriber")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Suscriptor */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto bg-gray-900/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-lg border border-gray-300 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("modalEditTitle", { email: selectedUser.email })}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("modalEditDesc")}
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("formCompanyShort")}
                </label>
                <input
                  type="text"
                  required
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("formPlan")}
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => {
                      const p = e.target.value as PlanTier;
                      setEditPlan(p);
                      setEditSlots(getPlanConfig(p).slots);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="starter">{t("planStarterLabel")}</option>
                    <option value="growth">{t("planGrowthLabel")}</option>
                    <option value="business">{t("planBusinessLabel")}</option>
                    <option value="custom">{t("planEnterpriseOption")}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("formAccountSlots")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={editSlots}
                    onChange={(e) => setEditSlots(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("formSubscriptionStatus")}
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="active">{t("statusActive")}</option>
                  <option value="trial">{t("statusTrialOption")}</option>
                  <option value="past_due">{t("statusPastDue")}</option>
                  <option value="canceled">{t("statusCanceledOption")}</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-300 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                >
                  {t("btnCancel")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0088e6]"
                >
                  {t("btnSaveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
