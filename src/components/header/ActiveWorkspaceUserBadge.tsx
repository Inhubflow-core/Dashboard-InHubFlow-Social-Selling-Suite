"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { getActiveAccountForUser } from "@/lib/unipile/store";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";
import { ShieldCheck, UserCheck } from "lucide-react";

export default function ActiveWorkspaceUserBadge() {
  const { currentUser, isSuperAdmin } = useAuth();
  const [activeLinkedInAccount, setActiveLinkedInAccount] = useState<ConnectedLinkedInAccount | null>(null);

  useEffect(() => {
    const updateAccount = () => {
      const found = getActiveAccountForUser(currentUser);
      setActiveLinkedInAccount(found);
    };

    updateAccount();

    window.addEventListener("storage", updateAccount);
    return () => window.removeEventListener("storage", updateAccount);
  }, [currentUser]);

  const hasLinkedIn = Boolean(activeLinkedInAccount && activeLinkedInAccount.status === "OK");
  const initials = (currentUser?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const subtitleText = hasLinkedIn
    ? "LinkedIn Conectado"
    : isSuperAdmin
    ? "Super Admin Master"
    : currentUser.companyName || "Workspace Activo";

  return (
    <Link
      href="/linkedin-accounts"
      className="hidden md:inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/90 px-3 py-1.5 transition hover:border-[#0099ff] hover:bg-white dark:border-gray-800 dark:bg-gray-800/80 dark:hover:border-[#0099ff] dark:hover:bg-gray-800"
      title={`Navegando como: ${currentUser.name} (${subtitleText})`}
    >
      <div className="relative shrink-0">
        <div className="size-7 rounded-lg bg-[#0099ff] flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-xs">
          {currentUser.avatarUrl && currentUser.avatarUrl !== "/images/user/owner.png" ? (
            <Image
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              width={28}
              height={28}
              className="size-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${
            hasLinkedIn ? "bg-green-500" : "bg-[#0099ff]"
          }`}
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
        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[130px] xl:max-w-[170px]">
          {subtitleText}
        </span>
      </div>
    </Link>
  );
}
