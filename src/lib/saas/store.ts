import type {
  SaaSUser,
  UserCapacity,
  GlobalSaaSStats,
  TeamMember,
  TeamInvitation,
  PlanTier,
  SubscriptionStatus,
} from "./types";
import { getPlanConfig, getMaxTeamInvitationsAllowed } from "./plans";

const USERS_STORAGE_KEY = "inhubflow_saas_users";
const CURRENT_USER_ID_KEY = "inhubflow_current_user_id";
const TEAM_MEMBERS_KEY = "inhubflow_team_members";
const TEAM_INVITATIONS_KEY = "inhubflow_team_invitations";

export const initialSaaSUsers: SaaSUser[] = [
  {
    id: "usr-super-admin-01",
    email: "inhubflow@gmail.com",
    name: "Roberto OrSe",
    role: "super_admin",
    companyName: "InHubFlow Headquarters",
    slotsLimit: 999,
    planTier: "custom",
    subscriptionStatus: "active",
    avatarUrl: "/images/user/owner.png",
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-10-09T08:00:00.000Z",
  },
  {
    id: "usr-client-starter-02",
    email: "carlos@consulting.es",
    name: "Carlos Mendoza",
    role: "client_admin",
    companyName: "Mendoza Advisory B2B",
    slotsLimit: 1,
    planTier: "starter",
    subscriptionStatus: "active",
    avatarUrl: "/images/user/user-02.png",
    createdAt: "2026-09-15T10:30:00.000Z",
    updatedAt: "2026-10-05T14:20:00.000Z",
  },
  {
    id: "usr-client-growth-03",
    email: "elena@agenciagrowth.com",
    name: "Elena Valenzuela",
    role: "client_admin",
    companyName: "Valenzuela Social Agency",
    slotsLimit: 5,
    planTier: "growth",
    subscriptionStatus: "active",
    avatarUrl: "/images/user/user-03.png",
    createdAt: "2026-09-20T11:00:00.000Z",
    updatedAt: "2026-10-07T09:45:00.000Z",
  },
  {
    id: "usr-client-business-04",
    email: "marcos@enterprisesales.io",
    name: "Marcos Silva",
    role: "client_admin",
    companyName: "Enterprise Sales Hub",
    slotsLimit: 10,
    planTier: "business",
    subscriptionStatus: "active",
    avatarUrl: "/images/user/user-04.png",
    createdAt: "2026-09-28T16:15:00.000Z",
    updatedAt: "2026-10-08T18:00:00.000Z",
  },
  {
    id: "usr-team-sofia-05",
    email: "sofia@agenciagrowth.com",
    name: "Sofia Ramirez (Operador SDR)",
    role: "member",
    companyName: "Valenzuela Social Agency",
    ownerId: "usr-client-growth-03",
    assignedAccountId: "acc-li-sofia",
    slotsLimit: 1,
    planTier: "growth",
    subscriptionStatus: "active",
    avatarUrl: "/images/user/user-05.png",
    createdAt: "2026-09-25T10:00:00.000Z",
    updatedAt: "2026-10-09T08:00:00.000Z",
  },
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: "tm-01",
    name: "Sofia Ramirez",
    email: "sofia@agenciagrowth.com",
    role: "member",
    ownerId: "usr-client-growth-03",
    assignedAccountId: "acc-li-sofia",
    accountName: "Sofia Ramirez | SDR",
    accountEmail: "sofia@agenciagrowth.com",
    accountAuthenticated: true,
    createdAt: "2026-09-25T10:00:00.000Z",
  },
  {
    id: "tm-02",
    name: "Javier Fernandez",
    email: "javier@enterprisesales.io",
    role: "admin",
    ownerId: "usr-client-business-04",
    assignedAccountId: "acc-li-javier",
    accountName: "Javier Fernandez | VP Sales",
    accountEmail: "javier@enterprisesales.io",
    accountAuthenticated: true,
    createdAt: "2026-10-02T12:00:00.000Z",
  },
];

export const initialTeamInvitations: TeamInvitation[] = [
  {
    id: "inv-01",
    email: "lucas@agenciagrowth.com",
    role: "member",
    inviteCode: "INV-GROWTH77",
    ownerId: "usr-client-growth-03",
    assignedAccountId: null,
    status: "pending",
    expiresAt: "2026-10-16T12:00:00.000Z",
    createdAt: "2026-10-09T08:00:00.000Z",
    inviteUrl: "https://socialselling.inhubflow.online/invite?code=INV-GROWTH77",
  },
];

// Listener callbacks for store synchronization
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("[SaaS Store] Error en listener:", e);
    }
  });
}

export function subscribeToSaaSStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoredUsers(): SaaSUser[] {
  if (typeof window === "undefined") return initialSaaSUsers;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialSaaSUsers));
      return initialSaaSUsers;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialSaaSUsers;
  } catch {
    return initialSaaSUsers;
  }
}

export function saveStoredUsers(users: SaaSUser[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    notifyListeners();
  } catch {
    // ignore
  }
}

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return initialSaaSUsers[0].id;
  try {
    const saved = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (saved) return saved;
    const defaultId = initialSaaSUsers[0].id; // Roberto OrSe (Super Admin)
    localStorage.setItem(CURRENT_USER_ID_KEY, defaultId);
    return defaultId;
  } catch {
    return initialSaaSUsers[0].id;
  }
}

export function setCurrentUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENT_USER_ID_KEY, userId);
    notifyListeners();
  } catch {
    // ignore
  }
}

export function getCurrentUser(): SaaSUser {
  const users = getStoredUsers();
  const currentId = getCurrentUserId();
  const found = users.find((u) => u.id === currentId);
  if (found) return found;
  return users[0] || initialSaaSUsers[0];
}

export function getUserById(userId: string): SaaSUser | undefined {
  const users = getStoredUsers();
  return users.find((u) => u.id === userId);
}

export function addSubscriber(data: {
  email: string;
  name?: string;
  companyName: string;
  planTier: PlanTier;
  slotsLimit?: number;
  role?: "client_admin" | "super_admin";
}): SaaSUser {
  const users = getStoredUsers();
  const plan = getPlanConfig(data.planTier);
  const slots = typeof data.slotsLimit === "number" && data.slotsLimit > 0 ? data.slotsLimit : plan.slots;

  const newUser: SaaSUser = {
    id: `usr-${Date.now()}`,
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || data.email.split("@")[0],
    role: data.role || (data.email.trim().toLowerCase() === "inhubflow@gmail.com" ? "super_admin" : "client_admin"),
    companyName: data.companyName.trim(),
    slotsLimit: slots,
    planTier: data.planTier,
    subscriptionStatus: "active",
    avatarUrl: "/images/user/user-01.png",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newUser, ...users];
  saveStoredUsers(updated);
  return newUser;
}

export function updateSubscriber(
  id: string,
  updates: Partial<Omit<SaaSUser, "id" | "createdAt">>
): SaaSUser | null {
  const users = getStoredUsers();
  let updatedUser: SaaSUser | null = null;

  const updated = users.map((u) => {
    if (u.id === id) {
      let newSlots = updates.slotsLimit ?? u.slotsLimit;
      if (updates.planTier && updates.slotsLimit === undefined) {
        newSlots = getPlanConfig(updates.planTier).slots;
      }
      updatedUser = {
        ...u,
        ...updates,
        slotsLimit: newSlots,
        updatedAt: new Date().toISOString(),
      };
      return updatedUser;
    }
    return u;
  });

  if (updatedUser) {
    saveStoredUsers(updated);
  }
  return updatedUser;
}

export function deleteSubscriber(id: string): boolean {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === id);

  // Proteger la cuenta SuperAdmin de Roberto
  if (!target || target.email.toLowerCase() === "inhubflow@gmail.com" || target.role === "super_admin") {
    return false;
  }

  const filtered = users.filter((u) => u.id !== id);
  saveStoredUsers(filtered);

  if (getCurrentUserId() === id) {
    setCurrentUserId(initialSaaSUsers[0].id);
  }
  return true;
}

/**
 * Retorna la cantidad de cuentas de LinkedIn conectadas para un usuario dado.
 * Si es SuperAdmin, puede ver todas o ver su propio conteo.
 */
export function getConnectedAccountsCountForUser(userId: string): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem("inhubflow_linkedin_accounts");
    if (!raw) return 1;
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts)) return 1;

    const user = getUserById(userId) || getCurrentUser();
    if (user.role === "super_admin") {
      return accounts.length;
    }

    // Filtrar cuentas pertenecientes al usuario o su organización
    const userAccounts = accounts.filter(
      (a: any) => !a.ownerId || a.ownerId === userId
    );
    return Math.max(1, userAccounts.length);
  } catch {
    return 1;
  }
}

/**
 * Calcula la capacidad de slots (usados, libres, total, porcentaje) para un usuario.
 */
export function getUserCapacity(userId?: string): UserCapacity {
  const targetUserId = userId || getCurrentUserId();
  const user = getUserById(targetUserId) || getCurrentUser();
  const totalSlots = user.role === "super_admin" ? 999 : Math.max(1, user.slotsLimit || 1);
  const usedSlots = getConnectedAccountsCountForUser(user.id);
  const availableSlots = Math.max(0, totalSlots - usedSlots);
  const isAtCapacity = user.role !== "super_admin" && usedSlots >= totalSlots;
  const usagePercentage = Math.min(100, Math.round((usedSlots / totalSlots) * 100));

  // Cálculo estricto de cupos para Miembros de Equipo (Team):
  // Super Admin: 999 slots ilimitados
  // Starter (1 slot): 0 slots de equipo (monousuario, 1 slot de Admin)
  // Growth (5 slots): 4 slots de equipo (1 Admin + 4 Team = 5)
  // Business (10 slots): 9 slots de equipo (1 Admin + 9 Team = 10)
  const teamSlotsTotal = getMaxTeamInvitationsAllowed(user);
  const members = getStoredTeamMembers(user.id);
  const pendingInvites = getStoredTeamInvitations(user.id).filter((i) => i.status === "pending");
  const teamSlotsUsed = members.length + pendingInvites.length;
  const teamSlotsAvailable = user.role === "super_admin" ? 999 : Math.max(0, teamSlotsTotal - teamSlotsUsed);
  const isTeamAtCapacity = user.role !== "super_admin" && (teamSlotsTotal === 0 || teamSlotsUsed >= teamSlotsTotal);

  return {
    totalSlots,
    usedSlots,
    availableSlots,
    isAtCapacity,
    usagePercentage,
    teamSlotsTotal,
    teamSlotsUsed,
    teamSlotsAvailable,
    isTeamAtCapacity,
  };
}

/**
 * Valida si el usuario puede conectar una nueva cuenta de LinkedIn.
 */
export function canAddAccountForUser(userId?: string): boolean {
  const capacity = getUserCapacity(userId);
  const user = getUserById(userId || getCurrentUserId()) || getCurrentUser();
  if (user.role === "super_admin") return true;
  return capacity.usedSlots < capacity.totalSlots;
}

/**
 * Retorna las métricas globales para el panel maestro de Super Admin.
 */
export function getGlobalSaaSStats(): GlobalSaaSStats {
  const users = getStoredUsers();
  let totalSlotsAllocated = 0;
  let activeSubscriptions = 0;
  let starterCount = 0;
  let growthCount = 0;
  let businessCount = 0;

  for (const u of users) {
    if (u.role !== "super_admin") {
      totalSlotsAllocated += u.slotsLimit || 1;
    }
    if (u.subscriptionStatus === "active") {
      activeSubscriptions++;
    }
    if (u.planTier === "starter") starterCount++;
    if (u.planTier === "growth") growthCount++;
    if (u.planTier === "business") businessCount++;
  }

  // Cuentas de LinkedIn reales
  let totalConnectedAccounts = 0;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("inhubflow_linkedin_accounts");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) totalConnectedAccounts = arr.length;
      }
    } catch {
      totalConnectedAccounts = 3;
    }
  }

  return {
    totalSubscribers: users.filter((u) => u.role !== "super_admin").length,
    activeSubscriptions: activeSubscriptions - 1, // restar super admin
    totalSlotsAllocated,
    totalConnectedAccounts: Math.max(1, totalConnectedAccounts),
    starterCount,
    growthCount,
    businessCount,
  };
}

// ----------------- EQUIPO & INVITACIONES -----------------
export function getStoredTeamMembers(ownerId?: string): TeamMember[] {
  if (typeof window === "undefined") return initialTeamMembers;
  try {
    const raw = localStorage.getItem(TEAM_MEMBERS_KEY);
    const members = raw ? JSON.parse(raw) : initialTeamMembers;
    const targetOwner = ownerId || getCurrentUserId();
    const currentUser = getCurrentUser();

    if (currentUser.role === "super_admin") {
      return members;
    }
    return members.filter((m: TeamMember) => m.ownerId === targetOwner);
  } catch {
    return initialTeamMembers;
  }
}

export function saveStoredTeamMembers(members: TeamMember[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(members));
    notifyListeners();
  } catch {
    // ignore
  }
}

export function addTeamMember(data: {
  name: string;
  email: string;
  role: "admin" | "member";
  assignedAccountId?: string | null;
  accountName?: string | null;
}): TeamMember {
  const current = getCurrentUser();
  const maxAllowed = getMaxTeamInvitationsAllowed(current);

  if (current.role !== "super_admin") {
    const existingMembers = getStoredTeamMembers(current.id);
    const existingInvites = getStoredTeamInvitations(current.id).filter((i) => i.status === "pending");
    const used = existingMembers.length + existingInvites.length;

    if (maxAllowed === 0) {
      throw new Error(
        "El Plan Starter es monousuario (1 slot exclusivo para el Administrador). Actualiza al Plan Growth (1 Admin + 4 miembros Team) para sumar colaboradores."
      );
    }

    if (used >= maxAllowed) {
      throw new Error(
        `Límite alcanzado: tu plan actual permite un máximo de ${maxAllowed} colaboradores de equipo.`
      );
    }
  }

  const allMembers = typeof window !== "undefined" && localStorage.getItem(TEAM_MEMBERS_KEY)
    ? JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || "[]")
    : initialTeamMembers;

  const newMember: TeamMember = {
    id: `tm-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    ownerId: current.id,
    assignedAccountId: data.assignedAccountId || null,
    accountName: data.accountName || null,
    accountAuthenticated: !!data.assignedAccountId,
    createdAt: new Date().toISOString(),
  };

  const updated = [...allMembers, newMember];
  saveStoredTeamMembers(updated);
  return newMember;
}

export function removeTeamMember(id: string): void {
  const allMembers = typeof window !== "undefined" && localStorage.getItem(TEAM_MEMBERS_KEY)
    ? JSON.parse(localStorage.getItem(TEAM_MEMBERS_KEY) || "[]")
    : initialTeamMembers;

  const filtered = allMembers.filter((m: TeamMember) => m.id !== id);
  saveStoredTeamMembers(filtered);
}

export function getStoredTeamInvitations(ownerId?: string): TeamInvitation[] {
  if (typeof window === "undefined") return initialTeamInvitations;
  try {
    const raw = localStorage.getItem(TEAM_INVITATIONS_KEY);
    const invites = raw ? JSON.parse(raw) : initialTeamInvitations;
    const targetOwner = ownerId || getCurrentUserId();
    const currentUser = getCurrentUser();

    if (currentUser.role === "super_admin") {
      return invites;
    }
    return invites.filter((i: TeamInvitation) => i.ownerId === targetOwner);
  } catch {
    return initialTeamInvitations;
  }
}

export function saveStoredTeamInvitations(invites: TeamInvitation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEAM_INVITATIONS_KEY, JSON.stringify(invites));
    notifyListeners();
  } catch {
    // ignore
  }
}

export function createTeamInvitation(data: {
  email: string;
  role: "admin" | "member";
  assignedAccountId?: string | null;
}): TeamInvitation {
  const current = getCurrentUser();
  const maxAllowed = getMaxTeamInvitationsAllowed(current);

  if (current.role !== "super_admin") {
    const existingMembers = getStoredTeamMembers(current.id);
    const existingInvites = getStoredTeamInvitations(current.id).filter((i) => i.status === "pending");
    const used = existingMembers.length + existingInvites.length;

    if (maxAllowed === 0) {
      throw new Error(
        "El Plan Starter es monousuario (1 slot exclusivo para el Administrador). Para invitar a miembros de equipo, actualiza al Plan Growth (1 Admin + 4 miembros Team)."
      );
    }

    if (used >= maxAllowed) {
      throw new Error(
        `Has alcanzado el límite de ${maxAllowed} cupos de equipo en tu plan actual. Para habilitar más operadores, actualiza al siguiente plan superior.`
      );
    }
  }

  const allInvites = typeof window !== "undefined" && localStorage.getItem(TEAM_INVITATIONS_KEY)
    ? JSON.parse(localStorage.getItem(TEAM_INVITATIONS_KEY) || "[]")
    : initialTeamInvitations;

  const code = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://socialselling.inhubflow.online";

  const newInvite: TeamInvitation = {
    id: `inv-${Date.now()}`,
    email: data.email.trim().toLowerCase(),
    role: data.role,
    inviteCode: code,
    ownerId: current.id,
    assignedAccountId: data.assignedAccountId || null,
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    inviteUrl: `${origin}/invite?code=${code}`,
  };

  const updated = [newInvite, ...allInvites];
  saveStoredTeamInvitations(updated);
  return newInvite;
}
