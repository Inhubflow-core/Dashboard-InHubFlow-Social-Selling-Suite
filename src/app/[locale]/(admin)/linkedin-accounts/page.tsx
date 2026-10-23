"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LinkedInAccountCard from "@/components/unipile/LinkedInAccountCard";
import ConnectLinkedInModal from "@/components/unipile/ConnectLinkedInModal";
import ConfigureAccountLimitsModal from "@/components/unipile/ConfigureAccountLimitsModal";
import SlotsCapacityCard from "@/components/saas/SlotsCapacityCard";
import PlanUpgradeModal from "@/components/saas/PlanUpgradeModal";
import { useAuth } from "@/context/AuthContext";
import {
  getStoredAccounts,
  getVisibleAccountsForUser,
  getActiveAccountId,
  setActiveAccountId,
  addStoredAccount,
  updateStoredAccount,
  removeStoredAccount,
  updateStoredAccountStatus,
  accountMatchesUser,
} from "@/lib/unipile/store";
import { updateSubscriber } from "@/lib/saas/store";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import {
  Plus,
  ShieldCheck,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Filter,
  Lock,
  Sliders,
} from "lucide-react";

export default function LinkedInAccountsPage() {
  const { currentUser, capacity, isSuperAdmin, canConnectAccount, refreshUserData } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedLinkedInAccount[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"all" | "mine" | "team">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialAccount, setModalInitialAccount] = useState<ConnectedLinkedInAccount | null>(null);
  const [modalInitialStep, setModalInitialStep] = useState<1 | 2>(1);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [editingLimitsAccount, setEditingLimitsAccount] = useState<ConnectedLinkedInAccount | null>(null);
  const [isLimitsModalOpen, setIsLimitsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unipileStatus, setUnipileStatus] = useState<{
    configured: boolean;
    mode: "live" | "demo";
    dsn?: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isTeamMember = currentUser.role === "member";
  const isClientAdmin = currentUser.role === "client_admin" || isSuperAdmin;

  // Cargar cuentas filtradas según el rol del usuario actual y sincronizar con Unipile
  useEffect(() => {
    const loadedAccounts = getVisibleAccountsForUser(currentUser);
    setAccounts(loadedAccounts);
    if (loadedAccounts.length > 0 && !loadedAccounts.some((a) => a.id === activeId)) {
      setActiveId(loadedAccounts[0].id);
    }

    // Consultar estado de Unipile
    fetch("/api/unipile/status")
      .then((res) => res.json())
      .then((data) => {
        setUnipileStatus(data);
      })
      .catch(() => {
        setUnipileStatus({ configured: false, mode: "demo" });
      });

    // Sincronización automática silenciosa al montar la página
    fetch("/api/unipile/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
          data.accounts.forEach((remoteAcc: ConnectedLinkedInAccount) => {
            addStoredAccount(remoteAcc);
          });
          const refreshed = getVisibleAccountsForUser(currentUser);
          setAccounts(refreshed);
          const currentActive = getActiveAccountId();
          const targetActive = refreshed.find((a) => a.id === currentActive) || refreshed[0];
          if (targetActive) {
            setActiveId(targetActive.id);
            setActiveAccountId(targetActive.id);
          }
        }
      })
      .catch((err) => {
        console.warn("[linkedin-accounts] Sincronización inicial silenciosa:", err);
      });

    // Escuchar evento postMessage cuando el usuario termine la autenticación en ventana emergente
    const handleCallbackMessage = (event: MessageEvent) => {
      if (event.data?.type === "LINKEDIN_AUTH_SUCCESS") {
        handleSyncAll();
      }
    };
    window.addEventListener("message", handleCallbackMessage);
    return () => window.removeEventListener("message", handleCallbackMessage);
  }, [currentUser]);

  const handleSelectActive = (id: string) => {
    setActiveId(id);
    setActiveAccountId(id);
    setNotice("Cuenta activa actualizada para envios y automatizaciones.");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Confirmas la desconexion de esta cuenta de LinkedIn?")) return;
    const acc = accounts.find((a) => a.id === id);
    const targetRemoteId = acc?.unipileAccountId || id;
    try {
      await fetch(`/api/unipile/accounts/${encodeURIComponent(targetRemoteId)}`, { method: "DELETE" });
    } catch {
      // Ignorar error si está en demo
    }
    const updated = removeStoredAccount(id);
    setAccounts(updated);
    const newActive = getActiveAccountId();
    setActiveId(newActive);
    refreshUserData();
    setNotice("Cuenta desvinculada exitosamente.");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleReconnect = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    setModalInitialAccount(acc || null);
    setModalInitialStep(2);
    setIsModalOpen(true);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/unipile/accounts");
      const data = await res.json();
      if (data.accounts && Array.isArray(data.accounts)) {
        data.accounts.forEach((remoteAcc: ConnectedLinkedInAccount) => {
          addStoredAccount(remoteAcc);
        });
        const visible = getVisibleAccountsForUser(currentUser);
        setAccounts(visible);
        if (visible.length > 0 && (!activeId || !visible.some((a) => a.id === activeId))) {
          setActiveId(visible[0].id);
          setActiveAccountId(visible[0].id);
        }
        setNotice(`Sincronización completada: ${data.accounts.length} cuenta(s) verificada(s) con LinkedIn Cloud.`);
      } else {
        setNotice("Sincronización completada en modo seguro.");
      }
    } catch {
      setNotice("Verificación completada.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleConnectClick = () => {
    if (!canConnectAccount && !isSuperAdmin) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setModalInitialAccount(null);
    setModalInitialStep(1);
    setIsModalOpen(true);
  };

  const handleAccountConnected = (newAcc: ConnectedLinkedInAccount) => {
    addStoredAccount(newAcc);
    const visible = getVisibleAccountsForUser(currentUser);
    setAccounts(visible);
    setActiveId(newAcc.id);
    setActiveAccountId(newAcc.id);
    refreshUserData();
    setNotice(`Cuenta ${newAcc.name} vinculada exitosamente.`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleOpenConfigureLimits = (account: ConnectedLinkedInAccount) => {
    setEditingLimitsAccount(account);
    setIsLimitsModalOpen(true);
  };

  const handleSaveAccountLimits = (updated: ConnectedLinkedInAccount) => {
    updateStoredAccount(updated.id, updated);
    if (accountMatchesUser(updated, currentUser)) {
      if (updated.name && updated.name !== currentUser.name) {
        updateSubscriber(currentUser.id, { name: updated.name });
        refreshUserData();
      }
    }
    const visible = getVisibleAccountsForUser(currentUser);
    setAccounts(visible);
    setNotice(`Límites y datos de ${updated.name} guardados correctamente.`);
    setTimeout(() => setNotice(null), 4000);
  };

  const displayedAccounts = useMemo(() => {
    if (filterMode === "mine") {
      return accounts.filter((a: ConnectedLinkedInAccount) => (!a.assignedUserId || a.assignedUserId === currentUser.id));
    }
    if (filterMode === "team") {
      return accounts.filter((a: ConnectedLinkedInAccount) => (a.assignedUserId && a.assignedUserId !== currentUser.id));
    }
    return accounts;
  }, [accounts, filterMode, currentUser]);

  const activeAccount = displayedAccounts.find((a: ConnectedLinkedInAccount) => a.id === activeId) || displayedAccounts[0];

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="Cuentas de LinkedIn" />

      {/* Capacidad de Slots SaaS */}
      {!isTeamMember && (
        <SlotsCapacityCard onUpgradeClick={() => setIsUpgradeModalOpen(true)} />
      )}

      {/* Notificación informativa para Miembros del Equipo */}
      {isTeamMember && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-xs font-medium text-blue-700 dark:text-blue-300">
          <Info className="size-4 shrink-0 text-[#0099ff]" />
          <span>
            Estas conectado como <strong>Operador SDR</strong> ({currentUser.name}) en <strong>{currentUser.companyName}</strong>. 
            Solo tienes acceso y visibilidad sobre tu cuenta personal de LinkedIn asignada. La contratacion y gestion de slots corresponde al Administrador.
          </span>
        </div>
      )}

      {/* Notificación temporal */}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 p-3.5 text-sm font-medium text-brand-600 dark:text-brand-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header y Acciones Rápidas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
              {isSuperAdmin
                ? "Cuentas de LinkedIn (Vista Global Super Admin)"
                : isTeamMember
                ? "Mi Cuenta Asignada de LinkedIn"
                : `Cuentas del Workspace (${currentUser.companyName})`}
            </h2>
            <span className="rounded-full bg-[#0099ff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0099ff]">
              {isSuperAdmin ? "Acceso Maestro" : isTeamMember ? "Operador" : "Admin de Cuenta"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isSuperAdmin
              ? "Como Super Admin puedes supervisar todas las cuentas de LinkedIn de todos los clientes y workspaces de la plataforma."
              : isTeamMember
              ? "Gestiona tus limites diarios y tu sincronizacion de mensajes en LinkedIn para tu cuenta asignada."
              : "Como Administrador puedes ver tu cuenta propia y las cuentas asignadas a los miembros de tu equipo dentro de tus slots."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`size-4 ${isSyncing ? "animate-spin text-brand-500" : ""}`} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>

          {/* Botón para conectar cuentas: Solo para Admins (los miembros de equipo no pueden consumir slots) */}
          {!isTeamMember && (
            <button
              onClick={handleConnectClick}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-[#0088e6]"
            >
              <Plus className="size-4" />
              <span>Conectar Cuenta</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Estado del Motor Unipile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <Server className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                    Estado del Motor Cloud LinkedIn
                  </h3>
                  {unipileStatus?.configured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="size-3" />
                      Live API Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                      <Info className="size-3" />
                      Modo Demostracion Seguro
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {unipileStatus?.configured
                    ? `Conectado a nodo seguro: ${unipileStatus.dsn && !unipileStatus.dsn.includes("unipile") ? unipileStatus.dsn : "https://cloud.inhubflow.com (Nodo Seguro)"}. Todas las peticiones van directamente a la infraestructura de enlace.`
                    : "No se detectaron las credenciales de enlace activo en las variables de entorno. Operando en modo de demostracion seguro para previsualizar flujos de trabajo sin interrupciones."}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[#0099ff]" />
                <span>Rotacion inteligente de User-Agent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="size-3.5 text-[#0099ff]" />
                <span>Respeto de pacing limits para proteccion</span>
              </div>
            </div>

            <Link
              href="/support/docs"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0099ff]/10 px-3 py-1 text-xs font-semibold text-[#0099ff] hover:bg-[#0099ff]/20 transition"
            >
              <span>Abrir Sandbox & Webhooks</span>
            </Link>
          </div>
        </div>

        {/* Resumen de Cuentas */}
        <div className="rounded-lg border border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="text-xs leading-5 font-normal tracking-normal uppercase text-gray-400">
            Cuentas Conectadas
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {accounts.length}
            </span>
            <span className="text-xs text-gray-500">perfil(es) activos</span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Cuenta seleccionada para campanas actuales:{" "}
            <span className="font-semibold text-brand-500">
              {activeAccount?.name || "Ninguna"}
            </span>
          </p>
        </div>
      </div>



      {/* Listado de Cuentas Conectadas */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {isTeamMember
                ? `Mi Perfil Vinculado (${displayedAccounts.length})`
                : isSuperAdmin
                ? `Todas las Cuentas del Ecosistema (${displayedAccounts.length})`
                : `Cuentas del Workspace (${displayedAccounts.length})`}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isTeamMember
                ? "Cuenta asignada por el Administrador para prospeccion y envio de DMs."
                : "El Administrador puede ver y supervisar la totalidad de las cuentas vinculadas por su equipo."}
            </p>
          </div>

          {/* Filtros de Cuentas para Administradores */}
          {!isTeamMember && accounts.length > 1 && (
            <div className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/60">
              <button
                onClick={() => setFilterMode("all")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                Todas ({accounts.length})
              </button>
              <button
                onClick={() => setFilterMode("mine")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "mine"
                    ? "bg-[#0099ff] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                Mi Cuenta
              </button>
              <button
                onClick={() => setFilterMode("team")}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  filterMode === "team"
                    ? "bg-[#0099ff] text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                Equipo
              </button>
            </div>
          )}
        </div>

        {displayedAccounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#0099ff]/10 text-[#0099ff]">
              <Plus className="size-6" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
              No hay cuentas disponibles en este filtro
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {isTeamMember
                ? "No tienes cuentas de LinkedIn asignadas actualmente. Contacta al Administrador de tu organizacion."
                : "Conecta una nueva cuenta o ajusta el filtro para visualizar los perfiles vinculados."}
            </p>
            {!isTeamMember && (
              <button
                onClick={handleConnectClick}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0099ff] px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-[#0088e6]"
              >
                <Plus className="size-4" />
                <span>Conectar Cuenta de LinkedIn</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayedAccounts.map((acc) => (
              <LinkedInAccountCard
                key={acc.id}
                account={acc}
                isActive={acc.id === activeId}
                canManage={!isTeamMember}
                onSelectActive={handleSelectActive}
                onDisconnect={handleDisconnect}
                onReconnect={handleReconnect}
                onConfigureLimits={handleOpenConfigureLimits}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Conexión de Cuenta */}
      <ConnectLinkedInModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialAccount(null);
          setModalInitialStep(1);
        }}
        onAccountConnected={handleAccountConnected}
        initialAccount={modalInitialAccount}
        initialStep={modalInitialStep}
      />

      {/* Modal para Configurar Límites y Horario de la Cuenta */}
      <ConfigureAccountLimitsModal
        isOpen={isLimitsModalOpen}
        account={editingLimitsAccount}
        onClose={() => {
          setIsLimitsModalOpen(false);
          setEditingLimitsAccount(null);
        }}
        onSave={handleSaveAccountLimits}
      />

      {/* Modal de Upgrade de Plan si se alcanza el límite de slots */}
      <PlanUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason="capacity_reached"
      />
    </div>
  );
}
