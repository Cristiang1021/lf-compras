import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mailServers, type MailEncryption, type MailServer } from "@/lib/db/schema";

export type MailConfigPublic = {
  id: string | null;
  name: string;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  encryption: MailEncryption;
  username: string;
  hasPassword: boolean;
  isActive: boolean;
  configured: boolean;
};

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newInviteToken() {
  return randomBytes(32).toString("hex");
}

export function inviteExpiryIso(hours = 72) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function appBaseUrl(request: Request) {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export async function getActiveMailServer(): Promise<MailServer | null> {
  const rows = await db
    .select()
    .from(mailServers)
    .where(eq(mailServers.isActive, true))
    .orderBy(desc(mailServers.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export function toPublicMailConfig(row: MailServer | null): MailConfigPublic {
  if (!row) {
    return {
      id: null,
      name: "",
      fromEmail: "",
      fromName: "La Fortaleza",
      smtpHost: "",
      smtpPort: 465,
      encryption: "ssl",
      username: "",
      hasPassword: false,
      isActive: true,
      configured: false,
    };
  }
  return {
    id: row.id,
    name: row.name,
    fromEmail: row.fromEmail,
    fromName: row.fromName || "La Fortaleza",
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    encryption: row.encryption,
    username: row.username,
    hasPassword: Boolean(row.password),
    isActive: row.isActive,
    configured: Boolean(row.smtpHost && row.username && row.password),
  };
}

function transporterFrom(row: MailServer) {
  const secure = row.encryption === "ssl";
  return nodemailer.createTransport({
    host: row.smtpHost,
    port: row.smtpPort,
    secure,
    requireTLS: row.encryption === "starttls",
    auth: {
      user: row.username,
      pass: row.password,
    },
  });
}

export async function sendAppMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const server = await getActiveMailServer();
  if (!server?.smtpHost || !server.username || !server.password) {
    throw new Error(
      "No hay correo saliente configurado. Entra a Administración → Correo y guarda el servidor SMTP.",
    );
  }

  const transport = transporterFrom(server);
  const fromName = server.fromName?.trim() || "La Fortaleza";
  const from = `${fromName} <${server.fromEmail || server.username}>`;

  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export function inviteEmailContent(input: {
  roleLabel: string;
  inviteUrl: string;
  invitedName?: string | null;
}) {
  const hello = input.invitedName?.trim()
    ? `Hola, ${input.invitedName.trim()}`
    : "Hola";
  const subject = "Invitación a La Fortaleza";
  const text = [
    `${hello}.`,
    "",
    `Te invitaron a unirte a La Fortaleza con el rol ${input.roleLabel}.`,
    "Abre este enlace para crear tu usuario y contraseña:",
    input.inviteUrl,
    "",
    "El enlace vence en 72 horas. Si no pediste esta invitación, ignora el correo.",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#17181c">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a21112;font-weight:700">La Fortaleza</p>
      <h1 style="margin:0 0 12px;font-size:22px">Invitación a la app</h1>
      <p style="margin:0 0 12px;line-height:1.5">${hello}. Te invitaron a unirte al control de inventario con el rol <strong>${input.roleLabel}</strong>.</p>
      <p style="margin:0 0 20px;line-height:1.5">Crea tu usuario y contraseña en este enlace. Vence en 72 horas.</p>
      <p style="margin:0 0 24px">
        <a href="${input.inviteUrl}" style="display:inline-block;background:#a21112;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Unirme a La Fortaleza</a>
      </p>
      <p style="margin:0;font-size:12px;color:#6b6e76;word-break:break-all">${input.inviteUrl}</p>
    </div>
  `;

  return { subject, text, html };
}
