"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { SaaSUser, UserCapacity, PlanTier, SwitchableAccountItem } from "@/lib/saas/types";
import {
  getCurrentUser,
  setCurrentUserId,
  getSessionUser,
  setSessionUserId,
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
  sessionUser: SaaSUser;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  capacity: UserCapacity;
  allUsers: SaaSUser[];
  switchableUsers: SwitchableAccountItem[];
  canConnectAccount: boolean;
  switchUser: (userId: string) => void;
  resetToSessionUser: () => void;
  switchSessionUser: (userId: string) => void;
  updateUserPlan: (planTier: PlanTier, customSlots?: number) => void;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionUser, setSessionUser] = useState<SaaSUser>(() => getSessionUser());
  const [currentUser, setUser] = useState<SaaSUser>(() => getCurrentUser());
  const [allUsers, setAllUsers] = useState<SaaSUser[]>(() => getStoredUsers());
  const [capacity, setCapacity] = useState<UserCapacity>(() => getUserCapacity());

  const syncState = () => {
    const sUser = getSessionUser();
    const cUser = getCurrentUser();
    setSessionUser(sUser);
    setUser(cUser);
    setAllUsers(getStoredUsers());
    setCapacity(getUserCapacity(cUser.id));
  };

  useEffect(() => {
    syncState();
    const unsubscribe = subscribeToSaaSStore(syncState);
    return () => unsubscribe();
  }, []);

  const isImpersonating = useMemo(() => {
    return currentUser.id !== sessionUser.id;
  }, [currentUser, sessionUser]);

  const isSuperAdmin = useMemo(() => {
    return (
      sessionUser.role === "super_admin" ||
      sessionUser.email.trim().toLowerCase() === "inhubflow@gmail.com" ||
      currentUser.role === "super_admin"
    );
  }, [sessionUser, currentUser]);

  const isClientAdmin = useMemo(() => {
    return sessionUser.role === "client_admin" || isSuperAdmin;
  }, [sessionUser, isSuperAdmin]);

  const canConnectAccount = useMemo(() => {
    return canAddAccountForUser(currentUser.id);
  }, [currentUser, capacity]);

  const switchableUsers = useMemo(() => {
    return getSwitchableAccountsForUser(currentUser, sessionUser);
  }, [currentUser, sessionUser, allUsers]);

  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
    const targetUser = getStoredUsers().find((u) => u.id === userId);
    if (targetUser) {
      const targetAcc = getActiveAccountForUser(targetUser);
      if (targetAcc) {
        setActiveAccountId(targetAcc.id);
      }
    }
  };

  const resetToSessionUser = () => {
    switchUser(sessionUser.id);
  };

  const switchSessionUser = (newSessionUserId: string) => {
    setSessionUserId(newSessionUserId);
    setCurrentUserId(newSessionUserId);
    const targetUser = getStoredUsers().find((u) => u.id === newSessionUserId);
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
        sessionUser,
        isImpersonating,
        isSuperAdmin,
        isClientAdmin,
        capacity,
        allUsers,
        switchableUsers,
        canConnectAccount,
        switchUser,
        resetToSessionUser,
        switchSessionUser,
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

