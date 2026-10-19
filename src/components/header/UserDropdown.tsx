"use client";

import { Link } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/icons";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { getPlanConfig } from "@/lib/saas/plans";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  Layers,
  Users,
  CreditCard,
  Check,
  LogOut,
  Building,
  UserCheck,
  ArrowLeftRight,
} from "lucide-react";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("userDropdown");

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    sessionUser,
    currentUser,
    isImpersonating,
    isSuperAdmin,
    capacity,
    switchableUsers,
    switchUser,
    resetToSessionUser,
    switchSessionUser,
  } = useAuth();

  const plan = getPlanConfig(sessionUser.planTier);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleSwitchUser = (userId: string) => {
    switchUser(userId);
    closeDropdown();
  };

  const handleResetToSession = () => {
    resetToSessionUser();
    closeDropdown();
  };

  const handleSwitchSession = (newSessionId: string) => {
    switchSessionUser(newSessionId);
    closeDropdown();
  };

  const renderAvatar = (user: typeof sessionUser, size = 40) => {
    const isSuperAdmin = user.role === "super_admin" || user.email.toLowerCase() === "inhubflow@gmail.com";
    const isRoberto = (user.name || "").toLowerCase().includes("roberto");
    let photo = user.avatarUrl;
    if (isRoberto && (!photo || photo.includes("owner.png"))) {
      photo = "https://media.licdn.com/dms/image/v2/D4E03AQETqM_x3Dg7UA/profile-displayphoto-shrink_800_800/B4EZkzyXuFGwAc-/0/1757510466710?e=1793836800&v=beta&t=ti_Vff5L4ZlFHs8iYo8trtcyT1hKT4EikEtlwieUi0U";
    }

    if (photo && photo.startsWith("http")) {
      return (
        <img
          src={photo}
          alt={user.name}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    if (photo && isSuperAdmin) {
      return (
        <Image
          width={size}
          height={size}
          src={photo}
          alt={user.name}
          className="size-full object-cover"
        />
      );
    }
    return <span>{user.name.charAt(0).toUpperCase()}</span>;
  };

  if (!mounted) {
    return (
      <div className="relative">
        <div className="flex items-center text-gray-700 dark:text-gray-400">
          <div className="me-2.5 h-10 w-10 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center animate-pulse" />
          <div className="hidden text-left xl:block me-2">
            <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
            <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        suppressHydrationWarning
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
        title={`Cuenta Titular Logada: ${sessionUser.name}`}
      >
        <span className="me-2.5 h-10 w-10 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
          {renderAvatar(sessionUser, 40)}
        </span>

        <div className="hidden text-left xl:block me-2">
          <span suppressHydrationWarning className="block text-theme-xs font-bold text-gray-900 dark:text-white">
            {sessionUser.name}
          </span>
          <span suppressHydrationWarning className="block text-[10px] text-gray-500 dark:text-gray-400">
            {isSuperAdmin && sessionUser.role === "super_admin" ? t("superAdmin") : plan.name}
          </span>
        </div>

        <ChevronDownIcon
          className={`size-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute mt-4.25 flex w-80 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg ltr:right-0 rtl:right-auto rtl:left-0 dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* Cabecera de la cuenta titular logada */}
        <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 overflow-hidden">
              {renderAvatar(sessionUser, 40)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-theme-sm font-bold text-gray-900 dark:text-white">
                {sessionUser.name}
              </span>
              <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                {sessionUser.email}
              </span>
            </div>
          </div>

          {/* Badge del Rol y Capacidad de la cuenta titular */}
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              {sessionUser.role === "super_admin" ? (
                <>
                  <ShieldCheck className="size-3.5 text-[#0099ff]" />
                  <span>{t("superAdmin")}</span>
                </>
              ) : (
                <>
                  <Building className="size-3.5 text-[#0099ff]" />
                  <span className="truncate max-w-[130px]">{sessionUser.companyName}</span>
                </>
              )}
            </div>
            <span className="rounded bg-[#0099ff]/10 px-2 py-0.5 text-[10px] font-bold text-[#0099ff]">
              {sessionUser.role === "super_admin"
                ? t("unlimitedSlots")
                : `${capacity.usedSlots}/${capacity.totalSlots} ${t("slots")}`}
            </span>
          </div>

          {/* Banner de Impersonación: Cuando navega como otro usuario */}
          {isImpersonating && (
            <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 dark:bg-amber-500/15">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Estás conectado como:
                  </span>
                  <span className="block text-xs font-bold text-gray-900 dark:text-white truncate">
                    {currentUser.name}
                  </span>
                </div>
                <button
                  onClick={handleResetToSession}
                  className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-amber-600 transition"
                >
                  Volver a mi cuenta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enlaces Rápidos del SaaS */}
        <ul className="flex flex-col gap-1 border-b border-gray-100 py-2.5 dark:border-gray-800">
          {sessionUser.role === "super_admin" && (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/admin/subscribers"
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0099ff] hover:bg-[#0099ff]/10"
              >
                <ShieldCheck className="size-4" />
                <span>{t("adminPanel")}</span>
              </DropdownItem>
            </li>
          )}

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/plans"
              className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <CreditCard className="size-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white" />
              <span>{t("plans")}</span>
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/team"
              className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <Users className="size-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white" />
              <span>{t("team")}</span>
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/linkedin-accounts"
              className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <Layers className="size-4 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white" />
              <span>{t("linkedinAccounts")}</span>
            </DropdownItem>
          </li>
        </ul>

        {/* Conmutación de Usuarios (Navegar como) */}
        <div className="border-b border-gray-100 py-2.5 dark:border-gray-800">
          <div className="flex items-center justify-between px-2.5 mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {sessionUser.role === "super_admin"
                ? "Navegar como Suscriptor"
                : sessionUser.role === "client_admin"
                ? `Slots de mi Equipo (${capacity.usedSlots}/${capacity.totalSlots})`
                : "Mi Slot Asignado"}
            </span>
            <span className="text-[9px] font-semibold text-[#0099ff] bg-[#0099ff]/10 px-1.5 py-0.5 rounded">
              {sessionUser.role === "super_admin" ? "SaaS Multi-Tenant" : `${capacity.totalSlots} Slots`}
            </span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto">
            {switchableUsers.map((item) => {
              const isSelected = item.isCurrent;

              if (item.isMasterReturn && isImpersonating) {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSwitchUser(item.id)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-xs font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 transition-colors border border-amber-500/30 mb-1"
                  >
                    <div className="truncate flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 shrink-0 text-amber-500" />
                      <div className="truncate">
                        <span className="block truncate font-bold">{item.name}</span>
                        <span className="block text-[10px] text-amber-600/80 dark:text-amber-400/80">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleSwitchUser(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors ${
                    isSelected
                      ? "bg-[#0099ff]/10 text-[#0099ff] font-semibold"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="truncate">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500">
                      {item.badgeLabel} {item.subtitle ? `• ${item.subtitle}` : ""}
                    </span>
                  </div>
                  {isSelected && <Check className="size-3.5 shrink-0 text-[#0099ff]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alternar Cuenta Titular Logada (SuperAdmin <-> Roberto OrSe Agencia) */}
        <div className="border-b border-gray-100 py-2 dark:border-gray-800">
          {sessionUser.role === "super_admin" ? (
            <button
              onClick={() => handleSwitchSession("usr-client-roberto-agencia")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              title="Cambiar sesión principal para operar directamente como Admin"
            >
              <ArrowLeftRight className="size-3.5 text-[#0099ff]" />
              <span>Iniciar sesión titular como: Roberto OrSe Agencia (Admin)</span>
            </button>
          ) : (
            <button
              onClick={() => handleSwitchSession("usr-super-admin-01")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              title="Volver a iniciar sesión titular como Super Admin"
            >
              <ArrowLeftRight className="size-3.5 text-[#0099ff]" />
              <span>Iniciar sesión titular como: SuperAdmin</span>
            </button>
          )}
        </div>

        <Link
          href="/signin"
          onClick={closeDropdown}
          className="group mt-2 flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <LogOut className="size-3.5" />
          <span>{t("signOut")}</span>
        </Link>
      </Dropdown>
    </div>
  );
}
