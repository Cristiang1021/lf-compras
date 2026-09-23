import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const ROLES = [
  "SUPER_USUARIO",
  "CONTABILIDAD",
  "CHEF",
  "BODEGA",
] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = [
  "productos",
  "compra_recepcion",
  "transferencias",
  "produccion",
  "bodegas",
  "usuarios",
  "permisos",
] as const;
export type ModuleKey = (typeof MODULES)[number];

export const COMPRA_FIELDS = [
  "cantidad",
  "fechaPedido",
  "cantidadRecibida",
  "proveedor",
  "fechaRecepcion",
  "facturaNotaVenta",
  "observaciones",
] as const;

export const TRANSFERENCIA_FIELDS = [
  "cantidad",
  "fechaTransferencia",
  "origenBodegaId",
  "destinoBodegaId",
  "observacion",
] as const;

export const PRODUCCION_FIELDS = [
  "cantidad",
  "fechaProduccion",
  "detalleProduccion",
  "origenBodegaId",
  "destinoBodegaId",
  "observaciones",
] as const;

export const PRODUCTO_FIELDS = ["codigo", "producto", "unidadMedida"] as const;

export type FieldAccessMap = Record<string, boolean>;

export const MAIL_ENCRYPTIONS = ["none", "starttls", "ssl"] as const;
export type MailEncryption = (typeof MAIL_ENCRYPTIONS)[number];

export const INVITE_STATUSES = ["pendiente", "aceptada", "cancelada"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    role: text("role").$type<Role>().notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("users_username_uidx").on(t.username),
    uniqueIndex("users_email_uidx").on(t.email),
  ],
);

export const mailServers = sqliteTable("mail_servers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  encryption: text("encryption").$type<MailEncryption>().notNull().default("ssl"),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const passwordResets = sqliteTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("password_resets_token_uidx").on(t.tokenHash)],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    role: text("role").$type<Role>().notNull(),
    fullName: text("full_name"),
    tokenHash: text("token_hash").notNull(),
    status: text("status").$type<InviteStatus>().notNull().default("pendiente"),
    invitedBy: text("invited_by").references(() => users.id),
    expiresAt: text("expires_at").notNull(),
    acceptedAt: text("accepted_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("invitations_token_uidx").on(t.tokenHash)],
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    role: text("role").$type<Role>().notNull(),
    module: text("module").$type<ModuleKey>().notNull(),
    canRead: integer("can_read", { mode: "boolean" }).notNull().default(false),
    canCreate: integer("can_create", { mode: "boolean" }).notNull().default(false),
    canUpdate: integer("can_update", { mode: "boolean" }).notNull().default(false),
    canDelete: integer("can_delete", { mode: "boolean" }).notNull().default(false),
    canExport: integer("can_export", { mode: "boolean" }).notNull().default(false),
    fieldAccess: text("field_access", { mode: "json" })
      .$type<FieldAccessMap>()
      .notNull()
      .default({}),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("role_module_uidx").on(t.role, t.module)],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    codigo: text("codigo").notNull(),
    producto: text("producto").notNull(),
    unidadMedida: text("unidad_medida").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("products_codigo_uidx").on(t.codigo)],
);

export const bodegas = sqliteTable(
  "bodegas",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("bodegas_nombre_uidx").on(t.nombre)],
);

const docAudit = {
  locked: integer("locked", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

/** Una compra = un documento con muchas líneas de producto */
export const compraDocs = sqliteTable("compra_docs", {
  id: text("id").primaryKey(),
  titulo: text("titulo"),
  notas: text("notas"),
  /** PEDIDO = esperando recepción | CERRADO = terminado */
  estado: text("estado").notNull().default("PEDIDO"),
  ...docAudit,
});

export const compraLineas = sqliteTable("compra_lineas", {
  id: text("id").primaryKey(),
  docId: text("doc_id")
    .notNull()
    .references(() => compraDocs.id),
  orden: integer("orden").notNull().default(0),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  codigo: text("codigo").notNull(),
  producto: text("producto").notNull(),
  unidadMedida: text("unidad_medida").notNull(),
  cantidad: real("cantidad"),
  fechaPedido: text("fecha_pedido"),
  cantidadRecibida: real("cantidad_recibida"),
  proveedor: text("proveedor"),
  fechaRecepcion: text("fecha_recepcion"),
  facturaNotaVenta: text("factura_nota_venta"),
  observaciones: text("observaciones"),
});

export const transferenciaDocs = sqliteTable("transferencia_docs", {
  id: text("id").primaryKey(),
  titulo: text("titulo"),
  notas: text("notas"),
  ...docAudit,
});

export const transferenciaLineas = sqliteTable("transferencia_lineas", {
  id: text("id").primaryKey(),
  docId: text("doc_id")
    .notNull()
    .references(() => transferenciaDocs.id),
  orden: integer("orden").notNull().default(0),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  codigo: text("codigo").notNull(),
  producto: text("producto").notNull(),
  unidadMedida: text("unidad_medida").notNull(),
  cantidad: real("cantidad"),
  fechaTransferencia: text("fecha_transferencia"),
  origenBodegaId: text("origen_bodega_id").references(() => bodegas.id),
  destinoBodegaId: text("destino_bodega_id").references(() => bodegas.id),
  observacion: text("observacion"),
});

export const produccionDocs = sqliteTable("produccion_docs", {
  id: text("id").primaryKey(),
  titulo: text("titulo"),
  notas: text("notas"),
  ...docAudit,
});

export const produccionLineas = sqliteTable("produccion_lineas", {
  id: text("id").primaryKey(),
  docId: text("doc_id")
    .notNull()
    .references(() => produccionDocs.id),
  orden: integer("orden").notNull().default(0),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  codigo: text("codigo").notNull(),
  producto: text("producto").notNull(),
  unidadMedida: text("unidad_medida").notNull(),
  cantidad: real("cantidad"),
  fechaProduccion: text("fecha_produccion"),
  detalleProduccion: text("detalle_produccion"),
  origenBodegaId: text("origen_bodega_id").references(() => bodegas.id),
  destinoBodegaId: text("destino_bodega_id").references(() => bodegas.id),
  observaciones: text("observaciones"),
});

export type User = typeof users.$inferSelect;
export type MailServer = typeof mailServers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Bodega = typeof bodegas.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type CompraDoc = typeof compraDocs.$inferSelect;
export type CompraLinea = typeof compraLineas.$inferSelect;
export type TransferenciaDoc = typeof transferenciaDocs.$inferSelect;
export type TransferenciaLinea = typeof transferenciaLineas.$inferSelect;
export type ProduccionDoc = typeof produccionDocs.$inferSelect;
export type ProduccionLinea = typeof produccionLineas.$inferSelect;
