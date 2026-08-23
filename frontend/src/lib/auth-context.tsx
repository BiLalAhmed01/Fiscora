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
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsAuthenticated(!!api.getToken());
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    api.setToken(access_token);
    setIsAuthenticated(true);
  };

  const signup = async (email: string, password: string) => {
    const { access_token } = await api.signup(email, password);
    api.setToken(access_token);
    setIsAuthenticated(true);
    track("signup_completed");
  };

  const logout = () => {
    api.clearToken();
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
