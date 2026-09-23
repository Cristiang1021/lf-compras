import { z } from "zod";
import { isStrongPassword } from "@/lib/password";
import {
  COMPRA_FIELDS,
  MAIL_ENCRYPTIONS,
  MODULES,
  PRODUCCION_FIELDS,
  PRODUCTO_FIELDS,
  ROLES,
  TRANSFERENCIA_FIELDS,
} from "@/lib/db/schema";

export const strongPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine(isStrongPassword, {
    message:
      "La contraseña debe tener 8+ caracteres, mayúscula, minúscula, número y un símbolo",
  });

export const loginSchema = z.object({
  username: z.string().min(3).max(180),
  password: z.string().min(6).max(128),
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(64),
  password: strongPasswordSchema,
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(180).optional().nullable(),
  role: z.enum(ROLES),
  isActive: z.boolean().optional().default(true),
});

export const inviteUserSchema = z.object({
  email: z.string().email().max(180),
  role: z.enum(ROLES),
  fullName: z.string().max(120).optional().nullable(),
});

export const acceptInviteSchema = z.object({
  username: z.string().min(3).max(64),
  password: strongPasswordSchema,
  fullName: z.string().min(2).max(120),
});

export const mailServerSchema = z.object({
  name: z.string().min(2).max(80),
  fromEmail: z.string().email().max(180),
  fromName: z.string().max(80).optional().nullable(),
  smtpHost: z.string().min(3).max(180),
  smtpPort: z.number().int().min(1).max(65535),
  encryption: z.enum(MAIL_ENCRYPTIONS),
  username: z.string().min(1).max(180),
  password: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const testMailSchema = z.object({
  to: z.string().email().max(180),
});

export const updateUserSchema = z
  .object({
    username: z.string().min(3).max(64).optional(),
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().max(180).optional().nullable(),
    password: strongPasswordSchema.optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Sin cambios" });

export const recoverPasswordSchema = z.object({
  identifier: z.string().min(3).max(180),
});

export const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
});

export const permissionItemSchema = z.object({
  role: z.enum(ROLES),
  module: z.enum(MODULES),
  canRead: z.boolean(),
  canCreate: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
  canExport: z.boolean(),
  fieldAccess: z.record(z.string(), z.boolean()).default({}),
});

export const upsertPermissionsSchema = z.object({
  permissions: z.array(permissionItemSchema).min(1),
});

const confirmTrue = z.boolean().refine((v) => v === true, {
  message:
    "Debes enviar confirm: true. Al guardar el registro queda bloqueado y no se podrá editar (salvo super usuario).",
});

export const productCreateSchema = z.object({
  codigo: z.string().min(1).max(64),
  producto: z.string().min(1).max(200),
  unidadMedida: z.string().min(1).max(64),
  confirm: confirmTrue,
});

export const productUpdateSchema = z
  .object({
    codigo: z.string().min(1).max(64).optional(),
    producto: z.string().min(1).max(200).optional(),
    unidadMedida: z.string().min(1).max(64).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Sin cambios" });

export const bodegaCreateSchema = z.object({
  nombre: z.string().min(1).max(80),
});

const compraLineaSchema = z.object({
  productId: z.string().min(1),
  cantidad: z.number().nonnegative().nullable().optional(),
  fechaPedido: z.string().nullable().optional(),
  cantidadRecibida: z.number().nonnegative().nullable().optional(),
  proveedor: z.string().max(200).nullable().optional(),
  fechaRecepcion: z.string().nullable().optional(),
  facturaNotaVenta: z.string().max(120).nullable().optional(),
  observaciones: z.string().max(1000).nullable().optional(),
});

export const compraDocCreateSchema = z.object({
  titulo: z.string().max(200).nullable().optional(),
  notas: z.string().max(2000).nullable().optional(),
  lineas: z.array(compraLineaSchema).min(1, "Agrega al menos un producto"),
  confirm: confirmTrue,
});

export const compraRecepcionUpdateSchema = z.object({
  lineas: z
    .array(
      z.object({
        id: z.string().min(1),
        cantidadRecibida: z.number().nonnegative().nullable().optional(),
        fechaRecepcion: z.string().nullable().optional(),
        facturaNotaVenta: z.string().max(120).nullable().optional(),
        observaciones: z.string().max(1000).nullable().optional(),
        proveedor: z.string().max(200).nullable().optional(),
      }),
    )
    .min(1),
  cerrar: z.boolean().optional().default(false),
});

const transferenciaLineaSchema = z.object({
  productId: z.string().min(1),
  cantidad: z.number().nonnegative().nullable().optional(),
  fechaTransferencia: z.string().nullable().optional(),
  origenBodegaId: z.string().nullable().optional(),
  destinoBodegaId: z.string().nullable().optional(),
  observacion: z.string().max(1000).nullable().optional(),
});

export const transferenciaDocCreateSchema = z.object({
  titulo: z.string().max(200).nullable().optional(),
  notas: z.string().max(2000).nullable().optional(),
  lineas: z.array(transferenciaLineaSchema).min(1, "Agrega al menos un producto"),
  confirm: confirmTrue,
});

const produccionLineaSchema = z.object({
  productId: z.string().min(1),
  cantidad: z.number().nonnegative().nullable().optional(),
  fechaProduccion: z.string().nullable().optional(),
  detalleProduccion: z.string().max(1000).nullable().optional(),
  origenBodegaId: z.string().nullable().optional(),
  destinoBodegaId: z.string().nullable().optional(),
  observaciones: z.string().max(1000).nullable().optional(),
});

export const produccionDocCreateSchema = z.object({
  titulo: z.string().max(200).nullable().optional(),
  notas: z.string().max(2000).nullable().optional(),
  lineas: z.array(produccionLineaSchema).min(1, "Agrega al menos un producto"),
  confirm: confirmTrue,
});

export const FIELD_KEYS = {
  productos: PRODUCTO_FIELDS,
  compra_recepcion: COMPRA_FIELDS,
  transferencias: TRANSFERENCIA_FIELDS,
  produccion: PRODUCCION_FIELDS,
} as const;
