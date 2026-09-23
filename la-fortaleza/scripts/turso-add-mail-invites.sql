-- La Fortaleza — solo lo nuevo de esta sesión (correo + invitaciones)
-- Ejecutar en Turso sobre la base que YA está en producción.
-- No recrea tablas existentes.

-- 1) Email en usuarios (si ya existe la columna, Turso dirá duplicate column: ignóralo)
ALTER TABLE users ADD COLUMN email TEXT;

-- 2) Índice único de email (varios NULL están permitidos)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users(email);

-- 3) Servidor de correo saliente (configurado luego en /admin/correo)
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

-- 4) Invitaciones
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
