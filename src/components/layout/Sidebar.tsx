"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calculator,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { REGIMENES_SAT } from "@/lib/utils";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

interface SidebarProps {
  activeOrg: {
    rfc: string;
    razonSocial: string;
    tipoPersona: string;
    regimenFiscal: string;
    codigoPostal: string;
  };
  isDespacho?: boolean;
  role?: string;
}

export function Sidebar({ activeOrg, isDespacho, role }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard ISR / IVA",
      href: "/dashboard",
      icon: LayoutDashboard,
      highlight: false,
    },
    ...(role === "ADMIN"
      ? [
          {
            name: "Panel Super Admin",
            href: "/dashboard/admin",
            icon: ShieldAlert,
            badge: "Dueño",
            highlight: true,
          },
        ]
      : []),
    ...(isDespacho
      ? [
          {
            name: "Modo Despacho",
            href: "/dashboard/despacho",
            icon: Briefcase,
            badge: "Multi-RFC",
            highlight: true,
          },
        ]
      : []),
    {
      name: "Facturación CFDI 4.0",
      href: "/dashboard/facturacion",
      icon: Receipt,
    },
    {
      name: "Nómina CFDI 4.0",
      href: "/dashboard/nomina",
      icon: Users,
      badge: "Nuevo",
    },
    {
      name: "Bóveda XML",
      href: "/dashboard/boveda",
      icon: FolderArchive,
    },
    {
      name: "Conciliación PUE / PPD",
      href: "/dashboard/conciliacion",
      icon: Scale,
    },
    {
      name: "Proyección Fiscal (ISR / IVA)",
      href: "/dashboard/motor-fiscal",
      icon: Calculator,
      badge: "2026",
    },
    {
      name: "Pólizas Contables",
      href: "/dashboard/polizas",
      icon: FileSpreadsheet,
    },
    {
      name: "Balanza de Comprobación",
      href: "/dashboard/balanza",
      icon: BookOpen,
    },
    {
      name: "Alertas Fiscales SAT",
      href: "/dashboard/alertas",
      icon: AlertTriangle,
    },
    {
      name: "Bóveda Certificados",
      href: "/dashboard/certificados",
      icon: ShieldCheck,
      badge: "CSD/e.firma",
    },
    {
      name: "Bitácora de Auditoría",
      href: "/dashboard/auditoria",
      icon: ShieldAlert,
      badge: "OWNER",
    },
    {
      name: "Alta de Nuevo RFC",
      href: "/dashboard/onboarding",
      icon: PlusCircle,
    },
    {
      name: "Mi Plan & Timbres",
      href: "/dashboard/plan",
      icon: Zap,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Navigation links */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menú Principal
          </div>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : item.highlight
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon
                    className={`w-4 h-4 ${
                      isActive
                        ? "text-white"
                        : item.highlight
                        ? "text-indigo-600"
                        : "text-slate-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200/70 text-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RFC Activo Info Box */}
      <div className="p-4 border-t border-slate-200 bg-white/70">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              RFC en Operación
              <AyudaTermino terminoId="rfc" />
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {activeOrg.tipoPersona}
            </span>
          </div>
          <p className="font-mono font-bold text-xs text-slate-900 tracking-tight">
            {activeOrg.rfc}
          </p>
          <p className="text-[11px] text-slate-600 truncate mt-0.5" title={activeOrg.razonSocial}>
            {activeOrg.razonSocial}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-[10px] text-slate-500">
            <span className="truncate flex items-center gap-1">
              Régimen: <strong className="text-slate-700">{activeOrg.regimenFiscal}</strong>
              <AyudaTermino terminoId="resico" />
            </span>
            <span>
              C.P. Emisión: <strong className="text-slate-700">{activeOrg.codigoPostal}</strong>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
