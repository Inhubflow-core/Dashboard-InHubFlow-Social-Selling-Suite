import type {
  SaaSUser,
  UserCapacity,
  GlobalSaaSStats,
  TeamMember,
  TeamInvitation,
  PlanTier,
  SubscriptionStatus,
  SwitchableAccountItem,
} from "./types";
import { getPlanConfig, getMaxTeamInvitationsAllowed } from "./plans";

const USERS_STORAGE_KEY = "inhubflow_saas_users";
const CURRENT_USER_ID_KEY = "inhubflow_current_user_id";
const SESSION_USER_ID_KEY = "inhubflow_session_user_id";
const TEAM_MEMBERS_KEY = "inhubflow_team_members";
const TEAM_INVITATIONS_KEY = "inhubflow_team_invitations";

export const initialSaaSUsers: SaaSUser[] = [
  {
    id: "usr-super-admin-01",
    email: "inhubflow@gmail.com",
    name: "SuperAdmin",
    role: "super_admin",
    companyName: "InHubFlow Headquarters",
    slotsLimit: 999,
    planTier: "custom",
    subscriptionStatus: "active",
    avatarUrl: "/images/user/owner.png",
    assignedAccountId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "usr-client-roberto-agencia",
    email: "robertoorse.agencia@gmail.com",
    name: "Roberto OrSe Agencia",
    role: "client_admin",
    companyName: "Roberto OrSe Agencia",
    slotsLimit: 10,
    planTier: "business",
    subscriptionStatus: "active",
    avatarUrl: "https://media.licdn.com/dms/image/v2/D4E03AQETqM_x3Dg7UA/profile-displayphoto-shrink_800_800/B4EZkzyXuFGwAc-/0/1757510466710?e=1793836800&v=beta&t=ti_Vff5L4ZlFHs8iYo8trtcyT1hKT4EikEtlwieUi0U",
    assignedAccountId: "acc-li-6yecZUhYS1mvPOJJC7p-zQ",
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
  {
    id: "usr-team-lynn-01",
    email: "linnmartinsson407@gmail.com",
    name: "Lynn Martinson",
    role: "member",
    ownerId: "usr-client-roberto-agencia",
    companyName: "Roberto OrSe Agencia",
    slotsLimit: 1,
    planTier: "business",
    subscriptionStatus: "active",
    avatarUrl: "",
    assignedAccountId: "acc-li-5X_l6hknTW62DqQtKJNNHA",
    createdAt: "2026-10-12T16:39:42.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  },
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: "usr-team-lynn-01",
    name: "Lynn Martinson",
    email: "linnmartinsson407@gmail.com",
    role: "member",
    ownerId: "usr-client-roberto-agencia",
    assignedAccountId: "acc-li-5X_l6hknTW62DqQtKJNNHA",
    accountName: "Lynn Martinson",
    accountAuthenticated: false,
    createdAt: "2026-10-12T16:39:42.000Z",
  },
];

export const initialTeamInvitations: TeamInvitation[] = [];

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
    if (!Array.isArray(parsed) || parsed.length === 0) return initialSaaSUsers;

    // Purgar rigurosamente usuarios fake de pruebas anteriores
    const fakeEmails = new Set([
      "carlos@consulting.es",
      "elena@agenciagrowth.com",
      "marcos@enterprisesales.io",
      "sofia@agenciagrowth.com",
      "javier@enterprisesales.io",
      "lucas@agenciagrowth.com",
    ]);
    const fakeIds = new Set([
      "usr-client-starter-02",
      "usr-client-growth-03",
      "usr-client-business-04",
      "usr-team-sofia-05",
      "usr-team-javier-06",
      "usr-client-linn-02",
    ]);

    const cleanUsers = parsed
      .filter((u: SaaSUser) => !fakeEmails.has(u.email?.toLowerCase()) && !fakeIds.has(u.id))
      .map((u: SaaSUser) => {
        const emailLower = (u.email || "").toLowerCase().trim();
        // 1. inhubflow@gmail.com -> SuperAdmin (Super Admin)
        if (emailLower === "inhubflow@gmail.com") {
          return {
            ...u,
            id: "usr-super-admin-01",
            name: "SuperAdmin",
            role: "super_admin" as const,
            slotsLimit: 999,
            companyName: "InHubFlow Headquarters",
            assignedAccountId: null,
          };
        }
        // 2. robertoorse.agencia@gmail.com -> Roberto OrSe Agencia (Admin, 10 slots)
        if (emailLower === "robertoorse.agencia@gmail.com" || (u.name || "").toLowerCase().includes("robertoorse")) {
          return {
            ...u,
            id: "usr-client-roberto-agencia",
            name: "Roberto OrSe Agencia",
            email: "robertoorse.agencia@gmail.com",
            role: "client_admin" as const,
            planTier: "business" as const,
            slotsLimit: 10,
            companyName: "Roberto OrSe Agencia",
            avatarUrl: "https://media.licdn.com/dms/image/v2/D4E03AQETqM_x3Dg7UA/profile-displayphoto-shrink_800_800/B4EZkzyXuFGwAc-/0/1757510466710?e=1793836800&v=beta&t=ti_Vff5L4ZlFHs8iYo8trtcyT1hKT4EikEtlwieUi0U",
            assignedAccountId: "acc-li-6yecZUhYS1mvPOJJC7p-zQ",
          };
        }
        // 3. linnmartinsson407@gmail.com -> Lynn Martinson (Team SDR del equipo de Roberto OrSe Agencia)
        if (emailLower === "linnmartinsson407@gmail.com" || (u.name || "").toLowerCase().includes("martinson")) {
          return {
            ...u,
            id: "usr-team-lynn-01",
            name: "Lynn Martinson",
            email: "linnmartinsson407@gmail.com",
            role: "member" as const,
            ownerId: "usr-client-roberto-agencia",
            planTier: "business" as const,
            companyName: "Roberto OrSe Agencia",
            slotsLimit: 1,
            assignedAccountId: "acc-li-5X_l6hknTW62DqQtKJNNHA",
          };
        }
        return u;
      });

    // Asegurar que las 3 cuentas canónicas estén siempre presentes
    const existingIds = new Set(cleanUsers.map((u: SaaSUser) => u.id));
    const merged = [...cleanUsers];
    for (const initUser of initialSaaSUsers) {
      if (!existingIds.has(initUser.id)) {
        merged.push(initUser);
      }
    }

    if (merged.length !== parsed.length) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
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

export function getSessionUserId(): string {
  if (typeof window === "undefined") return initialSaaSUsers[0].id;
  try {
    const saved = localStorage.getItem(SESSION_USER_ID_KEY) || localStorage.getItem("inhubflow_master_user_id");
    const fakeIds = new Set([
      "usr-client-starter-02",
      "usr-client-growth-03",
      "usr-client-business-04",
      "usr-team-sofia-05",
      "usr-team-javier-06",
      "usr-client-linn-02",
    ]);
    if (!saved || fakeIds.has(saved)) {
      const defaultId = initialSaaSUsers[0].id; // SuperAdmin
      localStorage.setItem(SESSION_USER_ID_KEY, defaultId);
      return defaultId;
    }
    return saved;
  } catch {
    return initialSaaSUsers[0].id;
  }
}

export function setSessionUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_USER_ID_KEY, userId);
    notifyListeners();
  } catch {
    // ignore
  }
}

export function getSessionUser(): SaaSUser {
  const users = getStoredUsers();
  const sessionUserId = getSessionUserId();
  const found = users.find((u) => u.id === sessionUserId);
  if (found) return found;
  return users[0] || initialSaaSUsers[0];
}

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return initialSaaSUsers[0].id;
  try {
    const saved = localStorage.getItem(CURRENT_USER_ID_KEY);
    const fakeIds = new Set([
      "usr-client-starter-02",
      "usr-client-growth-03",
      "usr-client-business-04",
      "usr-team-sofia-05",
      "usr-team-javier-06",
      "usr-client-linn-02",
    ]);
    if (!saved || fakeIds.has(saved)) {
      const defaultId = getSessionUserId();
      localStorage.setItem(CURRENT_USER_ID_KEY, defaultId);
      return defaultId;
    }
    return saved;
  } catch {
    return getSessionUserId();
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
    let members: TeamMember[] = [];
    if (!raw) {
      members = initialTeamMembers;
      localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(initialTeamMembers));
    } else {
      const parsed = JSON.parse(raw);
      members = Array.isArray(parsed) ? parsed : initialTeamMembers;
    }

    const fakeKeywords = ["sofia", "javier", "lucas", "tm-01", "tm-02", "agenciagrowth", "enterprisesales"];
    let cleanMembers = members.filter((m: TeamMember) => {
      if (!m || !m.id) return false;
      const lower = `${m.id} ${m.name || ""} ${m.email || ""}`.toLowerCase();
      return !fakeKeywords.some((kw) => lower.includes(kw));
    });

    // Asegurar que initialTeamMembers esté integrado
    const existingIds = new Set(cleanMembers.map((m) => m.id));
    for (const initMember of initialTeamMembers) {
      if (!existingIds.has(initMember.id)) {
        cleanMembers.push(initMember);
      }
    }

    if (cleanMembers.length !== members.length || !raw) {
      localStorage.setItem(TEAM_MEMBERS_KEY, JSON.stringify(cleanMembers));
    }

    const targetOwner = ownerId || getCurrentUserId();
    const currentUser = getCurrentUser();

    if (currentUser.role === "super_admin") {
      return cleanMembers;
    }
    return cleanMembers.filter((m: TeamMember) => m.ownerId === targetOwner);
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
    if (!raw) return [];
    const invites = JSON.parse(raw);
    if (!Array.isArray(invites)) return [];

    const fakeKeywords = ["lucas", "inv-01", "agenciagrowth"];
    const cleanInvites = invites.filter((i: TeamInvitation) => {
      if (!i || !i.id) return false;
      const lower = `${i.id} ${i.email || ""}`.toLowerCase();
      return !fakeKeywords.some((kw) => lower.includes(kw));
    });

    if (cleanInvites.length !== invites.length) {
      localStorage.setItem(TEAM_INVITATIONS_KEY, JSON.stringify(cleanInvites));
    }

    const targetOwner = ownerId || getCurrentUserId();
    const currentUser = getCurrentUser();

    if (currentUser.role === "super_admin") {
      return cleanInvites;
    }
    return cleanInvites.filter((i: TeamInvitation) => i.ownerId === targetOwner);
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

/**
 * Retorna las cuentas/slots conmutables según el rol y aislamiento:
 * 1. Super Admin: Ve su cuenta Master + todas las cuentas de clientes que compraron suscripción (client_admin).
 * 2. Admin (Client Admin): Ve ÚNICAMENTE los slots de su propio equipo (su cuenta Admin + colaboradores de su workspace).
 * 3. Member: Ve únicamente su propio slot asignado.
 * 4. Si el Super Admin está navegando en la cuenta de un cliente (auditoría), siempre dispone de la opción de volver a Super Admin.
 */
export function getSwitchableAccountsForUser(
  currentUser: SaaSUser,
  sessionContext?: SaaSUser | string | null
): SwitchableAccountItem[] {
  const users = getStoredUsers();
  const superAdminUser =
    users.find(
      (u) =>
        u.role === "super_admin" ||
        u.email.toLowerCase() === "inhubflow@gmail.com"
    ) || users[0];

  // Determinar la sesión titular autenticada
  let sessionUser: SaaSUser;
  if (sessionContext && typeof sessionContext === "object" && "id" in sessionContext) {
    sessionUser = sessionContext;
  } else if (typeof sessionContext === "string" && sessionContext) {
    sessionUser = getUserById(sessionContext) || getSessionUser();
  } else {
    sessionUser = getSessionUser();
  }

  const isBrowsingAsAnother = currentUser.id !== sessionUser.id;

  // 1. CASO SESIÓN TITULAR ES SUPER ADMIN:
  if (
    sessionUser.role === "super_admin" ||
    sessionUser.email.toLowerCase() === "inhubflow@gmail.com"
  ) {
    const list: SwitchableAccountItem[] = [];

    // Cuenta Master Super Admin
    list.push({
      id: superAdminUser.id,
      name: isBrowsingAsAnother ? `Volver a ${superAdminUser.name} (Super Admin)` : superAdminUser.name,
      email: superAdminUser.email,
      role: superAdminUser.role,
      companyName: superAdminUser.companyName,
      planTier: superAdminUser.planTier,
      slotsLimit: superAdminUser.slotsLimit,
      avatarUrl: superAdminUser.avatarUrl,
      badgeLabel: "Super Admin",
      subtitle: isBrowsingAsAnother ? "Salir de modo auditoría" : "Master • Acceso Total",
      isCurrent: currentUser.id === superAdminUser.id,
      isMasterReturn: isBrowsingAsAnother,
    });

    // Suscriptores que compraron planes (client_admin)
    const subscribers: SwitchableAccountItem[] = users
      .filter((u) => u.role === "client_admin" && u.id !== superAdminUser.id)
      .map((u) => {
        const uPlan = getPlanConfig(u.planTier);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          companyName: u.companyName,
          planTier: u.planTier,
          slotsLimit: u.slotsLimit,
          avatarUrl: u.avatarUrl,
          badgeLabel: `${uPlan.name} (${u.slotsLimit} Slots)`,
          subtitle: u.companyName || u.email,
          isCurrent: currentUser.id === u.id,
        };
      });

    list.push(...subscribers);
    return list;
  }

  // 2. CASO SESIÓN TITULAR ES CLIENT ADMIN (ej. Roberto OrSe Agencia):
  if (sessionUser.role === "client_admin") {
    const list: SwitchableAccountItem[] = [];
    const totalSlots = Math.max(1, sessionUser.slotsLimit || 1);

    // Slot 1: Admin Principal
    list.push({
      id: sessionUser.id,
      name: isBrowsingAsAnother ? `Volver a ${sessionUser.name}` : sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      companyName: sessionUser.companyName,
      planTier: sessionUser.planTier,
      slotsLimit: sessionUser.slotsLimit,
      avatarUrl: sessionUser.avatarUrl,
      badgeLabel: `Admin Principal (Slot 1/${totalSlots})`,
      subtitle: isBrowsingAsAnother ? "Salir de emulación de equipo" : sessionUser.companyName || "Workspace Admin",
      isCurrent: currentUser.id === sessionUser.id,
      isMasterReturn: isBrowsingAsAnother,
    });

    // Slots de colaboradores de su propio equipo
    const teamUsers = users.filter((u) => u.ownerId === sessionUser.id);
    const teamMembers = getStoredTeamMembers(sessionUser.id);
    const seenEmails = new Set<string>([sessionUser.email.toLowerCase()]);
    let slotNum = 2;

    for (const tu of teamUsers) {
      if (!seenEmails.has(tu.email.toLowerCase())) {
        seenEmails.add(tu.email.toLowerCase());
        list.push({
          id: tu.id,
          name: tu.name,
          email: tu.email,
          role: tu.role,
          companyName: tu.companyName,
          planTier: tu.planTier,
          slotsLimit: 1,
          avatarUrl: tu.avatarUrl,
          badgeLabel: `Operador SDR (Slot ${slotNum}/${totalSlots})`,
          subtitle: tu.email,
          isCurrent: currentUser.id === tu.id,
        });
        slotNum++;
      }
    }

    for (const tm of teamMembers) {
      if (!seenEmails.has(tm.email.toLowerCase())) {
        seenEmails.add(tm.email.toLowerCase());
        list.push({
          id: tm.id,
          name: tm.name,
          email: tm.email,
          role: "member",
          companyName: sessionUser.companyName,
          planTier: sessionUser.planTier,
          slotsLimit: 1,
          badgeLabel: `Operador SDR (Slot ${slotNum}/${totalSlots})`,
          subtitle: tm.accountName || tm.email,
          isCurrent: currentUser.id === tm.id,
        });
        slotNum++;
      }
    }

    return list;
  }

  // 3. CASO SESIÓN TITULAR ES MEMBER / OPERADOR SDR:
  return [
    {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      companyName: sessionUser.companyName,
      planTier: sessionUser.planTier,
      slotsLimit: 1,
      avatarUrl: sessionUser.avatarUrl,
      badgeLabel: "Slot Asignado",
      subtitle: sessionUser.companyName || "Operador de Equipo",
      isCurrent: true,
    },
  ];
}

