"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/client/auth";
import { roleLabel } from "@/lib/client/labels";

const MAIN = [
  { href: "/", label: "Inicio", module: null },
  { href: "/productos", label: "Productos", module: "productos" },
  { href: "/compra-recepcion", label: "Compra vs Recepción", module: "compra_recepcion" },
  { href: "/transferencias", label: "Transferencias", module: "transferencias" },
  { href: "/produccion", label: "Producción", module: "produccion" },
  { href: "/bodegas", label: "Bodegas", module: "bodegas" },
] as const;

const ADMIN = [
  { href: "/admin/usuarios", label: "Usuarios", module: "usuarios" },
  { href: "/admin/correo", label: "Correo", module: "usuarios" },
  { href: "/admin/permisos", label: "Permisos", module: "permisos" },
] as const;

export function AppChrome({ children }: { children: React.ReactNode }) {
  const { user, logout, can, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicPage =
    pathname === "/login" ||
    pathname === "/recuperar" ||
    pathname.startsWith("/invitar/") ||
    pathname.startsWith("/recuperar/");

  if (publicPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ paddingTop: 48 }}>
        <p className="body-sm">Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const adminVisible = ADMIN.some((item) => can(item.module, "canRead"));

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">
          La Fortaleza
          <span>Inventario</span>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Módulos</div>
          {MAIN.map((item) => {
            if (item.module && !can(item.module, "canRead")) return null;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${active ? " is-active" : ""}`}
              >
                <span className="dot" aria-hidden />
                {item.label}
              </Link>
            );
          })}

          {adminVisible && (
            <>
              <div className="sidebar-section">Administración</div>
              {ADMIN.map((item) => {
                if (!can(item.module, "canRead")) return null;
                if (item.href === "/admin/correo" && user.role !== "SUPER_USUARIO") {
                  return null;
                }
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link${active ? " is-active" : ""}`}
                  >
                    <span className="dot" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <strong>{user.fullName}</strong>
            <span>{roleLabel(user.role)}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="app-main">
        <div className="app-shell">{children}</div>
      </div>
    </div>
  );
}
