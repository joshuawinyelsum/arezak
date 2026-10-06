"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  phone_verified: boolean;
  phone_verification_required: boolean;
  profile_photo_url: string | null;
  handle: string | null;
  status: "authenticated";
}

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  socialLogin: (provider: string, token: string, extraData?: any) => Promise<void>;
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
      if (err.status === 401 || err.status === 403) {
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
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await refreshUser();
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  };

  const socialLogin = async (provider: string, token: string, extraData: any = {}) => {
    const prevStatus = status;
    setStatus("loading");
    try {
      await apiFetch("/auth/social", {
        method: "POST",
        body: JSON.stringify({ provider, token, ...extraData }),
      });
      await refreshUser();
    } catch (error) {
      setStatus(prevStatus);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {} finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, login, register, socialLogin, logout, refreshUser }}>
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

