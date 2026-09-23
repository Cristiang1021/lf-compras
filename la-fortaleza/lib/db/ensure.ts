import { getLibsqlClient } from "./index";

const ENSURE_VERSION = "docs-v6-password-reset";

const globalEnsure = globalThis as unknown as {
  __lfEnsureVersion?: string;
};

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uidx ON users(username);

CREATE TABLE IF NOT EXISTS mail_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  encryption TEXT NOT NULL DEFAULT 'ssl',
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  invited_by TEXT REFERENCES users(id),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_uidx ON invitations(token_hash);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_uidx ON password_resets(token_hash);

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

async function runSoftMigrations(client: import("@libsql/client").Client) {
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
  try {
    await client.execute(`ALTER TABLE users ADD COLUMN email TEXT`);
  } catch {
    // ya existe
  }
  try {
    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users(email)`,
    );
  } catch {
    // ignore
  }
}

export async function ensureDatabase() {
  if (globalEnsure.__lfEnsureVersion === ENSURE_VERSION) return;

  const client = getLibsqlClient();
  if (!client) throw new Error("Cliente de base no inicializado");
  await client.executeMultiple(DDL);
  await runSoftMigrations(client);

  globalEnsure.__lfEnsureVersion = ENSURE_VERSION;
}
