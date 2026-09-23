import * as schema from "./schema";
import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

/** Bump when schema tables change so hot-reload recreates drizzle query API. */
const SCHEMA_VERSION = "docs-v6-password-reset";

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
  __lfLibsqlClient?: Client;
};

function resolveLocalFileUrl(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");

  const raw = process.env.DATABASE_URL ?? "file:./data/la-fortaleza.db";
  const filePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  return `file:${absolute.replace(/\\/g, "/")}`;
}

function createLibsqlClient(): Client {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");

  if (useTurso()) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error("TURSO_DATABASE_URL es obligatorio cuando USE_TURSO=true");
    }
    if (!authToken) {
      throw new Error("TURSO_AUTH_TOKEN es obligatorio cuando USE_TURSO=true");
    }
    return createClient({ url, authToken });
  }

  return createClient({ url: resolveLocalFileUrl() });
}

function createDb(): AppDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/libsql") as typeof import("drizzle-orm/libsql");
  const client = createLibsqlClient();
  globalForDb.__lfLibsqlClient = client;
  return drizzle(client, { schema });
}

const needsRefresh = globalForDb.__lfSchemaVersion !== SCHEMA_VERSION;

export const db: AppDb = needsRefresh
  ? createDb()
  : (globalForDb.__lfDb ?? createDb());

globalForDb.__lfSchemaVersion = SCHEMA_VERSION;
globalForDb.__lfDb = db;

export type Db = typeof db;

/** Cliente libSQL (Turso en producción o archivo local). */
export function getTursoClient() {
  return globalForDb.__lfLibsqlClient ?? null;
}

/** Alias de getTursoClient — ambos modos usan el mismo cliente. */
export function getLibsqlClient() {
  return globalForDb.__lfLibsqlClient ?? null;
}
