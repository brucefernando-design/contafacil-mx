"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, FORMAS_PAGO } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileSpreadsheet,
  Plus,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";

interface PaymentComplementData {
  id: string;
  fechaPago: Date;
  monto: number;
  numParcialidad: number;
  saldoAnterior: number;
  saldoInsoluto: number;
  formaPago: string;
}

interface InvoicePpdData {
  id: string;
  serie: string | null;
  folio: string | null;
  uuid: string;
  fecha: Date;
  tipo: string;
  total: number;
  saldoPendiente: number;
  estaConciliada: boolean;
  receptorRfc: string;
  receptorNombre: string;
  paymentComplements: PaymentComplementData[];
}

interface ConciliacionViewProps {
  initialPpdInvoices: InvoicePpdData[];
  pueCount: number;
  activeRfc: string;
}

export function ConciliacionView({
  initialPpdInvoices,
  pueCount,
  activeRfc,
}: ConciliacionViewProps) {
  const router = useRouter();
  const [ppdInvoices, setPpdInvoices] = useState<InvoicePpdData[]>(initialPpdInvoices);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoicePpdData | null>(null);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [fechaPago, setFechaPago] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formaPago, setFormaPago] = useState<string>("03");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const abrirModalPago = (inv: InvoicePpdData) => {
    setSelectedInvoice(inv);
    setMontoPago(inv.saldoPendiente); // Sugerir el saldo total restante
    setSuccessMessage(null);
  };

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setLoading(true);
    try {
      const res = await fetch("/api/cfdi/ppd-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          montoPago: Number(montoPago),
          fechaPago,
          formaPago,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(
          `Complemento de Pago 2.0 registrado exitosamente por ${formatCurrency(montoPago)}. Se generó la póliza de reclasificación de IVA.`
        );
        setSelectedInvoice(null);
        router.refresh();
      } else {
        alert(data.error || "Error al registrar el complemento de pago.");
      }
    } catch {
      alert("Error de red al registrar el pago.");
    } finally {
      setLoading(false);
    }
  };

  // Métricas
  const totalPpdMonto = ppdInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPpdPendiente = ppdInvoices.reduce((sum, inv) => sum + inv.saldoPendiente, 0);
  const totalPpdCobrado = totalPpdMonto - totalPpdPendiente;

  return (
    <div className="space-y-6">
      {/* Guía Explicativa PUE vs PPD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
              PUE
            </span>
            <h3 className="font-bold text-sm text-emerald-900">
              Pago en una Sola Exhibición ({pueCount} CFDI)
            </h3>
          </div>
          <p className="text-slate-600">
            Comprobantes de contado. La Ley del ISR y del IVA consideran que el flujo de efectivo ocurrió en la misma fecha de emisión. Se acumulan al 100% de forma inmediata.
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">
              PPD
            </span>
            <h3 className="font-bold text-sm text-amber-900">
              Pago en Parcialidades o Diferido ({ppdInvoices.length} CFDI)
            </h3>
          </div>
          <p className="text-slate-600">
            Facturas a crédito. NO causan IVA ni acumulan ingresos para RESICO o personas físicas hasta que se emite el <strong>Recibo Electrónico de Pago (REP 2.0)</strong> al cobrar el SPEI.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards PPD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Emitido en PPD
          </span>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(totalPpdMonto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {ppdInvoices.length} facturas a crédito registradas
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Cobrado Efectivo (Con Complemento)
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {formatCurrency(totalPpdCobrado)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            Acumulable para cálculo de ISR e IVA
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Saldo Insoluto por Cobrar
          </span>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {formatCurrency(totalPpdPendiente)}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            Cuentas por cobrar diferidas (Pendientes)
          </div>
        </div>
      </div>

      {/* Tabla de Facturas PPD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cartera de Facturas PPD y Control de Cobranza
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en &ldquo;Registrar Pago&rdquo; para aplicar un Complemento de Recepción de Pagos 2.0
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 font-semibold">Folio / UUID</th>
                <th className="px-6 py-3 font-semibold">Fecha Emisión</th>
                <th className="px-6 py-3 font-semibold">Cliente</th>
                <th className="px-6 py-3 font-semibold text-right">Total Factura</th>
                <th className="px-6 py-3 font-semibold text-right">Saldo Insoluto</th>
                <th className="px-6 py-3 font-semibold text-center">Pagos Aplicados</th>
                <th className="px-6 py-3 font-semibold text-center">Estado</th>
                <th className="px-6 py-3 font-semibold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ppdInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No tienes facturas emitidas bajo el método PPD.
                  </td>
                </tr>
              ) : (
                ppdInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-mono font-bold text-slate-900">
                        {inv.serie ? `${inv.serie}-` : ""}{inv.folio || "S/F"}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={inv.uuid}>
                        {inv.uuid}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                      {formatDate(inv.fecha)}
                    </td>
                    <td className="px-6 py-3.5 max-w-xs">
                      <div className="font-medium text-slate-900 truncate" title={inv.receptorNombre}>
                        {inv.receptorNombre}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{inv.receptorRfc}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold">
                      <span
                        className={
                          inv.saldoPendiente > 0 ? "text-amber-800" : "text-emerald-700"
                        }
                      >
                        {formatCurrency(inv.saldoPendiente)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {inv.paymentComplements.length} pagos
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {inv.estaConciliada || inv.saldoPendiente <= 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Liquidada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {inv.saldoPendiente > 0 ? (
                        <button
                          onClick={() => abrirModalPago(inv)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-xs transition-colors"
                        >
                          <Coins className="w-3.5 h-3.5" /> Registrar Pago
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Completada</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Pago / Complemento de Pago 2.0 */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Registrar Complemento de Recepción de Pagos 2.0
                </h3>
                <p className="text-xs text-slate-500">
                  Factura PPD {selectedInvoice.serie ? `${selectedInvoice.serie}-` : ""}{selectedInvoice.folio} • {selectedInvoice.receptorNombre}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total de la factura:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(selectedInvoice.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo insoluto anterior:</span>
                  <span className="font-mono font-bold text-amber-800">
                    {formatCurrency(selectedInvoice.saldoPendiente)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto del Pago Recibido (MXN) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={selectedInvoice.saldoPendiente}
                  step="0.01"
                  required
                  value={montoPago}
                  onChange={(e) => setMontoPago(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Nuevo saldo tras el pago:{" "}
                  <strong className="text-slate-700 font-mono">
                    {formatCurrency(Math.max(0, selectedInvoice.saldoPendiente - montoPago))}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha del Cobro SPEI *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Forma de Pago *
                  </label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="03">03 - Transferencia SPEI</option>
                    <option value="01">01 - Efectivo</option>
                    <option value="02">02 - Cheque nominativo</option>
                    <option value="04">04 - Tarjeta de crédito</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-slate-600 text-[11px] space-y-1">
                <span className="font-bold text-emerald-900 block">
                  Efectos Fiscales y Contables Automáticos:
                </span>
                <p>
                  1. Este pago acumulará ingresos y trasladará el IVA proporcionalmente para el cálculo provisional del mes de <strong>{formatDate(fechaPago)}</strong>.
                </p>
                <p>
                  2. Se creará automáticamente la <strong>Póliza de Ingreso</strong> reclasificando el IVA de cuenta 209 (no cobrado) a cuenta 208 (cobrado).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {loading ? "Registrando..." : "Emitir Complemento de Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
