"use client";

import { useClickOutside } from "@/hooks/useClickOutside";
import { getLanguage, languages } from "@/i18n/languages";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@/icons";
import { cn } from "@/utils";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { getPlanConfig } from "@/lib/saas/plans";
import {
  ShieldCheck,
  Layers,
  Users,
  CreditCard,
  UserCheck,
  Check,
  LogOut,
  Building,
} from "lucide-react";

export default function UserDropdown() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const subDropdownRef = useRef<HTMLLIElement>(null);

  const { currentUser, isSuperAdmin, capacity, allUsers, switchUser } = useAuth();
  const plan = getPlanConfig(currentUser.planTier);

  const currentLang = getLanguage(locale);
  const CurrentFlagIcon = currentLang.FlagIcon;

  useClickOutside(subDropdownRef, () => {
    setIsSubDropdownOpen(false);
  });

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsSubDropdownOpen(false);
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsSubDropdownOpen(false);
  };

  const handleSelectLanguage = (id: Locale) => {
    router.replace(pathname, { locale: id });
    setIsSubDropdownOpen(false);
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
        <span className="me-2.5 h-10 w-10 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <Image
            width={40}
            height={40}
            src={currentUser.avatarUrl || "/images/user/owner.png"}
            alt={currentUser.name}
            className="h-full w-full object-cover"
          />
        </span>

        <div className="hidden text-left xl:block me-2">
          <span className="block text-theme-xs font-bold text-gray-900 dark:text-white">
            {currentUser.name}
          </span>
          <span className="block text-[10px] text-gray-500 dark:text-gray-400">
            {isSuperAdmin ? "Super Admin" : plan.name}
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
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#0099ff]/10 font-bold text-[#0099ff]">
              {currentUser.name.substring(0, 2).toUpperCase()}
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
                  <span>Super Admin</span>
                </>
              ) : (
                <>
                  <Building className="size-3.5 text-[#0099ff]" />
                  <span className="truncate max-w-[130px]">{currentUser.companyName}</span>
                </>
              )}
            </div>
            <span className="rounded bg-[#0099ff]/10 px-2 py-0.5 text-[10px] font-bold text-[#0099ff]">
              {isSuperAdmin ? "Slots Ilimitados" : `${capacity.usedSlots}/${capacity.totalSlots} Slots`}
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
                <span>Panel Super Admin (Suscriptores)</span>
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
              <span>Planes & Suscripcion</span>
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
              <span>Equipo & Operadores</span>
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
              <span>Cuentas de LinkedIn</span>
            </DropdownItem>
          </li>
        </ul>

        {/* Selector de Cuentas / Workspace (Auditoría y Simulación SaaS) */}
        <div className="border-b border-gray-100 py-2.5 dark:border-gray-800">
          <div className="px-2.5 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Conmutar Cuenta / Workspace
          </div>
          <div className="space-y-1">
            {allUsers.map((u) => {
              const isSelected = u.id === currentUser.id;
              const uPlan = getPlanConfig(u.planTier);

              return (
                <button
                  key={u.id}
                  onClick={() => handleSwitchUser(u.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors ${
                    isSelected
                      ? "bg-[#0099ff]/10 text-[#0099ff] font-semibold"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="truncate">
                    <span className="block truncate">{u.name}</span>
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500">
                      {u.role === "super_admin" ? "Super Admin" : `${uPlan.name} (${u.slotsLimit} slots)`}
                    </span>
                  </div>
                  {isSelected && <Check className="size-3.5 shrink-0 text-[#0099ff]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-gray-100 py-2.5 dark:border-gray-800">
          <div className="px-2.5 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t("language")}
          </div>
          <div className="flex gap-1">
            {languages.map((language) => (
              <button
                key={language.id}
                type="button"
                onClick={() => handleSelectLanguage(language.id)}
                aria-pressed={locale === language.id}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0099ff]",
                  locale === language.id
                    ? "bg-[#0099ff]/10 text-[#0099ff]"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                )}
              >
                {language.shortName}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/signin"
          onClick={closeDropdown}
          className="group mt-2 flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <LogOut className="size-3.5" />
          <span>Cerrar Sesion</span>
        </Link>
      </Dropdown>
    </div>
  );
}
