"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { User } from "@/lib/api/types";

type SessionValue = {
  user: User | null;
  setUser: (value: User | null) => void;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function SessionProvider({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const value = useMemo<SessionValue>(() => ({ user, setUser }), [user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession должен вызываться внутри SessionProvider");
  }
  return context;
}

