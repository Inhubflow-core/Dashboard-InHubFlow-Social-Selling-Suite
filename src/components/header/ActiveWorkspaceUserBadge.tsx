"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { getActiveAccountForUser, addStoredAccount } from "@/lib/unipile/store";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import { ShieldCheck } from "lucide-react";

export default function ActiveWorkspaceUserBadge() {
  const { currentUser, isSuperAdmin } = useAuth();
  const [activeLinkedInAccount, setActiveLinkedInAccount] = useState<ConnectedLinkedInAccount | null>(null);

  useEffect(() => {
    const updateAccount = () => {
      const found = getActiveAccountForUser(currentUser);
      setActiveLinkedInAccount(found);
    };

    updateAccount();

    // Detección real en vivo consultando Unipile
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

  const isHealthy = Boolean(activeLinkedInAccount && activeLinkedInAccount.status === "OK");
  const needsAttention = Boolean(
    activeLinkedInAccount &&
      (activeLinkedInAccount.status === "CREDENTIALS" ||
        activeLinkedInAccount.status === "CHECKPOINT" ||
        activeLinkedInAccount.status === "STOPPED" ||
        activeLinkedInAccount.status === "ERROR")
  );

  const initials = (currentUser?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dotColorClass = isHealthy
    ? "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900"
    : needsAttention
    ? "bg-amber-500 ring-amber-300 dark:ring-amber-900 animate-pulse"
    : "bg-gray-400 ring-gray-200 dark:ring-gray-700";

  const subtitleText = isHealthy
    ? "LinkedIn Conectado"
    : needsAttention
    ? "Reconexión requerida"
    : isSuperAdmin
    ? "Super Admin Master"
    : currentUser.companyName || "Workspace Activo";

  const subtitleColorClass = isHealthy
    ? "text-emerald-600 dark:text-emerald-400 font-medium"
    : needsAttention
    ? "text-amber-600 dark:text-amber-400 font-semibold"
    : "text-gray-400 font-medium";

  const tooltipText = isHealthy
    ? `Navegando como: ${currentUser.name} (LinkedIn Conectado y Activo)`
    : needsAttention
    ? `Atención requerida: La cuenta de LinkedIn (${activeLinkedInAccount?.name}) requiere reconexión`
    : `Navegando como: ${currentUser.name} (${subtitleText})`;

  return (
    <Link
      href="/linkedin-accounts"
      className={`hidden md:inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 transition ${
        needsAttention
          ? "border-amber-300 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20"
          : "border-gray-200 bg-gray-50/90 hover:border-[#0099ff] hover:bg-white dark:border-gray-800 dark:bg-gray-800/80 dark:hover:border-[#0099ff] dark:hover:bg-gray-800"
      }`}
      title={tooltipText}
    >
      <div className="relative shrink-0">
        <div className="size-8 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 overflow-hidden shadow-xs">
          {currentUser.avatarUrl && currentUser.avatarUrl.includes("owner") ? (
            <Image
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              width={32}
              height={32}
              className="size-full object-cover"
            />
          ) : (
            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${dotColorClass}`}
        />
      </div>

      <div className="flex flex-col text-left leading-tight min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 max-w-[130px] xl:max-w-[170px] truncate">
            {currentUser.name}
          </span>
          {isSuperAdmin && (
            <span title="Super Admin Master" className="inline-flex">
              <ShieldCheck className="size-3 text-[#0099ff] shrink-0" />
            </span>
          )}
        </div>
        <span className={`text-[10px] truncate max-w-[130px] xl:max-w-[170px] ${subtitleColorClass}`}>
          {subtitleText}
        </span>
      </div>
    </Link>
  );
}
