"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client/auth";
import { roleLabel } from "@/lib/client/labels";

const MODULES = [
  {
    href: "/productos",
    title: "Productos",
    desc: "Consulta y administra el catálogo de insumos y productos.",
    module: "productos",
  },
  {
    href: "/compra-recepcion",
    title: "Compra vs recepción",
    desc: "Registra pedidos de compra y completa lo que llega a bodega.",
    module: "compra_recepcion",
  },
  {
    href: "/transferencias",
    title: "Transferencias",
    desc: "Mueve productos entre bodegas de forma controlada.",
    module: "transferencias",
  },
  {
    href: "/produccion",
    title: "Producción",
    desc: "Registra lo preparado o transformado en cocina.",
    module: "produccion",
  },
] as const;

export default function HomePage() {
  const { user, loading, can } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <>
      <section className="hero-panel">
        <p className="logo-pill" style={{ marginBottom: 8 }}>
          La Fortaleza
        </p>
        <h1 className="display-xl">Bienvenido, {user.fullName.split(" ")[0]}</h1>
        <p>
          Desde aquí controlas el inventario del restaurante: productos,
          compras, transferencias y producción. También puedes descargar tus
          registros en Excel.
        </p>
        <div className="row" style={{ marginTop: 18 }}>
          <Link href="/productos" className="btn btn-primary">
            Ver productos
          </Link>
          <span className="filter-chip is-active">{roleLabel(user.role)}</span>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {MODULES.map((m) => {
          if (!can(m.module, "canRead")) return null;
          return (
            <Link key={m.href} href={m.href} className="feature-card">
              <h2 className="heading-md">{m.title}</h2>
              <p className="body-sm" style={{ margin: "8px 0 16px" }}>
                {m.desc}
              </p>
              <span className="btn btn-secondary" style={{ pointerEvents: "none" }}>
                Abrir
              </span>
            </Link>
          );
        })}
      </section>
    </>
  );
}
