"use client";

import React, { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGetMeQuery, useLoginMutation, useLogoutMutation } from "@/lib/api/authApi";
import { UserContext } from "@/types/auth";

interface AuthContextType {
  user: UserContext | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // RTK Query fetches session context automatically on mount
  const { data: user = null, isLoading } = useGetMeQuery();
  const [triggerLogin] = useLoginMutation();
  const [triggerLogout] = useLogoutMutation();

  // If unauthorized and not on login page, redirect to login
  useEffect(() => {
    if (!isLoading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    await triggerLogin({ email, password }).unwrap();
    router.push("/");
  };

  const logout = async () => {
    try {
      await triggerLogout().unwrap();
    } catch {
      // Ignore errors on logout
    } finally {
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
