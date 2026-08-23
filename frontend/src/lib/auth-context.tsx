"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { track } from "@/lib/analytics";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // The access token lives only in memory, so it's gone on every full
    // page load. Recover it via a silent refresh: the browser sends the
    // httpOnly refresh-token cookie automatically (same-origin request to
    // our own Next.js proxy route), and if a valid session exists we get a
    // fresh access token back without the user having to log in again.
    let cancelled = false;
    (async () => {
      const token = await api.refreshAccessToken();
      if (cancelled) return;
      setIsAuthenticated(!!token);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Wired so api.ts's request()/streamChat() can force a logout when a
    // refresh attempt definitively fails (not a network blip -- the
    // session is actually over), without api.ts importing this module.
    api.setAuthExpiredHandler(() => {
      setIsAuthenticated(false);
      router.push("/login");
    });
    return () => api.setAuthExpiredHandler(null);
  }, [router]);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    setIsAuthenticated(true);
  };

  const signup = async (email: string, password: string) => {
    await api.signup(email, password);
    setIsAuthenticated(true);
    track("signup_completed");
  };

  const logout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
