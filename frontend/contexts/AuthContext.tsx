"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  timezone: string;
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");
      const userData = await res.json();
      setUser(userData);
      setStatus("authenticated");
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("403")) {
        setUser(null);
        setStatus("unauthenticated");
      } else {
        setUser(null);
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: any) => {
    setStatus("loading");
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      await refreshUser();
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  };

  const register = async (data: any) => {
    setStatus("loading");
    try {
      // Register
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // Registration does not auto-login in backend, so we log in immediately
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      await refreshUser();
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      // Proceed to clear state even if backend logout fails (e.g., already expired)
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, refreshUser }}>
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
