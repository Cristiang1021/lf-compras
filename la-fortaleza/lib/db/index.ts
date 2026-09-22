import * as schema from "./schema";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

/** Bump when schema tables change so hot-reload recreates drizzle query API. */
const SCHEMA_VERSION = "docs-v3b-turso-vercel";

export type AppDb = LibSQLDatabase<typeof schema>;

export function useTurso() {
  const flag = process.env.USE_TURSO?.toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  const url = process.env.TURSO_DATABASE_URL || "";
  return url.startsWith("libsql://") || url.startsWith("https://");
}

const globalForDb = globalThis as unknown as {
  __lfSchemaVersion?: string;
  __lfDb?: AppDb;
  __lfTursoClient?: import("@libsql/client").Client;
  __lfSqlite?: import("better-sqlite3").Database;
};

function createTursoDb(): AppDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/libsql") as typeof import("drizzle-orm/libsql");

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL es obligatorio cuando USE_TURSO=true");
  }
  if (!authToken) {
    throw new Error("TURSO_AUTH_TOKEN es obligatorio cuando USE_TURSO=true");
  }

  const client = createClient({ url, authToken });
  globalForDb.__lfTursoClient = client;
  return drizzle(client, { schema });
}

function createLocalDb(): AppDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } =
    require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");

  const raw = process.env.DATABASE_URL ?? "file:./data/la-fortaleza.db";
  const filePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });

  const sqlite = new Database(absolute);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  globalForDb.__lfSqlite = sqlite;
  // Misma superficie de API (select/insert/query) que libsql
  return drizzle(sqlite, { schema }) as unknown as AppDb;
}

function createDb(): AppDb {
  return useTurso() ? createTursoDb() : createLocalDb();
}

const needsRefresh = globalForDb.__lfSchemaVersion !== SCHEMA_VERSION;

export const db: AppDb = needsRefresh
  ? createDb()
  : (globalForDb.__lfDb ?? createDb());

globalForDb.__lfSchemaVersion = SCHEMA_VERSION;
globalForDb.__lfDb = db;

export type Db = typeof db;

/** Cliente libSQL (solo Turso). */
export function getTursoClient() {
  return globalForDb.__lfTursoClient ?? null;
}

/** Handle better-sqlite3 (solo local). */
export function getLocalSqlite() {
  return globalForDb.__lfSqlite ?? null;
}
