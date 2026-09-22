import { getLocalSqlite, getTursoClient, useTurso } from "./index";

const ENSURE_VERSION = "docs-v3b-turso-vercel";

const globalEnsure = globalThis as unknown as {
  __lfEnsureVersion?: string;
};

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uidx ON users(username);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_read INTEGER NOT NULL DEFAULT 0,
  can_create INTEGER NOT NULL DEFAULT 0,
  can_update INTEGER NOT NULL DEFAULT 0,
  can_delete INTEGER NOT NULL DEFAULT 0,
  can_export INTEGER NOT NULL DEFAULT 0,
  field_access TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS role_module_uidx ON role_permissions(role, module);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  producto TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS products_codigo_uidx ON products(codigo);

CREATE TABLE IF NOT EXISTS bodegas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS bodegas_nombre_uidx ON bodegas(nombre);

CREATE TABLE IF NOT EXISTS compra_docs (
  id TEXT PRIMARY KEY,
  titulo TEXT,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'PEDIDO',
  locked INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS compra_lineas (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES compra_docs(id),
  orden INTEGER NOT NULL DEFAULT 0,
  product_id TEXT NOT NULL REFERENCES products(id),
  codigo TEXT NOT NULL,
  producto TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  cantidad REAL,
  fecha_pedido TEXT,
  cantidad_recibida REAL,
  proveedor TEXT,
  fecha_recepcion TEXT,
  factura_nota_venta TEXT,
  observaciones TEXT
);

CREATE TABLE IF NOT EXISTS transferencia_docs (
  id TEXT PRIMARY KEY,
  titulo TEXT,
  notas TEXT,
  locked INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS transferencia_lineas (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES transferencia_docs(id),
  orden INTEGER NOT NULL DEFAULT 0,
  product_id TEXT NOT NULL REFERENCES products(id),
  codigo TEXT NOT NULL,
  producto TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  cantidad REAL,
  fecha_transferencia TEXT,
  origen_bodega_id TEXT REFERENCES bodegas(id),
  destino_bodega_id TEXT REFERENCES bodegas(id),
  observacion TEXT
);

CREATE TABLE IF NOT EXISTS produccion_docs (
  id TEXT PRIMARY KEY,
  titulo TEXT,
  notas TEXT,
  locked INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS produccion_lineas (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES produccion_docs(id),
  orden INTEGER NOT NULL DEFAULT 0,
  product_id TEXT NOT NULL REFERENCES products(id),
  codigo TEXT NOT NULL,
  producto TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  cantidad REAL,
  fecha_produccion TEXT,
  detalle_produccion TEXT,
  origen_bodega_id TEXT REFERENCES bodegas(id),
  destino_bodega_id TEXT REFERENCES bodegas(id),
  observaciones TEXT
);
`;

async function runSoftMigrationsLocal(
  sqlite: import("better-sqlite3").Database,
) {
  try {
    sqlite.exec(
      `ALTER TABLE compra_docs ADD COLUMN estado TEXT NOT NULL DEFAULT 'PEDIDO'`,
    );
  } catch {
    // ya existe
  }
  try {
    sqlite.exec(
      `UPDATE compra_docs SET locked = 0 WHERE COALESCE(estado, 'PEDIDO') = 'PEDIDO'`,
    );
  } catch {
    // ignore
  }
  try {
    sqlite.exec(`
      UPDATE role_permissions
      SET can_update = 1
      WHERE module = 'compra_recepcion' AND role != 'SUPER_USUARIO'
    `);
  } catch {
    // ignore
  }
}

async function runSoftMigrationsTurso(
  client: import("@libsql/client").Client,
) {
  try {
    await client.execute(
      `ALTER TABLE compra_docs ADD COLUMN estado TEXT NOT NULL DEFAULT 'PEDIDO'`,
    );
  } catch {
    // ya existe
  }
  try {
    await client.execute(
      `UPDATE compra_docs SET locked = 0 WHERE COALESCE(estado, 'PEDIDO') = 'PEDIDO'`,
    );
  } catch {
    // ignore
  }
  try {
    await client.execute(`
      UPDATE role_permissions
      SET can_update = 1
      WHERE module = 'compra_recepcion' AND role != 'SUPER_USUARIO'
    `);
  } catch {
    // ignore
  }
}

export async function ensureDatabase() {
  if (globalEnsure.__lfEnsureVersion === ENSURE_VERSION) return;

  if (useTurso()) {
    const client = getTursoClient();
    if (!client) throw new Error("Cliente Turso no inicializado");
    await client.executeMultiple(DDL);
    await runSoftMigrationsTurso(client);
  } else {
    const sqlite = getLocalSqlite();
    if (!sqlite) throw new Error("SQLite local no inicializado");
    sqlite.exec(DDL);
    await runSoftMigrationsLocal(sqlite);
  }

  globalEnsure.__lfEnsureVersion = ENSURE_VERSION;
}
