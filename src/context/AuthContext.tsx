"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { SaaSUser, UserCapacity, PlanTier, SwitchableAccountItem } from "@/lib/saas/types";
import {
  getCurrentUser,
  setCurrentUserId,
  getUserCapacity,
  getStoredUsers,
  updateSubscriber,
  subscribeToSaaSStore,
  canAddAccountForUser,
  getSwitchableAccountsForUser,
} from "@/lib/saas/store";
import { getPlanConfig } from "@/lib/saas/plans";
import { getActiveAccountForUser, setActiveAccountId } from "@/lib/unipile/store";

interface AuthContextType {
  currentUser: SaaSUser;
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  capacity: UserCapacity;
  allUsers: SaaSUser[];
  switchableUsers: SwitchableAccountItem[];
  canConnectAccount: boolean;
  switchUser: (userId: string) => void;
  updateUserPlan: (planTier: PlanTier, customSlots?: number) => void;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setUser] = useState<SaaSUser>(() => getCurrentUser());
  const [allUsers, setAllUsers] = useState<SaaSUser[]>(() => getStoredUsers());
  const [capacity, setCapacity] = useState<UserCapacity>(() => getUserCapacity());
  const [masterUserId, setMasterUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return "usr-super-admin-01";
    return localStorage.getItem("inhubflow_master_user_id") || "usr-super-admin-01";
  });

  const syncState = () => {
    const user = getCurrentUser();
    setUser(user);
    setAllUsers(getStoredUsers());
    setCapacity(getUserCapacity(user.id));
  };

  useEffect(() => {
    syncState();
    const unsubscribe = subscribeToSaaSStore(syncState);
    return () => unsubscribe();
  }, []);

  const isSuperAdmin = useMemo(() => {
    return (
      currentUser.role === "super_admin" ||
      currentUser.email.trim().toLowerCase() === "inhubflow@gmail.com"
    );
  }, [currentUser]);

  const isClientAdmin = useMemo(() => {
    return currentUser.role === "client_admin" || isSuperAdmin;
  }, [currentUser, isSuperAdmin]);

  const canConnectAccount = useMemo(() => {
    return canAddAccountForUser(currentUser.id);
  }, [currentUser, capacity]);

  const switchableUsers = useMemo(() => {
    return getSwitchableAccountsForUser(currentUser, masterUserId);
  }, [currentUser, masterUserId, allUsers]);

  const switchUser = (userId: string) => {
    const isCurrentlyMaster =
      currentUser.role === "super_admin" ||
      currentUser.email.trim().toLowerCase() === "inhubflow@gmail.com";

    if (isCurrentlyMaster && userId !== currentUser.id) {
      if (typeof window !== "undefined") {
        localStorage.setItem("inhubflow_master_user_id", currentUser.id);
      }
      setMasterUserId(currentUser.id);
    } else if (userId === "usr-super-admin-01" || userId === masterUserId) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("inhubflow_master_user_id");
      }
      setMasterUserId(null);
    }
    setCurrentUserId(userId);
    const targetUser = getStoredUsers().find((u) => u.id === userId);
    if (targetUser) {
      const targetAcc = getActiveAccountForUser(targetUser);
      if (targetAcc) {
        setActiveAccountId(targetAcc.id);
      }
    }
  };

  const updateUserPlan = (planTier: PlanTier, customSlots?: number) => {
    const plan = getPlanConfig(planTier);
    const slots = customSlots || plan.slots;
    updateSubscriber(currentUser.id, {
      planTier,
      slotsLimit: slots,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSuperAdmin,
        isClientAdmin,
        capacity,
        allUsers,
        switchableUsers,
        canConnectAccount,
        switchUser,
        updateUserPlan,
        refreshUserData: syncState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
