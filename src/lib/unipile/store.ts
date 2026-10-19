import type { ConnectedLinkedInAccount } from "./types";
import type { SaaSUser } from "../saas/types";
import { getStoredTeamMembers } from "../saas/store";

const STORAGE_KEY = "inhubflow_linkedin_accounts";
const ACTIVE_ACCOUNT_KEY = "inhubflow_active_linkedin_account_id";

// Demo records are fixtures, not connected LinkedIn accounts. Keep them opt-in so
// an empty sandbox cannot look like a live Unipile connection.
export const initialLinkedInAccounts: ConnectedLinkedInAccount[] = [
  {
    id: "acc-li-HfrdagEmSrONX8jqE9IYjQ",
    unipileAccountId: "HfrdagEmSrONX8jqE9IYjQ",
    name: "RobertoOrSe Agencia",
    email: "robertoorse.agencia@gmail.com",
    headline: "Roberto OrSe | InHubFlow Social Selling Suite",
    publicProfileUrl: "https://www.linkedin.com/in/robertoorse-agencia",
    profilePictureUrl: "https://media.licdn.com/dms/image/v2/D4E03AQETqM_x3Dg7UA/profile-displayphoto-shrink_800_800/B4EZkzyXuFGwAc-/0/1757510466710?e=1793836800&v=beta&t=ti_Vff5L4ZlFHs8iYo8trtcyT1hKT4EikEtlwieUi0U",
    status: "OK",
    authMode: "cookie",
    connectedAt: "2026-10-13T11:38:09.032Z",
    lastSyncAt: "Sincronizado con InHubFlow Cloud",
    dailyActionsCount: {
      invitationsSent: 0,
      messagesSent: 0,
      profilesVisited: 0,
    },
    daily_connection_limit: 20,
    daily_message_limit: 20,
    daily_visit_limit: 20,
    active_hours_start: 9,
    active_hours_end: 18,
    timezone: "Europe/Madrid",
    working_days: "1,2,3,4,5",
    ownerId: "usr-client-roberto-agencia",
    assignedUserId: "usr-client-roberto-agencia",
    assignedUserName: "Roberto OrSe Agencia (Admin)",
  },
  {
    id: "acc-li-7VSGKBGlTNGRbzZKuh6VpQ",
    unipileAccountId: "7VSGKBGlTNGRbzZKuh6VpQ",
    name: "ADS CASHGROW",
    email: "ads.cashgrow.app@gmail.com",
    headline: "Gerente de vendas da empresa ADS CASHGROW",
    publicProfileUrl: "https://www.linkedin.com/in/cashgrow-app-532374445",
    profilePictureUrl: "",
    status: "OK",
    authMode: "cookie",
    connectedAt: "2026-10-19T20:18:25.412Z",
    lastSyncAt: "Sincronizado con InHubFlow Cloud",
    dailyActionsCount: {
      invitationsSent: 0,
      messagesSent: 0,
      profilesVisited: 0,
    },
    daily_connection_limit: 20,
    daily_message_limit: 20,
    daily_visit_limit: 20,
    active_hours_start: 9,
    active_hours_end: 18,
    timezone: "Europe/Madrid",
    working_days: "1,2,3,4,5",
    ownerId: "usr-client-roberto-agencia",
    assignedUserId: "usr-team-lynn-01",
    assignedUserName: "ADS CASHGROW (Team)",
  },
];

export function getStoredAccounts(): ConnectedLinkedInAccount[] {
  if (typeof window === "undefined") return initialLinkedInAccounts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLinkedInAccounts));
      return initialLinkedInAccounts;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialLinkedInAccounts;

    // Purgar rigurosamente cualquier cuenta fake o mock remanente
    const fakeKeywords = [
      "demo-",
      "acc-elena",
      "acc-sofia",
      "acc-carlos",
      "acc-marcos",
      "acc-lucas",
      "acc-javier",
      "elena valenzuela",
      "sofia ramirez",
      "carlos mendoza",
      "marcos silva",
      "javier fernandez",
      "lucas gomez",
      "(demo)",
    ];

    const cleanAccounts = parsed.filter((a: ConnectedLinkedInAccount) => {
      if (!a || !a.id) return false;
      const lowerId = a.id.toLowerCase();
      const lowerName = (a.name || "").toLowerCase();
      const lowerEmail = (a.email || "").toLowerCase();
      const isFake = fakeKeywords.some(
        (kw) => lowerId.includes(kw) || lowerName.includes(kw) || lowerEmail.includes(kw)
      );
      return !isFake;
    });

    if (cleanAccounts.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLinkedInAccounts));
      return initialLinkedInAccounts;
    }

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

    // Garantizar que las cuentas iniciales reales (RobertoOrse Agencia y ADS CASHGROW) siempre existan y estén actualizadas
    for (const initAcc of initialLinkedInAccounts) {
      const existsIdx = deduplicated.findIndex(
        (d) =>
          d.id === initAcc.id ||
          d.unipileAccountId === initAcc.unipileAccountId ||
          (d.name && initAcc.name && norm(d.name) === norm(initAcc.name)) ||
          ((d.name || "").toLowerCase().includes("roberto") && (initAcc.name || "").toLowerCase().includes("roberto")) ||
          ((d.name || "").toLowerCase().includes("cashgrow") && (initAcc.name || "").toLowerCase().includes("cashgrow")) ||
          ((d.name || "").toLowerCase().includes("lynn") && (initAcc.name || "").toLowerCase().includes("cashgrow")) ||
          ((d.name || "").toLowerCase().includes("linn") && (initAcc.name || "").toLowerCase().includes("cashgrow")) ||
          (d.email && initAcc.email && d.email.toLowerCase().includes("cashgrow") && initAcc.email.toLowerCase().includes("cashgrow"))
      );
      if (existsIdx === -1) {
        deduplicated.push(initAcc);
      } else {
        const targetStatus = deduplicated[existsIdx].status || initAcc.status;

        // Preservar el nombre editado por el usuario; migrar el viejo valor por defecto o nombres antiguos
        const existingName = deduplicated[existsIdx].name;
        const resolvedName =
          existingName &&
          existingName !== "RobertoOrse Agencia" &&
          !existingName.toLowerCase().includes("lynn") &&
          !existingName.toLowerCase().includes("linn")
            ? existingName
            : initAcc.name;

        deduplicated[existsIdx] = {
          ...initAcc,
          ...deduplicated[existsIdx],
          id: initAcc.id,
          name: resolvedName,
          email:
            deduplicated[existsIdx].email && !deduplicated[existsIdx].email.includes("linnmartinsson")
              ? deduplicated[existsIdx].email
              : initAcc.email,
          unipileAccountId: initAcc.unipileAccountId || deduplicated[existsIdx].unipileAccountId,
          status: targetStatus,
          ownerId: initAcc.ownerId,
          assignedUserId: initAcc.assignedUserId,
          assignedUserName: initAcc.assignedUserName,
        };
      }
    }

    if (deduplicated.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return initialLinkedInAccounts;
  }
}

export function saveStoredAccounts(accounts: ConnectedLinkedInAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("inhubflow-account-update"));
  } catch {
    // ignore
  }
}

/**
 * Valida si una cuenta de LinkedIn corresponde inequívocamente a un usuario específico del SaaS.
 */
export function accountMatchesUser(account: ConnectedLinkedInAccount, user: SaaSUser): boolean {
  if (!account || !user) return false;

  const normStr = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const accNorm = normStr(account.name);
  const userNorm = normStr(user.name);

  // 1. Coincidencia por ID de asignación explícita (con o sin prefijo "acc-li-")
  const normAccId = (account.id || "").replace(/^acc-li-/, "");
  const normUnipileId = (account.unipileAccountId || "").replace(/^acc-li-/, "");
  const normUserAssigned = (user.assignedAccountId || "").replace(/^acc-li-/, "");

  if (normUserAssigned && (normAccId === normUserAssigned || normUnipileId === normUserAssigned)) {
    return true;
  }

  // 2. Coincidencia por ID de usuario asignado
  if (account.assignedUserId && account.assignedUserId === user.id) return true;

  // 3. Coincidencia por email
  const accEmail = (account.email || "").trim().toLowerCase();
  const userEmail = (user.email || "").trim().toLowerCase();
  if (accEmail && userEmail) {
    if (accEmail === userEmail) return true;
    if (accEmail.includes("robertoorse") && userEmail.includes("robertoorse")) return true;
    if (
      (accEmail.includes("cashgrow") || accEmail.includes("linn") || accEmail.includes("lynn")) &&
      (userEmail.includes("cashgrow") || userEmail.includes("linn") || userEmail.includes("lynn"))
    ) return true;
  }

  // 4. Coincidencia por nombre para roles no super_admin
  if (user.role !== "super_admin") {
    if (accNorm.includes("roberto") && userNorm.includes("roberto")) return true;
    if (
      (accNorm.includes("cashgrow") || accNorm.includes("linn") || accNorm.includes("lynn")) &&
      (userNorm.includes("cashgrow") || userNorm.includes("linn") || userNorm.includes("lynn"))
    ) return true;
  }

  // 5. Coincidencia por ownerId para client_admin si la cuenta no está asignada a otro miembro
  if (user.role === "client_admin" && account.ownerId === user.id && (!account.assignedUserId || account.assignedUserId === user.id)) {
    return true;
  }

  return false;
}

/**
 * Filtra las cuentas según el rol y permisos del usuario (exactamente como inhubflow-b2b):
 * 1. Super Admin: Ve TODAS las cuentas de toda la plataforma (SuperAdmin).
 * 2. Admin de Cuenta / Workspace Owner (Roberto OrSe Agencia): Ve su propia cuenta y las de TODOS los miembros de su equipo (Team).
 * 3. Miembro del Equipo (Operador SDR / Team, ej. Lynn Martinson): SOLO puede ver su PROPIO slot asignado.
 */
export function getVisibleAccountsForUser(user: SaaSUser): ConnectedLinkedInAccount[] {
  const accounts = getStoredAccounts();

  // 1. Super Admin: Ve todas las cuentas globales de la plataforma
  if (user.role === "super_admin" || user.email.toLowerCase() === "inhubflow@gmail.com") {
    return accounts;
  }

  // 2. Miembro del Equipo (Team / Member, ej. Lynn Martinson): SOLO puede ver su PROPIO slot asignado
  if (user.role === "member" || (user.ownerId && user.ownerId !== user.id)) {
    return accounts.filter((a) => {
      const matchesAssignedUser = Boolean(a.assignedUserId && a.assignedUserId === user.id);
      const matchesAssignedAccount = Boolean(user.assignedAccountId && (a.id === user.assignedAccountId || a.unipileAccountId === user.assignedAccountId));
      const matchesEmail = Boolean(a.email && a.email.toLowerCase() === user.email.toLowerCase());
      const matchesName = accountMatchesUser(a, user);
      return matchesAssignedUser || matchesAssignedAccount || matchesEmail || matchesName;
    });
  }

  // 3. Admin (Client Admin, ej. Roberto OrSe Agencia): Ve todas las cuentas de su workspace y equipo
  const teamMembers = typeof window !== "undefined" ? getStoredTeamMembers(user.id) : [];
  const teamMemberUserIds = new Set(teamMembers.map((m) => m.id));
  const teamAssignedAccountIds = new Set(
    teamMembers.map((m) => m.assignedAccountId).filter(Boolean) as string[]
  );

  return accounts
    .filter((a) => {
      // Si la cuenta corresponde inequívocamente al propio Admin, SIEMPRE visible
      if (accountMatchesUser(a, user)) return true;

      // Cuenta propia del Admin o perteneciente a su workspace
      if (a.ownerId === user.id || a.assignedUserId === user.id) return true;
      if (user.assignedAccountId && (a.id === user.assignedAccountId || a.unipileAccountId === user.assignedAccountId)) return true;

      // Cuenta asignada a algún colaborador de su equipo
      if (a.assignedUserId && teamMemberUserIds.has(a.assignedUserId)) return true;
      if (teamAssignedAccountIds.has(a.id)) return true;

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
      if (acc.assignedUserId === user.id || acc.ownerId === user.id || accountMatchesUser(acc, user)) {
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

  // 1. REGLA OBLIGATORIA DE IDENTIDAD:
  // Si el usuario navegando tiene una cuenta propia o asignada en visible, esa cuenta
  // es SIEMPRE la cuenta activa de forma infalible.
  const directAccount = visible.find((a) => accountMatchesUser(a, user));
  if (directAccount) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, directAccount.id);
      } catch {}
    }
    return directAccount;
  }

  // 2. Si no hay cuenta directa propia pero activeId está dentro de las visibles, respetarlo
  const activeId = getActiveAccountId();
  const found = visible.find((a) => a.id === activeId || a.unipileAccountId === activeId);
  if (found) return found;

  // 3. Fallback a la primera visible
  const first = visible[0];
  if (first && typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, first.id);
    } catch {}
  }
  return first;
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
    window.dispatchEvent(new Event("storage"));
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
      .map((a) => {
        if (a.id !== exists.id) return a;
        const isRoberto = (a.name || "").toLowerCase().includes("roberto") || (newAccount.name || "").toLowerCase().includes("roberto");
        const isTeam =
          (a.name || "").toLowerCase().includes("cashgrow") ||
          (newAccount.name || "").toLowerCase().includes("cashgrow") ||
          (a.name || "").toLowerCase().includes("lynn") ||
          (a.name || "").toLowerCase().includes("linn") ||
          (newAccount.name || "").toLowerCase().includes("lynn") ||
          (newAccount.name || "").toLowerCase().includes("linn");
        const targetOwnerId = a.ownerId || newAccount.ownerId || (isRoberto || isTeam ? "usr-client-roberto-agencia" : undefined);
        const targetUserId = a.assignedUserId || newAccount.assignedUserId || (isRoberto ? "usr-client-roberto-agencia" : isTeam ? "usr-team-lynn-01" : undefined);
        const targetUserName = a.assignedUserName || newAccount.assignedUserName || (isRoberto ? "Roberto OrSe Agencia (Admin)" : isTeam ? "ADS CASHGROW (Team)" : undefined);

        return {
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
          ownerId: targetOwnerId,
          assignedUserId: targetUserId,
          assignedUserName: targetUserName,
        };
      });
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
  if (typeof window !== "undefined" && !localStorage.getItem(ACTIVE_ACCOUNT_KEY)) {
    setActiveAccountId(exists ? exists.id : newAccount.id);
  }
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
