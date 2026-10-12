import type { ConnectedLinkedInAccount } from "./types";
import type { SaaSUser } from "../saas/types";
import { getStoredTeamMembers } from "../saas/store";

const STORAGE_KEY = "inhubflow_linkedin_accounts";
const ACTIVE_ACCOUNT_KEY = "inhubflow_active_linkedin_account_id";

// Demo records are fixtures, not connected LinkedIn accounts. Keep them opt-in so
// an empty sandbox cannot look like a live Unipile connection.
export const initialLinkedInAccounts: ConnectedLinkedInAccount[] = [];

function getDemoAccounts(): ConnectedLinkedInAccount[] {
  if (process.env.NEXT_PUBLIC_INHUBFLOW_DEMO_DATA !== "true") return [];
  return [
    {
      id: "demo-acc-roberto",
      unipileAccountId: "demo-up-acc-roberto",
      name: "Roberto OrSe (Demo)",
      email: "inhubflow@gmail.com",
      headline: "Cuenta simulada de Social Selling",
      profilePictureUrl: "/images/user/owner.png",
      publicProfileUrl: "https://www.linkedin.com/in/roberto-orse",
      status: "OK",
      authMode: "hosted",
      connectedAt: "2026-10-01T10:00:00.000Z",
      lastSyncAt: "Datos de demostracion",
      ownerId: "usr-super-admin-01",
      assignedUserId: "usr-super-admin-01",
      assignedUserName: "Roberto OrSe (Demo)",
      dailyActionsCount: { invitationsSent: 0, messagesSent: 0, profilesVisited: 0 },
    },
  ];
}

export function getStoredAccounts(): ConnectedLinkedInAccount[] {
  if (typeof window === "undefined") return initialLinkedInAccounts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demoAccounts = getDemoAccounts();
      if (demoAccounts.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(demoAccounts));
      return demoAccounts;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDemoAccounts();
  } catch {
    return getDemoAccounts();
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
  const exists = accounts.find((a) => a.unipileAccountId === newAccount.unipileAccountId || a.id === newAccount.id);
  const updated = exists
    ? accounts.map((a) => (a.id === exists.id ? {
        ...a,
        ...newAccount,
        // Mantener límites configurados por el usuario si ya existían
        daily_connection_limit: a.daily_connection_limit ?? newAccount.daily_connection_limit ?? 20,
        daily_message_limit: a.daily_message_limit ?? newAccount.daily_message_limit ?? 20,
        daily_visit_limit: a.daily_visit_limit ?? newAccount.daily_visit_limit ?? 20,
        active_hours_start: a.active_hours_start ?? newAccount.active_hours_start ?? 9,
        active_hours_end: a.active_hours_end ?? newAccount.active_hours_end ?? 18,
        timezone: a.timezone ?? newAccount.timezone ?? "Europe/Madrid",
        working_days: a.working_days ?? newAccount.working_days ?? "1,2,3,4,5",
      } : a))
    : [{
        daily_connection_limit: 20,
        daily_message_limit: 20,
        daily_visit_limit: 20,
        active_hours_start: 9,
        active_hours_end: 18,
        timezone: "Europe/Madrid",
        working_days: "1,2,3,4,5",
        ...newAccount,
      }, ...accounts];
  saveStoredAccounts(updated);
  setActiveAccountId(newAccount.id);
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
