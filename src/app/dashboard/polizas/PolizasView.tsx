"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Plus,
  Scale,
  X,
} from "lucide-react";
import Link from "next/link";

interface PolizaEntryData {
  id: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  concepto: string | null;
  debe: number;
  haber: number;
}

interface PolizaData {
  id: string;
  tipo: string;
  numero: number;
  fecha: Date;
  concepto: string;
  uuidRelacionado: string | null;
  totalDebe: number;
  totalHaber: number;
  estaCuadrada: boolean;
  entries: PolizaEntryData[];
  invoice?: {
    id: string;
    uuid: string;
    folio: string | null;
    serie: string | null;
  } | null;
}

interface PolizasViewProps {
  initialPolizas: PolizaData[];
  activeOrgId: string;
}

export function PolizasView({ initialPolizas }: PolizasViewProps) {
  const [polizas] = useState<PolizaData[]>(initialPolizas);
  const [filterTipo, setFilterTipo] = useState<string>("TODAS");
  const [selectedPoliza, setSelectedPoliza] = useState<PolizaData | null>(null);

  const filtered = polizas.filter((p) => {
    if (filterTipo === "TODAS") return true;
    return p.tipo === filterTipo;
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          {["TODAS", "INGRESO", "EGRESO", "DIARIO"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFilterTipo(tipo)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterTipo === tipo
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tipo === "TODAS"
                ? "Todas las Pólizas"
                : tipo === "INGRESO"
                ? "Ingresos"
                : tipo === "EGRESO"
                ? "Egresos"
                : "Diario"}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Total: <strong>{filtered.length}</strong> pólizas
        </span>
      </div>

      {/* Tabla de Pólizas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 font-semibold">No.</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Fecha</th>
                <th className="px-6 py-3 font-semibold">Concepto</th>
                <th className="px-6 py-3 font-semibold">CFDI Relacionado</th>
                <th className="px-6 py-3 font-semibold text-right">Total Debe</th>
                <th className="px-6 py-3 font-semibold text-right">Total Haber</th>
                <th className="px-6 py-3 font-semibold text-center">Partida Doble</th>
                <th className="px-6 py-3 font-semibold text-center">Ver Asientos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No hay pólizas registradas para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((pol) => (
                  <tr key={pol.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                      #{pol.numero}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          pol.tipo === "INGRESO"
                            ? "bg-emerald-100 text-emerald-800"
                            : pol.tipo === "EGRESO"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {pol.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                      {formatDate(pol.fecha)}
                    </td>
                    <td className="px-6 py-3.5 max-w-sm truncate" title={pol.concepto}>
                      <span className="font-medium text-slate-800">{pol.concepto}</span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">
                      {pol.uuidRelacionado ? (
                        <span className="text-slate-500 truncate block max-w-[110px]" title={pol.uuidRelacionado}>
                          {pol.uuidRelacionado.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(pol.totalDebe)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(pol.totalHaber)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {pol.estaCuadrada ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Cuadrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Descuadrada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedPoliza(pol)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle de Asientos de Póliza */}
      {selectedPoliza && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-3xl w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Póliza de {selectedPoliza.tipo} #{selectedPoliza.numero}
                  </span>
                  <span className="text-xs text-slate-500">
                    Fecha: {formatDate(selectedPoliza.fecha)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {selectedPoliza.concepto}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPoliza(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Asientos Contables */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3 font-mono">Código SAT</th>
                    <th className="p-3">Nombre de la Cuenta</th>
                    <th className="p-3">Concepto Movimiento</th>
                    <th className="p-3 text-right">Debe (Cargo)</th>
                    <th className="p-3 text-right">Haber (Abono)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPoliza.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-emerald-800">
                        {entry.cuentaCodigo}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {entry.cuentaNombre}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {entry.concepto || "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {entry.debe > 0 ? formatCurrency(entry.debe) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {entry.haber > 0 ? formatCurrency(entry.haber) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-mono font-bold text-xs">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-slate-700 uppercase">
                      Sumas Iguales:
                    </td>
                    <td className="p-3 text-right text-slate-900">
                      {formatCurrency(selectedPoliza.totalDebe)}
                    </td>
                    <td className="p-3 text-right text-slate-900">
                      {formatCurrency(selectedPoliza.totalHaber)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900">
                  Póliza validada conforme a la estructura de Contabilidad Electrónica SAT
                </span>
              </div>

              {selectedPoliza.invoice && (
                <Link
                  href={`/dashboard/facturas/${selectedPoliza.invoice.id}/pdf`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                >
                  Ver Factura CFDI →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
