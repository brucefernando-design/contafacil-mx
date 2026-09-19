"use client";

import { signOut } from "next-auth/react";
import { CompanySwitcher } from "./CompanySwitcher";
import { Bell, Briefcase, FileCheck2, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  user: {
    name: string;
    email: string;
    role: string;
    isDespacho: boolean;
  };
  activeOrg: {
    id: string;
    rfc: string;
    razonSocial: string;
    tipoPersona: string;
    regimenFiscal: string;
    opinionCumplimiento: string;
  };
  allOrgs: Array<{
    id: string;
    rfc: string;
    razonSocial: string;
    tipoPersona: string;
    regimenFiscal: string;
    opinionCumplimiento: string;
  }>;
  alertsCount?: number;
}

export function Navbar({ user, activeOrg, allOrgs, alertsCount = 0 }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <span className="font-extrabold text-sm tracking-tight">CF</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-slate-900 tracking-tight">
                ContaFácil<span className="text-emerald-600">.MX</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-2.5 h-2.5" /> SAT 2026
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              SaaS Contable & Facturación CFDI 4.0
            </span>
          </div>
        </Link>

        <div className="hidden lg:block h-6 w-px bg-slate-200 mx-2" />

        {/* Selector Activo Multi-RFC */}
        <div className="hidden sm:block">
          <CompanySwitcher
            activeOrg={activeOrg}
            allOrgs={allOrgs}
            isDespacho={user.isDespacho}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Modo Despacho Indicator */}
        {user.isDespacho && (
          <Link
            href="/dashboard/despacho"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Modo Despacho ({allOrgs.length} clientes)</span>
          </Link>
        )}

        {/* Campana de Alertas SAT 69-B / 32-D */}
        <Link
          href="/dashboard/alertas"
          className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Alertas Fiscales y EFOS 69-B"
        >
          <Bell className="w-4 h-4" />
          {alertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </Link>

        <div className="h-6 w-px bg-slate-200" />

        {/* Usuario y Cierre de Sesión */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {user.name}
            </span>
            <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
              {user.email}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
