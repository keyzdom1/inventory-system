"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getStoredUser, setStoredUser, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    api.auth
      .me()
      .then((fresh) => {
        if (!fresh.is_approved || !fresh.is_active) {
          setToken(null);
          setStoredUser(null);
          setUser(null);
        } else {
          setStoredUser(fresh);
          setUser(fresh);
        }
      })
      .catch(() => {
        setToken(null);
        setStoredUser(null);
        setUser(null);
      });
  }, [loading, user]);

  const login = useCallback(async (username: string, password: string) => {
    const token = await api.auth.login(username, password);
    setToken(token.access_token);
    setStoredUser(token.user);
    setUser(token.user);
    router.push("/");
  }, [router]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const { api } = await import("@/lib/api");
    await api.auth.register(username, email, password);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
