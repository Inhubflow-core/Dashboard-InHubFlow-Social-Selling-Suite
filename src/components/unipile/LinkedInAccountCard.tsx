"use client";

import {
  Check,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  UserCheck,
  Sliders,
} from "lucide-react";
import type { ConnectedLinkedInAccount } from "@/lib/unipile/types";

interface LinkedInAccountCardProps {
  account: ConnectedLinkedInAccount;
  isActive: boolean;
  canManage?: boolean;
  onSelectActive: (id: string) => void;
  onDisconnect: (id: string) => void;
  onReconnect: (id: string) => void;
  onConfigureLimits?: (account: ConnectedLinkedInAccount) => void;
}

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export default function LinkedInAccountCard({
  account,
  isActive,
  canManage = true,
  onSelectActive,
  onDisconnect,
  onReconnect,
  onConfigureLimits,
}: LinkedInAccountCardProps) {
  const isHealthy = account.status === "OK";
  const isCheckpoint = account.status === "CHECKPOINT";
  const isCredentials = account.status === "CREDENTIALS";

  const visitLimit = account.daily_visit_limit ?? 20;
  const connectionLimit = account.daily_connection_limit ?? 20;
  const messageLimit = account.daily_message_limit ?? 20;

  return (
    <div
      onClick={() => {
        if (!isActive && isHealthy) {
          onSelectActive(account.id);
        }
      }}
      className={`flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 border rounded-lg shadow-xs transition-colors cursor-pointer ${
        isActive
          ? "border-brand-500 ring-2 ring-brand-500/15"
          : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
      }`}
    >
      {/* Avatar compacto (10x10) idéntico a B2B */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 shrink-0 border border-gray-300 dark:border-gray-700">
        {account.profilePictureUrl && account.profilePictureUrl !== "/images/user/owner.png" ? (
          <img
            src={account.profilePictureUrl}
            alt={account.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.innerText = account.name.charAt(0).toUpperCase();
              }
            }}
          />
        ) : (
          account.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Información central en 2 líneas compactas idéntica a B2B */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium text-gray-800 dark:text-white/90 truncate">
            {account.name}
          </p>
          {isActive && (
            <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-300 shrink-0">
              Activa
            </span>
          )}
          {account.assignedUserName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0099ff]/10 px-2 py-0.5 text-xs font-bold text-[#0099ff] shrink-0">
              <UserCheck className="size-2.5" />
              <span>{account.assignedUserName}</span>
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
          {account.email ? `${account.email} · ` : ""}
          {connectionLimit} conn/day · {messageLimit} msg/day · {visitLimit} inmail/day
          {" · "}
          {fmtHour(account.active_hours_start ?? 9)}–{fmtHour(account.active_hours_end ?? 18)} (
          {account.timezone ?? "Europe/Madrid"})
        </p>
      </div>

      {/* Badges de estado y botones de acción a la derecha idénticos a B2B */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge 1: Activo / Inactivo */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isHealthy
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {isHealthy ? (
            <>
              <Check className="size-2.5" /> Activo
            </>
          ) : (
            "Inactivo"
          )}
        </span>

        {/* Badge 2: Estado de Sincronización */}
        {isHealthy ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            title="Cuenta de LinkedIn sincronizada y lista para prospección"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectado
          </span>
        ) : isCheckpoint || isCredentials ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            title="Inicia sesión o resuelve el código 2FA para renovar la conexión"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Reconexión requerida
          </span>
        ) : (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700"
            title="Conecta esta cuenta para sincronizar con LinkedIn"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Sin conectar
          </span>
        )}

        {/* Botón de Conexión / Reconexión */}
        {isCheckpoint ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all cursor-pointer shadow-xs"
            onClick={() => onReconnect(account.id)}
          >
            <AlertTriangle className="size-3.5" /> Resolver 2FA
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-all cursor-pointer"
            onClick={() => onReconnect(account.id)}
          >
            <ShieldCheck className="size-3.5" /> {isHealthy ? "Reconectar" : "Conectar LinkedIn"}
          </button>
        )}

        {/* Botón de Configuración de Límites (Sliders / Lápiz) */}
        {canManage && onConfigureLimits && (
          <button
            type="button"
            className="inline-flex items-center p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => onConfigureLimits(account)}
            title="Editar límites y horario de prospección"
          >
            <Sliders className="size-3.5" />
          </button>
        )}

        {/* Botón de Eliminación / Desconexión */}
        {canManage && (
          <button
            type="button"
            className="inline-flex items-center p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
            onClick={() => onDisconnect(account.id)}
            title="Eliminar cuenta"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
