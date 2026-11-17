import "server-only";
import { getSocialSellingDb } from "@/lib/persistence/db";
import { getPlanConfig } from "./plans";
import type { GlobalSaaSStats, PlanTier, SaaSUser, SubscriptionStatus, UserRole } from "./types";

interface SubscriberRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_name: string | null;
  plan_tier: PlanTier;
  slots_limit: number;
  subscription_status: SubscriptionStatus;
  lemon_subscription_id: string | null;
  lemon_customer_id: string | null;
  billing_period: string | null;
  avatar_url: string | null;
  assigned_account_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToUser(row: SubscriberRow): SaaSUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    companyName: row.company_name || undefined,
    slotsLimit: row.slots_limit,
    planTier: row.plan_tier,
    subscriptionStatus: row.subscription_status,
    avatarUrl: row.avatar_url || "/images/user/owner.png",
    assignedAccountId: row.assigned_account_id,
    lemonSubscriptionId: row.lemon_subscription_id,
    billingPeriod: (row.billing_period as SaaSUser["billingPeriod"]) || "monthly",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listSaasSubscribers(): SaaSUser[] {
  const db = getSocialSellingDb();
  const rows = db
    .prepare("SELECT * FROM saas_subscribers ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at DESC")
    .all() as SubscriberRow[];
  return rows.map(mapRowToUser);
}

export function getSaasSubscriberByEmail(email: string): SaaSUser | null {
  const db = getSocialSellingDb();
  const row = db
    .prepare("SELECT * FROM saas_subscribers WHERE LOWER(email) = LOWER(?)")
    .get(email.trim()) as SubscriberRow | undefined;
  return row ? mapRowToUser(row) : null;
}

export function createSaasSubscriber(input: {
  email: string;
  name?: string;
  companyName: string;
  planTier?: PlanTier;
  slotsLimit?: number;
  subscriptionStatus?: SubscriptionStatus;
  lemonSubscriptionId?: string | null;
  lemonCustomerId?: string | null;
  billingPeriod?: string;
}): SaaSUser {
  const db = getSocialSellingDb();
  const cleanEmail = input.email.trim().toLowerCase();
  const existing = getSaasSubscriberByEmail(cleanEmail);
  if (existing) {
    throw new Error(`Ya existe una cuenta registrada con el correo ${cleanEmail}`);
  }

  const planTier = input.planTier || "starter";
  const planConfig = getPlanConfig(planTier);
  const slotsLimit = typeof input.slotsLimit === "number" ? Math.max(1, input.slotsLimit) : planConfig.slots;
  const now = new Date().toISOString();
  const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  db.prepare(`
    INSERT INTO saas_subscribers (
      id, email, name, role, company_name, plan_tier, slots_limit,
      subscription_status, lemon_subscription_id, lemon_customer_id, billing_period,
      avatar_url, assigned_account_id, created_at, updated_at
    ) VALUES (?, ?, ?, 'client_admin', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(
    id,
    cleanEmail,
    (input.name || input.companyName || cleanEmail.split("@")[0]).trim(),
    input.companyName.trim(),
    planTier,
    slotsLimit,
    input.subscriptionStatus || "active",
    input.lemonSubscriptionId || null,
    input.lemonCustomerId || null,
    input.billingPeriod || "monthly",
    "/images/user/owner.png",
    now,
    now
  );

  return getSaasSubscriberByEmail(cleanEmail)!;
}

export function updateSaasSubscriber(
  id: string,
  updates: {
    companyName?: string;
    name?: string;
    planTier?: PlanTier;
    slotsLimit?: number;
    subscriptionStatus?: SubscriptionStatus;
    lemonSubscriptionId?: string | null;
    billingPeriod?: string;
  }
): SaaSUser | null {
  const db = getSocialSellingDb();
  const existing = db.prepare("SELECT * FROM saas_subscribers WHERE id = ?").get(id) as SubscriberRow | undefined;
  if (!existing) return null;

  const isSuper = existing.role === "super_admin";
  const nextPlan = updates.planTier || existing.plan_tier;
  const nextSlots = isSuper
    ? 999
    : typeof updates.slotsLimit === "number"
    ? Math.max(1, updates.slotsLimit)
    : updates.planTier
    ? getPlanConfig(updates.planTier).slots
    : existing.slots_limit;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE saas_subscribers
    SET company_name = ?,
        name = ?,
        plan_tier = ?,
        slots_limit = ?,
        subscription_status = ?,
        lemon_subscription_id = ?,
        billing_period = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    updates.companyName !== undefined ? updates.companyName.trim() : existing.company_name,
    updates.name !== undefined ? updates.name.trim() : existing.name,
    nextPlan,
    nextSlots,
    isSuper ? "active" : updates.subscriptionStatus || existing.subscription_status,
    updates.lemonSubscriptionId !== undefined ? updates.lemonSubscriptionId : existing.lemon_subscription_id,
    updates.billingPeriod || existing.billing_period || "monthly",
    now,
    id
  );

  const updated = db.prepare("SELECT * FROM saas_subscribers WHERE id = ?").get(id) as SubscriberRow;
  return mapRowToUser(updated);
}

export function deleteSaasSubscriber(id: string): boolean {
  const db = getSocialSellingDb();
  const existing = db.prepare("SELECT role FROM saas_subscribers WHERE id = ?").get(id) as { role: string } | undefined;
  if (!existing || existing.role === "super_admin") {
    return false;
  }
  const result = db.prepare("DELETE FROM saas_subscribers WHERE id = ?").run(id);
  return result.changes > 0;
}

export function upsertSubscriberFromLemonWebhook(params: {
  email: string;
  name?: string;
  companyName?: string;
  planTier: PlanTier;
  slotsLimit: number;
  subscriptionStatus: SubscriptionStatus;
  lemonSubscriptionId: string;
  lemonCustomerId?: string;
  billingPeriod?: string;
}): { user: SaaSUser; action: "created" | "updated" } {
  const db = getSocialSellingDb();
  const cleanEmail = params.email.trim().toLowerCase();
  const existingByEmail = getSaasSubscriberByEmail(cleanEmail);

  if (existingByEmail) {
    const updated = updateSaasSubscriber(existingByEmail.id, {
      companyName: params.companyName || existingByEmail.companyName,
      planTier: params.planTier,
      slotsLimit: params.slotsLimit,
      subscriptionStatus: params.subscriptionStatus,
      lemonSubscriptionId: params.lemonSubscriptionId,
      billingPeriod: params.billingPeriod,
    });
    return { user: updated!, action: "updated" };
  }

  const bySubRow = db
    .prepare("SELECT * FROM saas_subscribers WHERE lemon_subscription_id = ?")
    .get(params.lemonSubscriptionId) as SubscriberRow | undefined;

  if (bySubRow) {
    const updated = updateSaasSubscriber(bySubRow.id, {
      planTier: params.planTier,
      slotsLimit: params.slotsLimit,
      subscriptionStatus: params.subscriptionStatus,
      billingPeriod: params.billingPeriod,
    });
    return { user: updated!, action: "updated" };
  }

  const created = createSaasSubscriber({
    email: cleanEmail,
    name: params.name,
    companyName: params.companyName || params.name || cleanEmail.split("@")[0],
    planTier: params.planTier,
    slotsLimit: params.slotsLimit,
    subscriptionStatus: params.subscriptionStatus,
    lemonSubscriptionId: params.lemonSubscriptionId,
    lemonCustomerId: params.lemonCustomerId,
    billingPeriod: params.billingPeriod,
  });
  return { user: created, action: "created" };
}

export function updateSubscriberStatusFromWebhook(params: {
  lemonSubscriptionId?: string;
  email?: string;
  subscriptionStatus: SubscriptionStatus;
}): SaaSUser | null {
  const db = getSocialSellingDb();
  let row: SubscriberRow | undefined;

  if (params.lemonSubscriptionId) {
    row = db
      .prepare("SELECT * FROM saas_subscribers WHERE lemon_subscription_id = ?")
      .get(params.lemonSubscriptionId) as SubscriberRow | undefined;
  }
  if (!row && params.email) {
    row = db
      .prepare("SELECT * FROM saas_subscribers WHERE LOWER(email) = LOWER(?)")
      .get(params.email.trim()) as SubscriberRow | undefined;
  }
  if (!row || row.role === "super_admin") return null;

  return updateSaasSubscriber(row.id, {
    subscriptionStatus: params.subscriptionStatus,
  });
}

export function getGlobalSaaSStatsFromDb(): GlobalSaaSStats {
  const db = getSocialSellingDb();
  const users = listSaasSubscribers();
  let totalSlotsAllocated = 0;
  let activeSubscriptions = 0;
  let starterCount = 0;
  let growthCount = 0;
  let businessCount = 0;

  for (const u of users) {
    if (u.role !== "super_admin") {
      totalSlotsAllocated += u.slotsLimit || 1;
      if (u.subscriptionStatus === "active") activeSubscriptions++;
    }
    if (u.planTier === "starter") starterCount++;
    if (u.planTier === "growth") growthCount++;
    if (u.planTier === "business") businessCount++;
  }

  const accountsRow = db
    .prepare("SELECT COUNT(*) as total FROM linkedin_accounts_v2")
    .get() as { total: number };

  return {
    totalSubscribers: users.filter((u) => u.role !== "super_admin").length,
    activeSubscriptions,
    totalSlotsAllocated,
    totalConnectedAccounts: Math.max(1, accountsRow.total || 0),
    starterCount,
    growthCount,
    businessCount,
  };
}
