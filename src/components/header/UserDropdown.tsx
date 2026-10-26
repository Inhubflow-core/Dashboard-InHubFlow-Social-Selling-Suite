"use client";

import { Link } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/icons";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";
import { getPlanConfig } from "@/lib/saas/plans";
import { getActiveAccountForUser, addStoredAccount } from "@/lib/unipile/store";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
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
  const [mounted, setMounted] = useState(false);
  const [activeLinkedInAccount, setActiveLinkedInAccount] = useState<ConnectedLinkedInAccount | null>(null);
  const t = useTranslations("userDropdown");

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    currentUser,
    sessionUser,
    capacity,
    switchableUsers,
    switchUser,
  } = useAuth();

  useEffect(() => {
    const updateAccount = () => {
      const found = getActiveAccountForUser(currentUser);
      setActiveLinkedInAccount(found);
    };

    updateAccount();

    fetch("/api/unipile/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
          data.accounts.forEach((remoteAcc: ConnectedLinkedInAccount) => {
            addStoredAccount(remoteAcc);
          });
          updateAccount();
        }
      })
      .catch(() => {});

    window.addEventListener("storage", updateAccount);
    window.addEventListener("inhubflow-account-update", updateAccount);
    return () => {
      window.removeEventListener("storage", updateAccount);
      window.removeEventListener("inhubflow-account-update", updateAccount);
    };
  }, [currentUser]);

  const plan = getPlanConfig(currentUser.planTier);

  const isHealthy = Boolean(activeLinkedInAccount && activeLinkedInAccount.status === "OK");
  const needsAttention = Boolean(
    activeLinkedInAccount &&
      (activeLinkedInAccount.status === "CREDENTIALS" ||
        activeLinkedInAccount.status === "CHECKPOINT" ||
        activeLinkedInAccount.status === "STOPPED" ||
        activeLinkedInAccount.status === "ERROR")
  );

  const dotColorClass = isHealthy
    ? "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900"
    : needsAttention
    ? "bg-amber-500 ring-amber-300 dark:ring-amber-900 animate-pulse"
    : "bg-gray-400 ring-gray-200 dark:ring-gray-700";

  const subtitleText = isHealthy
    ? t("linkedInConnected")
    : needsAttention
    ? t("reconnectRequired")
    : currentUser.role === "super_admin"
    ? t("superAdmin")
    : plan.name;

  const subtitleColorClass = isHealthy
    ? "text-emerald-600 dark:text-emerald-400 font-medium"
    : needsAttention
    ? "text-amber-600 dark:text-amber-400 font-semibold"
    : "text-gray-500 dark:text-gray-400";

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

  const renderAvatar = (user: typeof currentUser, size = 40) => {
    const isSuperAdminUser = user.role === "super_admin" || user.email.toLowerCase() === "inhubflow@gmail.com";
    const isRoberto = (user.name || "").toLowerCase().includes("roberto");
    const linkedInPhoto = activeLinkedInAccount?.profilePictureUrl;
    let photo = user.avatarUrl;

    if (!isSuperAdminUser) {
      if (linkedInPhoto && !linkedInPhoto.includes("owner.png")) {
        photo = linkedInPhoto;
      } else if (isRoberto && (!photo || photo.includes("owner.png"))) {
        photo = "https://media.licdn.com/dms/image/v2/D4E03AQETqM_x3Dg7UA/profile-displayphoto-shrink_800_800/B4EZkzyXuFGwAc-/0/1757510466710?e=1794441600&v=beta&t=xum439MlKzB0k_HVMYYLyiSO61_WdqVb8ZRXBmTfuVY";
      }
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
    if (photo && isSuperAdminUser) {
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
          <div className="me-2.5 h-10 w-10 overflow-hidden rounded-full border border-gray-300 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center animate-pulse" />
          <div className="hidden text-left xl:block me-2">
            <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-1" />
            <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
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
        title={`${currentUser.name} (${subtitleText})`}
      >
        <div className="relative me-2.5 shrink-0">
          <span className="h-10 w-10 overflow-hidden rounded-full border border-gray-300 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
            {renderAvatar(currentUser, 40)}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${dotColorClass}`}
          />
        </div>

        <div className="hidden text-left xl:block me-2">
          <span suppressHydrationWarning className="block text-theme-xs font-bold text-gray-900 dark:text-white">
            {currentUser.name}
          </span>
          <span suppressHydrationWarning className={`block text-xs ${subtitleColorClass}`}>
            {subtitleText}
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
        className="absolute mt-4.25 flex w-80 flex-col rounded-lg border border-gray-300 bg-white p-3 shadow-theme-lg ltr:right-0 rtl:right-auto rtl:left-0 dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* Cabecera del usuario activo */}
        <div className="border-b border-gray-300 pb-3 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 overflow-hidden">
                {renderAvatar(currentUser, 40)}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${dotColorClass}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-theme-sm font-bold text-gray-900 dark:text-white">
                {currentUser.name}
              </span>
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                {currentUser.email}
              </span>
            </div>
          </div>

          {/* Badge del Rol y Capacidad del usuario activo */}
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-800/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {currentUser.role === "super_admin" ? (
                <>
                  <ShieldCheck className="size-3.5 text-[#0099ff]" />
                  <span>{t("superAdmin")}</span>
                </>
              ) : (
                <>
                  <Building className="size-3.5 text-[#0099ff]" />
                  <span className="truncate max-w-[130px]">{currentUser.companyName || plan.name}</span>
                </>
              )}
            </div>
            <span className="rounded-lg bg-[#0099ff]/10 px-2 py-0.5 text-xs font-bold text-[#0099ff]">
              {currentUser.role === "super_admin"
                ? t("unlimitedSlots")
                : `${capacity.usedSlots}/${capacity.totalSlots} ${t("slots")}`}
            </span>
          </div>
        </div>

        {/* Enlaces Rápidos del SaaS (Mismo estilo tipográfico que AppSidebar) */}
        <ul className="flex flex-col gap-1 border-b border-gray-300 py-2.5 dark:border-gray-800">
          {sessionUser.role === "super_admin" && (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                href="/admin/subscribers"
                baseClassName=""
                className="group menu-item menu-item-inactive"
              >
                <span className="menu-item-icon-inactive">
                  <ShieldCheck className="size-5" />
                </span>
                <span className="menu-item-text">{t("adminPanel")}</span>
              </DropdownItem>
            </li>
          )}

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/plans"
              baseClassName=""
              className="group menu-item menu-item-inactive"
            >
              <span className="menu-item-icon-inactive">
                <CreditCard className="size-5" />
              </span>
              <span className="menu-item-text">{t("plans")}</span>
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/team"
              baseClassName=""
              className="group menu-item menu-item-inactive"
            >
              <span className="menu-item-icon-inactive">
                <Users className="size-5" />
              </span>
              <span className="menu-item-text">{t("team")}</span>
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/linkedin-accounts"
              baseClassName=""
              className="group menu-item menu-item-inactive"
            >
              <span className="menu-item-icon-inactive">
                <Layers className="size-5" />
              </span>
              <span className="menu-item-text">{t("linkedinAccounts")}</span>
            </DropdownItem>
          </li>
        </ul>

        {/* Cambiar Cuenta (Mismo estilo de cabecera e ítems que AppSidebar) */}
        <div className="border-b border-gray-300 py-2.5 dark:border-gray-800">
          <h2 className="mb-3 flex px-3 text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase justify-start">
            {t("switchAccountTitle")}
          </h2>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {switchableUsers.map((item) => {
              const isSelected = item.isCurrent;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSwitchUser(item.id)}
                  className={`group menu-item justify-between text-start transition-colors ${
                    isSelected ? "menu-item-active" : "menu-item-inactive"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="block truncate text-theme-sm font-medium">
                      {item.name}
                    </span>
                    <span
                      className={`block text-xs font-normal ${
                        isSelected
                          ? "text-brand-500/80 dark:text-brand-400/80"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {item.badgeLabel}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="size-4.5 shrink-0 text-brand-500 dark:text-brand-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Link
          href="/signin"
          onClick={closeDropdown}
          className="group menu-item menu-item-inactive mt-2 justify-center border border-gray-300 dark:border-gray-800"
        >
          <span className="menu-item-icon-inactive">
            <LogOut className="size-4.5" />
          </span>
          <span className="menu-item-text">{t("signOut")}</span>
        </Link>
      </Dropdown>
    </div>
  );
}
