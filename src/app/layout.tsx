import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AsistenteRootWrapper } from "@/components/asistente/AsistenteRootWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyConta MX | SaaS Contable México SAT 2026",
  description:
    "Plataforma contable inteligente para México: CFDI 4.0, Motor Fiscal RESICO/AE/Arrendamiento/PM, Conciliación PUE/PPD, Bóveda XML y Modo Despacho.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AsistenteRootWrapper>{children}</AsistenteRootWrapper>
      </body>
    </html>
  );
}
