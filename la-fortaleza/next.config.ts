import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql: archivo local en desarrollo, Turso en Vercel
  serverExternalPackages: ["@libsql/client", "nodemailer"],
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    "10.0.70.29",
    "localhost",
    "127.0.0.1",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
};

export default nextConfig;
