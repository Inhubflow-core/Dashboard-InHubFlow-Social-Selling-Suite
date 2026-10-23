"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  X,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getStoredTeamMembers,
  getStoredTeamInvitations,
  addTeamMember,
  removeTeamMember,
  createTeamInvitation,
} from "@/lib/saas/store";
import { getMaxTeamInvitationsAllowed, getPlanConfig } from "@/lib/saas/plans";
import { getStoredAccounts } from "@/lib/unipile/store";
import type { TeamMember, TeamInvitation } from "@/lib/saas/types";
import SlotsCapacityCard from "@/components/saas/SlotsCapacityCard";
import PlanUpgradeModal from "@/components/saas/PlanUpgradeModal";

export default function TeamManagementPage() {
  const { currentUser, capacity, isSuperAdmin } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteAccountId, setInviteAccountId] = useState<string>("");
  const [formError, setFormError] = useState("");

  const accounts = typeof window !== "undefined" ? getStoredAccounts() : [];

  const maxTeamAllowed = getMaxTeamInvitationsAllowed(currentUser);
  const isStarterPlan = !isSuperAdmin && currentUser.planTier === "starter";
  const pendingInvites = invitations.filter((i) => i.status === "pending");
  const usedTeamSlots = members.length + pendingInvites.length;
  const availableTeamSlots = isSuperAdmin ? 999 : Math.max(0, maxTeamAllowed - usedTeamSlots);
  const isTeamCapacityReached = !isSuperAdmin && (isStarterPlan || usedTeamSlots >= maxTeamAllowed);

  const loadTeamData = () => {
    setMembers(getStoredTeamMembers(currentUser.id));
    setInvitations(getStoredTeamInvitations(currentUser.id));
  };

  useEffect(() => {
    loadTeamData();
  }, [currentUser]);

  const handleOpenInvite = () => {
    if (isStarterPlan || isTeamCapacityReached) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setIsInviteModalOpen(true);
  };

  const handleCreateInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (isStarterPlan) {
      setFormError("El Plan Starter no permite invitar miembros adicionales. Actualiza al Plan Growth.");
      return;
    }

    if (isTeamCapacityReached) {
      setFormError(`Has alcanzado el límite de ${maxTeamAllowed} miembros de equipo permitidos en tu suscripción.`);
      return;
    }

    if (!inviteEmail) {
      setFormError("El correo electronico es obligatorio.");
      return;
    }

    try {
      const selectedAcc = accounts.find((a) => a.id === inviteAccountId);

      const inv = createTeamInvitation({
        email: inviteEmail,
        role: inviteRole,
        assignedAccountId: inviteAccountId || null,
      });

      // Crear también el miembro para simulación inmediata
      addTeamMember({
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole,
        assignedAccountId: inviteAccountId || null,
        accountName: selectedAcc?.name || null,
      });

      loadTeamData();
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteAccountId("");
      setInviteRole("member");
      setNotice(`Invitacion generada exitosamente para ${inviteEmail}.`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setFormError(err.message || "Error al generar la invitacion.");
    }
  };

  const handleRemoveMember = (id: string, name: string) => {
    if (confirm(`Confirmas la baja del operador ${name}?`)) {
      removeTeamMember(id);
      loadTeamData();
      setNotice(`Miembro ${name} removido del equipo.`);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (currentUser.role === "member") {
    return (
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Equipo & Operadores" />
        <div className="rounded-lg border -300 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <ShieldAlert className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Modulo Exclusivo para Administradores
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">
            Tu rol es Operador Team. La administracion de colaboradores y asignacion de cupos de cuentas de LinkedIn solo esta disponible para el Administrador del espacio de trabajo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Equipo & Operadores" />

      {/* Capacidad del Plan */}
      <SlotsCapacityCard onUpgradeClick={() => setIsUpgradeModalOpen(true)} />

      {/* Alerta de Plan Starter monousuario */}
      {isStarterPlan && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                  Plan Starter Monousuario (1 Cuenta de Administrador · 0 Cupos de Equipo)
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Tu suscripción actual incluye 1 slot exclusivo para tu cuenta de Administrador. Para invitar a colaboradores de equipo (1 Admin + hasta 4 miembros Team) y asignarles perfiles de LinkedIn independientes, actualiza al Plan Growth.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition"
            >
              <span>Actualizar a Plan Growth</span>
              <ExternalLink className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Notificación temporal */}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header y Acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
              Gestion de Equipo & Asignacion de Cuentas
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isSuperAdmin
              ? "Panel maestro de Super Administrador con invitaciones ilimitadas para todo el equipo."
              : isStarterPlan
              ? "Plan Starter monousuario: 1 cuenta para el Administrador. Actualiza a Growth para sumar colaboradores."
              : `Invita hasta a ${maxTeamAllowed} miembros Team para operar perfiles de LinkedIn dentro de tus slots.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenInvite}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition ${
              isStarterPlan || isTeamCapacityReached
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-[#0099ff] hover:bg-[#0088e6]"
            }`}
          >
            <UserPlus className="size-4" />
            <span>
              {isStarterPlan
                ? "Habilitar Equipo (Growth)"
                : isTeamCapacityReached
                ? "Ampliar Cupos de Equipo"
                : "Invitar Miembro"}
            </span>
          </button>
        </div>
      </div>

      {/* Métricas de Capacidad de Equipo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border -300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              Slots Totales del Plan
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
              <Layers className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {isSuperAdmin ? "999 (Ilimitado)" : `${currentUser.slotsLimit} ${currentUser.slotsLimit === 1 ? "Slot" : "Slots"}`}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isSuperAdmin
              ? "Slots y perfiles ilimitados para Super Admin"
              : isStarterPlan
              ? "1 Slot exclusivo de Administrador (Monousuario)"
              : currentUser.slotsLimit === 5
              ? "1 Admin + hasta 4 miembros Team (5 slots)"
              : "1 Admin + hasta 9 miembros Team (10 slots)"}
          </p>
        </div>

        <div className="rounded-lg border -300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              Miembros de Equipo (Team)
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Users className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {members.length} / {isSuperAdmin ? "∞" : maxTeamAllowed}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isStarterPlan
              ? "0 colaboradores permitidos en Plan Starter"
              : `1 Admin principal + ${members.length} miembros activos (${pendingInvites.length} pendientes)`}
          </p>
        </div>

        <div className="rounded-lg border -300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
              Cupos de Equipo Disponibles
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <ShieldCheck className="size-4.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {isSuperAdmin ? "Ilimitados" : availableTeamSlots}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isStarterPlan
              ? "Actualiza al Plan Growth para 4 cupos"
              : availableTeamSlots === 0
              ? "Límite del plan alcanzado"
              : `${availableTeamSlots} vacantes para nuevos operadores`}
          </p>
        </div>
      </div>

      {/* Tabs Miembros vs Invitaciones */}
      <div className="border-b -300 dark:border-gray-800">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-3 text-xs leading-5 font-normal tracking-normal uppercase transition-colors ${
              activeTab === "members"
                ? "border-b-2 border-[#0099ff] text-[#0099ff]"
                : "text-gray-400 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Miembros del Equipo ({members.length + 1})
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={`pb-3 text-xs leading-5 font-normal tracking-normal uppercase transition-colors ${
              activeTab === "invitations"
                ? "border-b-2 border-[#0099ff] text-[#0099ff]"
                : "text-gray-400 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Invitaciones Pendientes ({invitations.length})
          </button>
        </div>
      </div>

      {/* Vista de Miembros */}
      {activeTab === "members" && (
        <div className="overflow-hidden rounded-lg border -300 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b -300 bg-gray-50/60 text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3.5">Colaborador</th>
                <th className="px-5 py-3.5">Rol en Organizacion</th>
                <th className="px-5 py-3.5">Cuenta LinkedIn Asignada</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y -300 dark:divide-gray-800">
              {/* Dueño / Admin de la cuenta */}
              <tr className="bg-[#0099ff]/5">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0099ff] font-bold text-white">
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {currentUser.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isSuperAdmin
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  }`}>
                    {isSuperAdmin ? "Super Admin (Maestro)" : "Admin (Propietario · 1 Slot)"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {isSuperAdmin ? "Todas las cuentas (Acceso Maestro Global)" : "Cuenta de Administrador (Slot #1)"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                    Activo
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-gray-400">
                  <span className="text-xs">Cuenta Principal</span>
                </td>
              </tr>

              {/* Miembros delegados (Rol Team) */}
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {m.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Team · {m.role === "admin" ? "Co-Admin" : "Operador SDR"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {m.accountName ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                        <UserCheck className="size-3.5 text-[#0099ff]" />
                        {m.accountName}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin cuenta asignada (Slot libre)</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                      Activo
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-500/10 hover:text-rose-600"
                      title="Dar de baja"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vista de Invitaciones */}
      {activeTab === "invitations" && (
        <div className="overflow-hidden rounded-lg border -300 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b -300 bg-gray-50/60 text-xs leading-5 font-normal tracking-normal uppercase text-gray-400 [&_th]:font-normal dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3.5">Correo Destinatario</th>
                <th className="px-5 py-3.5">Rol Propuesto</th>
                <th className="px-5 py-3.5">Codigo / Enlace de Invitacion</th>
                <th className="px-5 py-3.5">Expiracion</th>
                <th className="px-5 py-3.5 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y -300 dark:divide-gray-800">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No hay invitaciones pendientes.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      {inv.email}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                        Team · {inv.role === "admin" ? "Co-Admin" : "Operador"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <code className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800">
                          {inv.inviteCode}
                        </code>
                        <button
                          onClick={() => handleCopyLink(inv.inviteUrl, inv.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700"
                        >
                          <Copy className="size-3" />
                          <span>{copiedId === inv.id ? "Copiado!" : "Copiar Enlace"}</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                        Pendiente
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Invitar Miembro */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto bg-gray-900/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-lg border -300 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center justify-between pr-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Invitar Miembro al Equipo (Team)
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Asigna a un colaborador para operar tus cuentas de LinkedIn dentro de tu cuota contratada.
            </p>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60 border -300 dark:border-gray-700/60">
              <span className="text-xs text-gray-500 dark:text-gray-400">Cupos libres de equipo:</span>
              <span className="text-xs font-bold text-[#0099ff]">
                {isSuperAdmin ? "Ilimitados" : `${availableTeamSlots} de ${maxTeamAllowed} disponibles`}
              </span>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateInviteSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Correo Electrónico del Colaborador
                </label>
                <input
                  type="email"
                  required
                  placeholder="operador@tuempresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border -300 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Rol en el Equipo
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border -300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="member">Team · Operador SDR (Acceso a su bandeja asignada)</option>
                  <option value="admin">Team · Co-Administrador (Gestion de campanas y equipo)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Cuenta de LinkedIn Asignada (Slot)
                </label>
                <select
                  value={inviteAccountId}
                  onChange={(e) => setInviteAccountId(e.target.value)}
                  className="w-full rounded-lg border -300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#0099ff] focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">-- Sin asignar por ahora --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t -300 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0099ff] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0088e6]"
                >
                  Enviar Invitacion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upgrade */}
      <PlanUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason="capacity_reached"
      />
    </div>
  );
}
