"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, REGIMENES_SAT } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

interface ClientDetail {
  id: string;
  rfc: string;
  razonSocial: string;
  tipoPersona: string;
  regimenFiscal: string;
  codigoPostal: string;
  opinionCumplimiento: string;
  efosStatus: string;
  totalFacturadoMes: number;
  declaracionEstatus: string;
  declaracionIsr: number;
  declaracionIva: number;
  alertasCount: number;
}

interface DespachoViewProps {
  activeOrgId: string;
  clients: ClientDetail[];
}

export function DespachoView({ activeOrgId, clients }: DespachoViewProps) {
  const router = useRouter();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"TODOS" | "PM" | "PF" | "PENDIENTES">("TODOS");

  const handleSwitchClient = async (orgId: string) => {
    setSwitchingId(orgId);
    try {
      const res = await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert("No se pudo cambiar al cliente.");
        setSwitchingId(null);
      }
    } catch {
      alert("Error al cambiar de empresa.");
      setSwitchingId(null);
    }
  };

  // Filtrado
  const filteredClients = clients.filter((c) => {
    if (filter === "PM") return c.tipoPersona === "PM";
    if (filter === "PF") return c.tipoPersona === "PF";
    if (filter === "PENDIENTES") return c.declaracionEstatus === "PENDIENTE";
    return true;
  });

  // Métricas del despacho
  const totalClientes = clients.length;
  const facturacionGlobal = clients.reduce((sum, c) => sum + c.totalFacturadoMes, 0);
  const conAlertas = clients.filter((c) => c.opinionCumplimiento !== "POSITIVA" || c.alertasCount > 0).length;
  const declaracionesListas = clients.filter((c) => c.declaracionEstatus === "CALCULADO" || c.declaracionEstatus === "PAGADA").length;

  return (
    <div className="space-y-6">
      {/* KPI Cards Despacho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Cartera de Clientes
          </span>
          <div className="text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            {totalClientes} RFCs
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Empresas y personas físicas activas
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Facturación Gestionada (Mes)
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {formatCurrency(facturacionGlobal)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            Volumen acumulado Septiembre 2026
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Declaraciones Listas
          </span>
          <div className="text-2xl font-black text-indigo-700 mt-2">
            {declaracionesListas} / {totalClientes}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            Calculadas con motor fiscal 2026
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Clientes con Alertas SAT
          </span>
          <div className="text-2xl font-black text-rose-700 mt-2 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            {conAlertas}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            Requieren atención (Simulación 32-D o demo 69-B)
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto">
          {(["TODOS", "PM", "PF", "PENDIENTES"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filter === t
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t === "TODOS"
                ? "Todos los Clientes"
                : t === "PM"
                ? "Personas Morales"
                : t === "PF"
                ? "Personas Físicas"
                : "Declaración Pendiente"}
            </button>
          ))}
        </div>

        <Link
          href="/dashboard/onboarding"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Agregar Nuevo Cliente
        </Link>
      </div>

      {/* Matriz de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 font-semibold">Cliente / Razón Social</th>
                <th className="px-6 py-3 font-semibold">Tipo / Régimen</th>
                <th className="px-6 py-3 font-semibold text-center">Opinión 32-D (Demo)</th>
                <th className="px-6 py-3 font-semibold text-right">Facturado Mes</th>
                <th className="px-6 py-3 font-semibold text-center">Declaración Prov.</th>
                <th className="px-6 py-3 font-semibold text-center">Alertas</th>
                <th className="px-6 py-3 font-semibold text-center">Acción Directa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((c) => {
                const isActive = c.id === activeOrgId;

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      isActive ? "bg-emerald-50/60" : "hover:bg-slate-50/50"
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isActive
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.tipoPersona === "PM" ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {c.razonSocial}
                            {isActive && (
                              <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                                ACTIVO
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {c.rfc} • C.P. {c.codigoPostal}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-800">
                        {c.regimenFiscal} - {REGIMENES_SAT[c.regimenFiscal]?.slice(0, 24) || "General"}...
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.tipoPersona === "PM" ? "Persona Moral" : "Persona Física"}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.opinionCumplimiento === "POSITIVA"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {c.opinionCumplimiento === "POSITIVA" ? "✓ Positiva" : "! Negativa"}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(c.totalFacturadoMes)}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.declaracionEstatus === "CALCULADO"
                            ? "bg-indigo-100 text-indigo-800"
                            : c.declaracionEstatus === "PAGADA"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.declaracionEstatus}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      {c.alertasCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3" /> {c.alertasCount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold">0</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      {isActive ? (
                        <span className="text-xs text-emerald-700 font-bold">
                          En pantalla
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSwitchClient(c.id)}
                          disabled={switchingId === c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {switchingId === c.id ? (
                            "Cambiando..."
                          ) : (
                            <>
                              <span>Entrar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
