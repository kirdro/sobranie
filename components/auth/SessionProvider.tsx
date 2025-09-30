"use client";

import { createContext, useContext, useMemo, useEffect } from "react";
import { useUnit } from "effector-react";
import { $user, sessionCheckRequested } from "@/lib/effector";

import type { User } from "@/lib/api/types";

type SessionValue = {
  user: User | null;
  checkSession: () => void;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function SessionProvider({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  const [user, checkSession] = useUnit([$user, sessionCheckRequested]);

  // Check session on mount and when tab becomes visible
  useEffect(() => {
    // Only check if we don't have a user and there was an initial user
    // This means the server found a user but client state is empty
    if (!user && initialUser) {
      checkSession();
    } else if (!user && !initialUser) {
      // No user on server or client, check if there's a valid session
      checkSession();
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkSession, user, initialUser]);

  const value = useMemo<SessionValue>(() => ({ user, checkSession }), [user, checkSession]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession должен вызываться внутри SessionProvider");
  }
  return context;
}

