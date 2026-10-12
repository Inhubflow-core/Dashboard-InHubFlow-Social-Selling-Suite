"use client";

import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Send,
  UserCheck,
  Eye,
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

  const visitLimit = account.daily_visit_limit ?? 20;
  const connectionLimit = account.daily_connection_limit ?? 20;
  const messageLimit = account.daily_message_limit ?? 20;

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-theme-xs transition dark:bg-gray-900 ${
        isActive
          ? "border-brand-500 ring-2 ring-brand-500/10"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Informacion de la cuenta */}
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <div className="size-12 rounded-xl bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {account.name.charAt(0).toUpperCase()}
            </div>
            {isHealthy ? (
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-green-500 text-white ring-2 ring-white dark:ring-gray-900">
                <CheckCircle2 className="size-3" />
              </span>
            ) : isCheckpoint ? (
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-white dark:ring-gray-900">
                <AlertTriangle className="size-3" />
              </span>
            ) : (
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-white dark:ring-gray-900">
                <AlertTriangle className="size-3" />
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                {account.name}
              </h4>
              {account.assignedUserName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0099ff]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0099ff]">
                  <UserCheck className="size-3" />
                  <span>{account.assignedUserName}</span>
                </span>
              )}
              {isActive && (
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
                  Activa para Prospeccion
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {account.headline || "Cuenta vinculada mediante Unipile API"}
            </p>

            {/* Resumen de límites y horario al estilo B2B */}
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {account.email ? <span className="font-mono text-gray-600 dark:text-gray-300">{account.email} · </span> : null}
              <span className="font-medium text-brand-600 dark:text-brand-400">{connectionLimit} conn/dia</span> · <span className="font-medium text-blue-600 dark:text-blue-400">{messageLimit} msg/dia</span> · <span className="font-medium text-indigo-600 dark:text-indigo-400">{visitLimit} vis/dia</span>
              {" · "}{account.active_hours_start ?? 9}:00–{account.active_hours_end ?? 18}:00
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1 font-mono">
                <ShieldCheck className="size-3 text-brand-500" />
                Unipile ID: {account.unipileAccountId.substring(0, 16)}...
              </span>
              <span>•</span>
              <span>Sincronizacion: {account.lastSyncAt}</span>
            </div>
          </div>
        </div>

        {/* Estado y Acciones */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {!isActive && isHealthy && (
            <button
              type="button"
              onClick={() => onSelectActive(account.id)}
              className="rounded-lg border border-brand-500/30 bg-brand-50/50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition dark:bg-brand-950/20 dark:text-brand-300"
            >
              Seleccionar como Principal
            </button>
          )}

          {/* Botón para configurar límites diarios (Pacing) */}
          {canManage && onConfigureLimits && (
            <button
              type="button"
              onClick={() => onConfigureLimits(account)}
              title="Configurar limites diarios y horario comercial"
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-500 transition dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Sliders className="size-3.5" />
            </button>
          )}

          {isCheckpoint ? (
            <button
              type="button"
              onClick={() => onReconnect(account.id)}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition"
            >
              Resolver 2FA
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReconnect(account.id)}
              title="Verificar conexion"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <RefreshCw className="size-3.5" />
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => onDisconnect(account.id)}
              title="Desconectar cuenta"
              className="rounded-lg border border-gray-200 p-2 text-red-500 hover:bg-red-50 hover:border-red-200 dark:border-gray-800 dark:hover:bg-red-950/20"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metricas de limites diarios de pacing humano */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800/40">
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Eye className="size-3" />
            <span>Visitas Hoy</span>
          </div>
          <p className="mt-1 font-bold text-xs text-gray-800 dark:text-white">
            {account.dailyActionsCount?.profilesVisited || 0} / {visitLimit} max
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800/40">
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <UserCheck className="size-3" />
            <span>Invitaciones</span>
          </div>
          <p className="mt-1 font-bold text-xs text-gray-800 dark:text-white">
            {account.dailyActionsCount?.invitationsSent || 0} / {connectionLimit} max
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800/40">
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Send className="size-3" />
            <span>DMs Enviados</span>
          </div>
          <p className="mt-1 font-bold text-xs text-gray-800 dark:text-white">
            {account.dailyActionsCount?.messagesSent || 0} / {messageLimit} max
          </p>
        </div>
      </div>
    </div>
  );
}
