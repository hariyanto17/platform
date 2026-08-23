"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

export interface UserAccess {
  applicationCode: string;
  role: {
    code: string;
    name: string;
  };
  permissions: string[];
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  };
  access: UserAccess[];
}

interface AuthContextType {
  user: UserContext | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkSession = React.useCallback(async () => {
    try {
      const data = await apiClient.get<UserContext>("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
      if (pathname !== "/login") {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        checkSession();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [checkSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<UserContext>("/api/auth/login", { email, password });
      setUser(data);
      router.push("/");
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkSession }}>
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
