"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  FileCheck2,
  FileX2,
  KeyRound,
  Trash2,
  Sparkles,
  RefreshCw,
  Clock,
  User,
  Globe,
  AlertOctagon,
  ArrowLeft,
} from "lucide-react";

export interface AuditLogItem {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  detalles: string | null;
  createdAt: string;
}

interface AuditoriaViewProps {
  isOwner: boolean;
  activeOrg: {
    id: string;
    rfc: string;
    razonSocial: string;
  };
  currentUserRole: string;
  logs: AuditLogItem[];
}

export function AuditoriaView({
  isOwner,
  activeOrg,
  currentUserRole,
  logs,
}: AuditoriaViewProps) {
  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-8 rounded-2xl bg-white border border-rose-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">
              Acceso Denegado a Bitácora de Auditoría
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              La bitácora de auditoría y eventos de seguridad contiene registros confidenciales de trazabilidad y solo puede ser consultada por el propietario (<strong>OWNER</strong>) de la organización activa.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 font-mono">
            <span>Tu rol actual en {activeOrg.rfc}:</span>
            <strong className="text-rose-600 uppercase">{currentUserRole || "NO_AUTORIZADO"}</strong>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return {
          label: "Inicio de Sesión",
          icon: User,
          className: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "TIMBRAR":
        return {
          label: "Timbrado CFDI",
          icon: FileCheck2,
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "CANCELAR":
        return {
          label: "Cancelación CFDI",
          icon: FileX2,
          className: "bg-rose-50 text-rose-700 border-rose-200",
        };
      case "SUBIR_CERT":
        return {
          label: "Carga Certificado",
          icon: KeyRound,
          className: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "BORRAR_CERT":
        return {
          label: "Borrado Certificado",
          icon: Trash2,
          className: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "CAMBIO_PLAN":
        return {
          label: "Cambio de Plan",
          icon: Sparkles,
          className: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "CAMBIO_RFC":
        return {
          label: "Cambio de RFC",
          icon: RefreshCw,
          className: "bg-slate-100 text-slate-700 border-slate-300",
        };
      default:
        return {
          label: action,
          icon: ShieldAlert,
          className: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  // Contadores rápidos
  const totalTimbrados = logs.filter((l) => l.action === "TIMBRAR").length;
  const totalCancelados = logs.filter((l) => l.action === "CANCELAR").length;
  const totalCertificados = logs.filter((l) => l.action === "SUBIR_CERT" || l.action === "BORRAR_CERT").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Bitácora de Auditoría y Seguridad
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Solo OWNER
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro inmutable de trazabilidad de operaciones para {activeOrg.rfc} ({activeOrg.razonSocial}).
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bóveda Sanitizada (Sin Secretos)</span>
        </div>
      </div>

      {/* Tarjeta Informativa de Seguridad */}
      <div className="p-4 rounded-xl bg-slate-900 text-white shadow-sm flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-white">
            Garantía de Privacidad y Seguridad SAT 2026
          </p>
          <p className="text-slate-300 leading-relaxed">
            Esta bitácora audita eventos clave (LOGIN, TIMBRAR, CANCELAR, SUBIR_CERT, BORRAR_CERT, CAMBIO_PLAN y CAMBIO_RFC). Por diseño de seguridad, <strong>ninguna contraseña, llave privada (.key) ni secreto</strong> se almacena ni se expone en estos registros.
          </p>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
            Total Eventos
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {logs.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">
            CFDIs Timbrados
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {totalTimbrados}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] text-rose-700 font-semibold uppercase tracking-wider">
            Cancelaciones
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {totalCancelados}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] text-indigo-700 font-semibold uppercase tracking-wider">
            Movs. Certificados
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {totalCertificados}
          </div>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Eventos Recientes de Seguridad
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            {logs.length} registro(s)
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No hay eventos registrados aún en la bitácora de auditoría.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3 pl-4">Fecha y Hora</th>
                  <th className="p-3">Acción</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Dirección IP</th>
                  <th className="p-3 pr-4">Detalles de Operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  const dateFormatted = new Date(log.createdAt).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 pl-4 font-mono text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.className}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                        {log.userEmail || log.userId || "Sistema / Anónimo"}
                      </td>
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{log.ip || "127.0.0.1"}</span>
                        </div>
                      </td>
                      <td className="p-3 pr-4 text-slate-800 font-mono text-[11px] max-w-md break-all">
                        {log.detalles || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
