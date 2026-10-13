import type { ConnectedLinkedInAccount } from "./types";
import type { SaaSUser } from "../saas/types";
import { getStoredTeamMembers } from "../saas/store";

const STORAGE_KEY = "inhubflow_linkedin_accounts";
const ACTIVE_ACCOUNT_KEY = "inhubflow_active_linkedin_account_id";

// Demo records are fixtures, not connected LinkedIn accounts. Keep them opt-in so
// an empty sandbox cannot look like a live Unipile connection.
export const initialLinkedInAccounts: ConnectedLinkedInAccount[] = [];

export function getStoredAccounts(): ConnectedLinkedInAccount[] {
  if (typeof window === "undefined") return initialLinkedInAccounts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purgar cualquier dato falso o demo remanente
    const cleanAccounts = parsed.filter(
      (a: ConnectedLinkedInAccount) =>
        a &&
        !a.id?.startsWith("demo-") &&
        !a.unipileAccountId?.startsWith("demo-") &&
        !a.name?.toLowerCase().includes("(demo)")
    );

    // Deduplicación inteligente por identidad (email o nombre normalizado)
    const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const deduplicated: ConnectedLinkedInAccount[] = [];

    for (const acc of cleanAccounts) {
      const accEmail = acc.email?.trim().toLowerCase();
      const accNorm = norm(acc.name);

      const existingIndex = deduplicated.findIndex((d) => {
        if (d.id === acc.id || d.unipileAccountId === acc.unipileAccountId) return true;
        const dEmail = d.email?.trim().toLowerCase();
        if (accEmail && dEmail && accEmail === dEmail) return true;
        const dNorm = norm(d.name);
        if (accNorm && dNorm && accNorm === dNorm) return true;
        return false;
      });

      if (existingIndex === -1) {
        deduplicated.push(acc);
      } else {
        const existing = deduplicated[existingIndex];
        // Si el actual está conectado (OK) y el existente no, o el actual tiene email y foto, priorizar datos activos
        const currentIsPreferred =
          (acc.status === "OK" && existing.status !== "OK") ||
          (Boolean(acc.email) && !existing.email) ||
          (Boolean(acc.profilePictureUrl && acc.profilePictureUrl !== "/images/user/owner.png") &&
            (!existing.profilePictureUrl || existing.profilePictureUrl === "/images/user/owner.png"));

        const base = currentIsPreferred ? acc : existing;
        const fallback = currentIsPreferred ? existing : acc;

        deduplicated[existingIndex] = {
          ...fallback,
          ...base,
          // Conservar siempre el id estable del slot
          id: existing.id || acc.id,
          // Unipile ID activo
          unipileAccountId: base.unipileAccountId || fallback.unipileAccountId,
          // Límites de seguridad preservados
          daily_connection_limit: fallback.daily_connection_limit ?? base.daily_connection_limit ?? 20,
          daily_message_limit: fallback.daily_message_limit ?? base.daily_message_limit ?? 20,
          daily_visit_limit: fallback.daily_visit_limit ?? base.daily_visit_limit ?? 20,
          active_hours_start: fallback.active_hours_start ?? base.active_hours_start ?? 9,
          active_hours_end: fallback.active_hours_end ?? base.active_hours_end ?? 18,
          timezone: fallback.timezone ?? base.timezone ?? "Europe/Madrid",
          working_days: fallback.working_days ?? base.working_days ?? "1,2,3,4,5",
          ownerId: base.ownerId || fallback.ownerId,
          assignedUserId: base.assignedUserId || fallback.assignedUserId,
          assignedUserName: base.assignedUserName || fallback.assignedUserName,
        };
      }
    }

    if (deduplicated.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return [];
  }
}

export function saveStoredAccounts(accounts: ConnectedLinkedInAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

/**
 * Filtra las cuentas según el rol y permisos del usuario (exactamente como inhubflow-b2b):
 * 1. Super Admin: Ve TODAS las cuentas de toda la plataforma (Roberto OrSe).
 * 2. Admin de Cuenta / Workspace Owner: Ve su propia cuenta y las de TODOS los miembros de su equipo (Team).
 * 3. Miembro del Equipo (Operador SDR / Team): SOLO puede ver su PROPIO slot asignado.
 */
export function getVisibleAccountsForUser(user: SaaSUser): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();

  // 1. Super Admin: Roberto ve todas las cuentas globales de la plataforma
  if (user.role === "super_admin" || user.email.toLowerCase() === "inhubflow@gmail.com") {
    return accounts;
  }

  // 2. Miembro del Equipo (Team / Member): SOLO puede ver su PROPIO slot asignado
  if (user.role === "member" || (user.ownerId && user.ownerId !== user.id)) {
    return accounts.filter((a) => {
      const matchesAssignedUser = Boolean(a.assignedUserId && a.assignedUserId === user.id);
      const matchesAssignedAccount = Boolean(user.assignedAccountId && a.id === user.assignedAccountId);
      const matchesEmail = Boolean(a.email && a.email.toLowerCase() === user.email.toLowerCase());
      return matchesAssignedUser || matchesAssignedAccount || matchesEmail;
    });
  }

  // 3. Admin (Client Admin): Puede ver todas las cuentas de su workspace y de su equipo (Team)
  const teamMembers = typeof window !== "undefined" ? getStoredTeamMembers(user.id) : [];
  const teamMemberUserIds = new Set(teamMembers.map((m) => m.id));
  const teamAssignedAccountIds = new Set(
    teamMembers.map((m) => m.assignedAccountId).filter(Boolean) as string[]
  );

  return accounts
    .filter((a) => {
      // Cuenta propia del Admin
      if (a.ownerId === user.id || a.assignedUserId === user.id) return true;
      // Cuenta asignada a algún colaborador de su equipo
      if (a.assignedUserId && teamMemberUserIds.has(a.assignedUserId)) return true;
      if (teamAssignedAccountIds.has(a.id)) return true;
      // Cuenta sin owner asignado (fallback para sandbox / demo)
      if (!a.ownerId) return true;
      return false;
    })
    .map((acc) => {
      // Enriquecer el nombre del asignado si corresponde a un miembro de su equipo
      const assignedMember = teamMembers.find((m) => m.assignedAccountId === acc.id || m.id === acc.assignedUserId);
      if (assignedMember) {
        return {
          ...acc,
          assignedUserName: `${assignedMember.name} (Team SDR)`,
        };
      }
      if (acc.assignedUserId === user.id || acc.ownerId === user.id) {
        return {
          ...acc,
          assignedUserName: acc.assignedUserName || `${user.name} (Admin Principal)`,
        };
      }
      return acc;
    });
}

/**
 * Retorna la cuenta activa permitida para el usuario actual.
 * Si es un miembro de equipo, garantiza que solo sea su propio slot asignado.
 */
export function getActiveAccountForUser(user: SaaSUser): ConnectedLinkedInAccount | null {
  const visible = getVisibleAccountsForUser(user);
  if (visible.length === 0) return null;
  const activeId = getActiveAccountId();
  const found = visible.find((a) => a.id === activeId);
  return found || visible[0];
}

export function getActiveAccountId(): string {
  if (typeof window === "undefined") return initialLinkedInAccounts[0]?.id || "";
  try {
    const saved = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (saved) return saved;
    const accounts = getStoredAccounts();
    const firstId = accounts[0]?.id || "";
    if (firstId) localStorage.setItem(ACTIVE_ACCOUNT_KEY, firstId);
    return firstId;
  } catch {
    return initialLinkedInAccounts[0]?.id || "";
  }
}

export function setActiveAccountId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  } catch {
    // ignore
  }
}

export function addStoredAccount(newAccount: ConnectedLinkedInAccount): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();
  const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const newEmail = newAccount.email?.trim().toLowerCase();
  const newNorm = norm(newAccount.name);

  // Buscar coincidencia por id, unipileAccountId, email exacto o nombre normalizado
  const exists = accounts.find((a) => {
    if (a.id === newAccount.id || a.unipileAccountId === newAccount.unipileAccountId) return true;
    const aEmail = a.email?.trim().toLowerCase();
    if (newEmail && aEmail && newEmail === aEmail) return true;
    const aNorm = norm(a.name);
    if (newNorm && aNorm && newNorm === aNorm) return true;
    return false;
  });

  let updated: ConnectedLinkedInAccount[];

  if (exists) {
    // Si ya existe (mismo ID o misma persona/email), actualizar su slot y descartar cualquier duplicado huérfano
    updated = accounts
      .filter((a) => {
        if (a.id === exists.id) return true;
        const aEmail = a.email?.trim().toLowerCase();
        if (newEmail && aEmail && newEmail === aEmail) return false;
        const aNorm = norm(a.name);
        if (newNorm && aNorm && newNorm === aNorm) return false;
        return true;
      })
      .map((a) =>
        a.id === exists.id
          ? {
              ...a,
              ...newAccount,
              // Mantener id del slot existente
              id: a.id,
              // Unipile ID actualizado
              unipileAccountId: newAccount.unipileAccountId || a.unipileAccountId,
              // Estado actualizado
              status: newAccount.status || a.status,
              // Mantener límites configurados por el usuario si ya existían
              daily_connection_limit: a.daily_connection_limit ?? newAccount.daily_connection_limit ?? 20,
              daily_message_limit: a.daily_message_limit ?? newAccount.daily_message_limit ?? 20,
              daily_visit_limit: a.daily_visit_limit ?? newAccount.daily_visit_limit ?? 20,
              active_hours_start: a.active_hours_start ?? newAccount.active_hours_start ?? 9,
              active_hours_end: a.active_hours_end ?? newAccount.active_hours_end ?? 18,
              timezone: a.timezone ?? newAccount.timezone ?? "Europe/Madrid",
              working_days: a.working_days ?? newAccount.working_days ?? "1,2,3,4,5",
              ownerId: a.ownerId || newAccount.ownerId,
              assignedUserId: a.assignedUserId || newAccount.assignedUserId,
              assignedUserName: a.assignedUserName || newAccount.assignedUserName,
            }
          : a
      );
  } else {
    updated = [
      {
        daily_connection_limit: 20,
        daily_message_limit: 20,
        daily_visit_limit: 20,
        active_hours_start: 9,
        active_hours_end: 18,
        timezone: "Europe/Madrid",
        working_days: "1,2,3,4,5",
        ...newAccount,
      },
      ...accounts,
    ];
  }

  saveStoredAccounts(updated);
  setActiveAccountId(exists ? exists.id : newAccount.id);
  return updated;
}

export function updateStoredAccount(id: string, updates: Partial<ConnectedLinkedInAccount>): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();
  const updated = accounts.map((a) => (a.id === id || a.unipileAccountId === id ? { ...a, ...updates } : a));
  saveStoredAccounts(updated);
  return updated;
}

export function removeStoredAccount(id: string): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();
  const filtered = accounts.filter((a) => a.id !== id && a.unipileAccountId !== id);
  saveStoredAccounts(filtered);
  const currentActive = getActiveAccountId();
  if (currentActive === id && filtered.length > 0) setActiveAccountId(filtered[0].id);
  return filtered;
}

export function updateStoredAccountStatus(id: string, status: ConnectedLinkedInAccount["status"]): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();
  const updated = accounts.map((a) => (a.id === id || a.unipileAccountId === id ? { ...a, status, lastSyncAt: "Recien sincronizado" } : a));
  saveStoredAccounts(updated);
  return updated;
}

export function assignAccountToMember(accountId: string, memberId: string, memberName: string): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();
  const updated = accounts.map((a) => a.id === accountId
    ? { ...a, assignedUserId: memberId, assignedUserName: memberName }
    : a);
  saveStoredAccounts(updated);
  return updated;
}
