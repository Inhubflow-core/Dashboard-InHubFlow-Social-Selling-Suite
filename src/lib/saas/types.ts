export type PlanTier = "starter" | "growth" | "business" | "custom";

export type SubscriptionStatus = "active" | "trial" | "past_due" | "canceled";

export type UserRole = "super_admin" | "client_admin" | "member";

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface SaaSPlanConfig {
  id: PlanTier;
  name: string;
  tagline: string;
  slots: number;
  monthlyPrice: number;
  annualPrice: number; // Por mes pagando anualmente
  popular?: boolean;
  features: PlanFeature[];
  limits: {
    dailyInvitationsPerAccount: number;
    dailyMessagesPerAccount: number;
    dailyProfileVisitsPerAccount: number;
    signalMonitorsMax: number;
    activeWorkflowsMax: number;
    aiPostGenerationMonthly: number;
  };
}

export interface SaaSUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyName?: string;
  slotsLimit: number;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  avatarUrl?: string;
  ownerId?: string | null;
  assignedAccountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  ownerId: string;
  assignedAccountId: string | null;
  accountName?: string | null;
  accountEmail?: string | null;
  accountAuthenticated?: boolean;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: "admin" | "member";
  inviteCode: string;
  ownerId: string;
  assignedAccountId: string | null;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  createdAt: string;
  inviteUrl: string;
}

export interface UserCapacity {
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  isAtCapacity: boolean;
  usagePercentage: number;
  teamSlotsTotal?: number;
  teamSlotsUsed?: number;
  teamSlotsAvailable?: number;
  isTeamAtCapacity?: boolean;
}

export interface GlobalSaaSStats {
  totalSubscribers: number;
  activeSubscriptions: number;
  totalSlotsAllocated: number;
  totalConnectedAccounts: number;
  starterCount: number;
  growthCount: number;
  businessCount: number;
}
