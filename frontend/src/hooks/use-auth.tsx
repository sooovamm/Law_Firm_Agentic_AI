"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { tokenStore } from "@/lib/token-store";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  requestRegistrationOtp: (payload: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
  }) => Promise<{ expires_in_minutes: number }>;
  verifyRegistrationOtp: (payload: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    otp_code: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const resp = await api.login({ email, password });
    tokenStore.set(resp.tokens);
    setUser(resp.user);
    router.push("/dashboard");
  }

  async function requestRegistrationOtp(payload: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
  }) {
    const resp = await api.requestRegistrationOtp(payload);
    return { expires_in_minutes: resp.expires_in_minutes };
  }

  async function verifyRegistrationOtp(payload: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    otp_code: string;
  }) {
    const resp = await api.verifyRegistrationOtp(payload);
    tokenStore.set(resp.tokens);
    setUser(resp.user);
    router.push("/dashboard");
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, requestRegistrationOtp, verifyRegistrationOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
