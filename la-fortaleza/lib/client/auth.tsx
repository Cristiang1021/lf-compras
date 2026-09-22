"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "@/lib/client/api";

export type Role =
  | "SUPER_USUARIO"
  | "CONTABILIDAD"
  | "CHEF"
  | "BODEGA";

export type Permission = {
  module: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  fieldAccess: Record<string, boolean>;
};

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  permissions: Permission[];
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (
    module: string,
    action: "canRead" | "canCreate" | "canUpdate" | "canDelete" | "canExport",
  ) => boolean;
  fieldOk: (module: string, field: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      const data = await Promise.race([
        api<{ user: AuthUser; permissions: Permission[] }>("/api/auth/me"),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Tiempo de espera agotado")), 8000),
        ),
      ]);
      setUser(data.user);
      setPermissions(data.permissions);
    } catch {
      setToken(null);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Si algo se cuelga, no dejar la UI en "Cargando…" para siempre
    const failSafe = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(failSafe);
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api<{
      token: string;
      user: AuthUser;
      permissions: Permission[];
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    setUser(data.user);
    setPermissions(data.permissions);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  const can = useCallback(
    (
      module: string,
      action: "canRead" | "canCreate" | "canUpdate" | "canDelete" | "canExport",
    ) => {
      if (user?.role === "SUPER_USUARIO") return true;
      const row = permissions.find((p) => p.module === module);
      return Boolean(row?.[action]);
    },
    [permissions, user],
  );

  const fieldOk = useCallback(
    (module: string, field: string) => {
      if (user?.role === "SUPER_USUARIO") return true;
      const row = permissions.find((p) => p.module === module);
      if (!row) return false;
      const keys = Object.keys(row.fieldAccess || {});
      if (keys.length === 0) return true;
      return row.fieldAccess[field] === true;
    },
    [permissions, user],
  );

  const value = useMemo(
    () => ({ user, permissions, loading, login, logout, refresh, can, fieldOk }),
    [user, permissions, loading, login, logout, refresh, can, fieldOk],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
