import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/lib/client/auth";
import { AppChrome } from "@/components/layout/AppChrome";
import "./globals.css";

const display = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "La Fortaleza — Control",
  description: "Control de inventario y producciones del restaurante",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={display.variable}>
      <body className={display.className}>
        <AuthProvider>
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
