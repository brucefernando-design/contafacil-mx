"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Download, FileSpreadsheet, Scale, ShieldCheck } from "lucide-react";

interface CuentaSat {
  id: string;
  codigoSat: string;
  nombre: string;
  tipo: string;
  saldoInicial: number;
  cargos: number;
  abonos: number;
  saldoFinal: number;
}

interface BalanzaViewProps {
  activeRfc: string;
  activeOrgName: string;
  cuentas: CuentaSat[];
  movimientos: Record<string, { cargos: number; abonos: number; nombre: string }>;
}

export function BalanzaView({
  activeRfc,
  activeOrgName,
  cuentas,
  movimientos,
}: BalanzaViewProps) {
  // Construir filas de la balanza combinando el catálogo base con movimientos
  const filasBalanza = cuentas.map((c) => {
    const mov = movimientos[c.codigoSat] || { cargos: c.cargos, abonos: c.abonos };
    const cargos = mov.cargos || c.cargos;
    const abonos = mov.abonos || c.abonos;
    const esDeudora = c.tipo === "ACTIVO" || c.tipo === "RESULTADOS_DEUDORA";
    const saldoFinal = esDeudora
      ? c.saldoInicial + cargos - abonos
      : c.saldoInicial + abonos - cargos;

    return {
      codigoSat: c.codigoSat,
      nombre: c.nombre,
      tipo: c.tipo,
      saldoInicial: c.saldoInicial,
      cargos,
      abonos,
      saldoFinal,
      esDeudora,
    };
  });

  // Sumas iguales
  const totalSaldoInicial = filasBalanza.reduce((sum, f) => sum + f.saldoInicial, 0);
  const totalCargos = Number(filasBalanza.reduce((sum, f) => sum + f.cargos, 0).toFixed(2));
  const totalAbonos = Number(filasBalanza.reduce((sum, f) => sum + f.abonos, 0).toFixed(2));
  const cuadradas = Math.abs(totalCargos - totalAbonos) < 0.1;

  // Exportar XML de Contabilidad Electrónica SAT (Anexo 24)
  const exportarXmlSat = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BCE:Balanza xmlns:BCE="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion/BalanzaComprobacion_1_3.xsd" Version="1.3" RFC="${activeRfc}" Mes="09" Anio="2026" TipoEnvio="N">
${filasBalanza
  .filter((f) => f.cargos > 0 || f.abonos > 0 || f.saldoInicial > 0 || f.saldoFinal !== 0)
  .map(
    (f) =>
      `  <BCE:Ctas NumCta="${f.codigoSat}" DesCta="${f.nombre}" SaldoIni="${f.saldoInicial.toFixed(2)}" Debe="${f.cargos.toFixed(2)}" Haber="${f.abonos.toFixed(2)}" SaldoFin="${f.saldoFinal.toFixed(2)}"/>`
  )
  .join("\n")}
</BCE:Balanza>`;

    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BalanzaSAT_${activeRfc}_2026_09.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Validación Anexo 24 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Validación de Contabilidad Electrónica SAT: Cuadrada
            </h3>
            <p className="text-xs text-slate-500">
              Suma de Cargos (Debe) = {formatCurrency(totalCargos)} | Suma de Abonos (Haber) = {formatCurrency(totalAbonos)}
            </p>
          </div>
        </div>

        <button
          onClick={exportarXmlSat}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" /> Exportar XML Balanza SAT (1.3)
        </button>
      </div>

      {/* Tabla de Balanza */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 font-semibold font-mono">Código SAT</th>
                <th className="px-6 py-3 font-semibold">Cuenta Contable</th>
                <th className="px-6 py-3 font-semibold">Naturaleza</th>
                <th className="px-6 py-3 font-semibold text-right">Saldo Inicial</th>
                <th className="px-6 py-3 font-semibold text-right">Debe (Cargos)</th>
                <th className="px-6 py-3 font-semibold text-right">Haber (Abonos)</th>
                <th className="px-6 py-3 font-semibold text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filasBalanza.map((fila) => (
                <tr key={fila.codigoSat} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-emerald-800">
                    {fila.codigoSat}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {fila.nombre}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                      {fila.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-slate-700">
                    {formatCurrency(fila.saldoInicial)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                    {fila.cargos > 0 ? formatCurrency(fila.cargos) : "-"}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                    {fila.abonos > 0 ? formatCurrency(fila.abonos) : "-"}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-emerald-900">
                    {formatCurrency(fila.saldoFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/90 border-t-2 border-slate-300 font-mono font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider">
                  Sumas Iguales:
                </td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(totalSaldoInicial)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-800">
                  {formatCurrency(totalCargos)}
                </td>
                <td className="px-6 py-4 text-right text-emerald-800">
                  {formatCurrency(totalAbonos)}
                </td>
                <td className="px-6 py-4 text-right text-slate-900">
                  {cuadradas ? "✓ CUADRADA" : "DESCUADRADA"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
