"use client";

import { Link } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/icons";
import Image from "next/image";
import { useState } from "react";
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
} from "lucide-react";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("userDropdown");

  const { currentUser, isSuperAdmin, capacity, switchableUsers, switchUser } = useAuth();
  const plan = getPlanConfig(currentUser.planTier);

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

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
      >
        <span className="me-2.5 h-10 w-10 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
          {currentUser.avatarUrl && currentUser.avatarUrl.includes("owner") ? (
            <Image
              width={40}
              height={40}
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
          )}
        </span>

        <div className="hidden text-left xl:block me-2">
          <span className="block text-theme-xs font-bold text-gray-900 dark:text-white">
            {currentUser.name}
          </span>
          <span className="block text-[10px] text-gray-500 dark:text-gray-400">
            {isSuperAdmin ? t("superAdmin") : plan.name}
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
        className="absolute mt-4.25 flex w-76 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg ltr:right-0 rtl:right-auto rtl:left-0 dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* Cabecera del usuario actual */}
        <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 overflow-hidden">
              {currentUser.avatarUrl && currentUser.avatarUrl.includes("owner") ? (
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  width={40}
                  height={40}
                  className="size-full rounded-xl object-cover"
                />
              ) : (
                <span>{currentUser.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-theme-sm font-bold text-gray-900 dark:text-white">
                {currentUser.name}
              </span>
              <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">
                {currentUser.email}
              </span>
            </div>
          </div>

          {/* Badge del Rol y Capacidad */}
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              {isSuperAdmin ? (
                <>
                  <ShieldCheck className="size-3.5 text-[#0099ff]" />
                  <span>{t("superAdmin")}</span>
                </>
              ) : (
                <>
                  <Building className="size-3.5 text-[#0099ff]" />
                  <span className="truncate max-w-[130px]">{currentUser.companyName}</span>
                </>
              )}
            </div>
            <span className="rounded bg-[#0099ff]/10 px-2 py-0.5 text-[10px] font-bold text-[#0099ff]">
              {isSuperAdmin ? t("unlimitedSlots") : `${capacity.usedSlots}/${capacity.totalSlots} ${t("slots")}`}
            </span>
          </div>
        </div>

        {/* Enlaces Rápidos del SaaS */}
        <ul className="flex flex-col gap-1 border-b border-gray-100 py-2.5 dark:border-gray-800">
          {isSuperAdmin && (
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

        {/* Selector de Cuentas / Workspace */}
        <div className="border-b border-gray-100 py-2.5 dark:border-gray-800">
          <div className="flex items-center justify-between px-2.5 mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {isSuperAdmin
                ? "Conmutar Suscriptores"
                : currentUser.role === "client_admin"
                ? `Slots de mi Equipo (${capacity.usedSlots}/${capacity.totalSlots})`
                : "Mi Slot Asignado"}
            </span>
            <span className="text-[9px] font-semibold text-[#0099ff] bg-[#0099ff]/10 px-1.5 py-0.5 rounded">
              {isSuperAdmin ? "Planes SaaS" : `${capacity.totalSlots} Slots`}
            </span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto">
            {switchableUsers.map((item) => {
              const isSelected = item.isCurrent;

              if (item.isMasterReturn) {
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
