"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, FORMAS_PAGO } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Info,
  Plus,
  RotateCcw,
  Scale,
  Sparkles,
  UploadCloud,
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

export interface BankTransactionData {
  id: string;
  fecha: Date;
  concepto: string;
  monto: number;
  tipo: "CARGO" | "ABONO";
  referencia: string | null;
  cfdiUuidRelacionado: string | null;
  conciliado: boolean;
  fechaConciliacion: Date | null;
}

export interface AvailableInvoiceData {
  id: string;
  uuid: string;
  serie: string | null;
  folio: string | null;
  tipo: string;
  total: number;
  fecha: Date;
  metodoPago: string;
  emisorNombre: string;
  emisorRfc: string;
  receptorNombre: string;
  receptorRfc: string;
  estaConciliada: boolean;
}

interface ConciliacionViewProps {
  initialPpdInvoices: InvoicePpdData[];
  pueCount: number;
  activeRfc: string;
  initialBankTransactions?: BankTransactionData[];
  availableInvoices?: AvailableInvoiceData[];
}

export function ConciliacionView({
  initialPpdInvoices,
  pueCount,
  activeRfc,
  initialBankTransactions = [],
  availableInvoices = [],
}: ConciliacionViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"SAT_PPD" | "BANCOS_CSV">("SAT_PPD");

  // Estado PPD
  const [ppdInvoices, setPpdInvoices] = useState<InvoicePpdData[]>(initialPpdInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoicePpdData | null>(null);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [fechaPago, setFechaPago] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formaPago, setFormaPago] = useState<string>("03");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado Bancario
  const [bankTransactions, setBankTransactions] = useState<BankTransactionData[]>(initialBankTransactions);
  const [selectedCfdiMatches, setSelectedCfdiMatches] = useState<Record<string, string>>({});
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [csvMessage, setCsvMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const abrirModalPago = (inv: InvoicePpdData) => {
    setSelectedInvoice(inv);
    setMontoPago(inv.saldoPendiente);
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

  // Importar CSV de Banco
  const handleUploadBankCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    setCsvMessage(null);

    try {
      const csvText = await file.text();
      const res = await fetch("/api/bank/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText }),
      });

      const data = await res.json();
      if (res.ok) {
        setCsvMessage({
          type: "success",
          text: data.message || `Se importaron ${data.count} movimientos bancarios.`,
        });
        router.refresh();
      } else {
        setCsvMessage({
          type: "error",
          text: data.error || "Error al procesar el archivo CSV.",
        });
      }
    } catch {
      setCsvMessage({
        type: "error",
        text: "Error de red al subir el archivo CSV.",
      });
    } finally {
      setUploadingCsv(false);
      e.target.value = "";
    }
  };

  // Cargar Extracto Demo
  const handleLoadDemoBankCsv = async () => {
    setUploadingCsv(true);
    setCsvMessage(null);

    // CSV representativo con movimientos coincidentes con las facturas del sistema
    const demoCsv = `Fecha,Concepto,Monto,Tipo,Referencia
2026-09-05,DEPOSITO SPEI KIMBERLY CLARK DE MEXICO,36429.15,ABONO,SPEI-8849102
2026-09-07,PAGO PROVEEDOR SERVICIOS EN LA NUBE AWS,14848.00,CARGO,TDD-4912
2026-09-10,ABONO TRANSFERENCIA CLIENTE FACTURA F-102,29000.00,ABONO,SPEI-910238
2026-09-10,DEPOSITO TRANSFERENCIA CONSULTORIA FISCAL,26020.83,ABONO,SPEI-771829
2026-09-12,COMPRA PAPELERIA Y CONSUMIBLES OXXO,2146.00,CARGO,TDD-1102
2026-09-14,PAGO TELEFONIA E INTERNET TELMEX,3480.00,CARGO,DOM-77123`;

    try {
      const res = await fetch("/api/bank/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: demoCsv }),
      });

      const data = await res.json();
      if (res.ok) {
        setCsvMessage({
          type: "success",
          text: `Extracto bancario demo cargado: ${data.count} movimientos listos para conciliar contra CFDI.`,
        });
        router.refresh();
      } else {
        setCsvMessage({
          type: "error",
          text: data.error || "Error al cargar extracto demo.",
        });
      }
    } catch {
      setCsvMessage({
        type: "error",
        text: "Error de red al cargar extracto demo.",
      });
    } finally {
      setUploadingCsv(false);
    }
  };

  // Conciliar movimiento bancario contra CFDI
  const handleReconcile = async (bankTransactionId: string, invoiceUuid: string) => {
    if (!invoiceUuid) {
      alert("Selecciona un CFDI para conciliar.");
      return;
    }

    try {
      const res = await fetch("/api/bank/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankTransactionId, invoiceUuid }),
      });

      const data = await res.json();
      if (res.ok) {
        setCsvMessage({
          type: "success",
          text: data.message || "Movimiento bancario conciliado exitosamente con CFDI.",
        });
        router.refresh();
      } else {
        alert(data.error || "Error al conciliar.");
      }
    } catch {
      alert("Error de red al conciliar.");
    }
  };

  // Revertir conciliación
  const handleUnreconcile = async (bankTransactionId: string) => {
    try {
      const res = await fetch(`/api/bank/reconcile?id=${bankTransactionId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        setCsvMessage({
          type: "success",
          text: "Conciliación bancaria revertida.",
        });
        router.refresh();
      } else {
        alert(data.error || "Error al revertir conciliación.");
      }
    } catch {
      alert("Error de red al revertir conciliación.");
    }
  };

  // Métricas PPD
  const totalPpdMonto = ppdInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPpdPendiente = ppdInvoices.reduce((sum, inv) => sum + inv.saldoPendiente, 0);
  const totalPpdCobrado = totalPpdMonto - totalPpdPendiente;

  // Métricas Bancarias
  const totalBankAbonos = bankTransactions
    .filter((t) => t.tipo === "ABONO")
    .reduce((sum, t) => sum + t.monto, 0);
  const totalBankCargos = bankTransactions
    .filter((t) => t.tipo === "CARGO")
    .reduce((sum, t) => sum + t.monto, 0);
  const bankConciliados = bankTransactions.filter((t) => t.conciliado).length;
  const bankPendientes = bankTransactions.length - bankConciliados;

  return (
    <div className="space-y-6">
      {/* Selector de Pestaña Principal */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("SAT_PPD")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "SAT_PPD"
              ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Conciliación SAT PUE / PPD ({ppdInvoices.length} PPD)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BANCOS_CSV")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "BANCOS_CSV"
              ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Conciliación Bancaria CSV ({bankTransactions.length} Movimientos)</span>
        </button>
      </div>

      {/* PESTAÑA 1: CONCILIACIÓN PUE / PPD SAT */}
      {activeTab === "SAT_PPD" && (
        <div className="space-y-6 animate-in fade-in">
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
                    <th className="px-6 py-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ppdInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                        No hay facturas con método PPD registradas en el sistema.
                      </td>
                    </tr>
                  ) : (
                    ppdInvoices.map((inv) => {
                      const estaLiquidada = inv.saldoPendiente <= 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            <div>{inv.serie ? `${inv.serie}-` : ""}{inv.folio || "S/F"}</div>
                            <div className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                              {inv.uuid}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                            {formatDate(inv.fecha)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{inv.receptorNombre}</div>
                            <div className="font-mono text-[10px] text-slate-400">{inv.receptorRfc}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold">
                            <span className={estaLiquidada ? "text-emerald-700" : "text-amber-700"}>
                              {formatCurrency(inv.saldoPendiente)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium">
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                              {inv.paymentComplements.length} pagos
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                estaLiquidada
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.paymentComplements.length > 0
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {estaLiquidada ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Liquidada
                                </>
                              ) : inv.paymentComplements.length > 0 ? (
                                <>
                                  <Clock className="w-3 h-3 text-blue-600" /> Parcial
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" /> Pendiente
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {estaLiquidada ? (
                              <span className="text-[11px] text-slate-400 italic">Totalmente cobrada</span>
                            ) : (
                              <button
                                onClick={() => abrirModalPago(inv)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" /> Registrar Cobro
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CONCILIACIÓN BANCARIA CSV (BANCOS VS CFDI) */}
      {activeTab === "BANCOS_CSV" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Card de Importación CSV */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 p-6 text-center transition-colors">
            <UploadCloud className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">
              Importar Estado de Cuenta Bancario en CSV
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1 mb-4">
              Sube el extracto bancario de tu cuenta (BBVA, Santander, Banamex, Banorte, etc.). El motor emparejará automáticamente cada depósito y retiro contra las facturas CFDI 4.0 emitidas y recibidas.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors">
                <Plus className="w-4 h-4" />
                <span>{uploadingCsv ? "Procesando CSV..." : "Seleccionar Archivo CSV"}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={uploadingCsv}
                  onChange={handleUploadBankCsv}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                disabled={uploadingCsv}
                onClick={handleLoadDemoBankCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Cargar Extracto Bancario Demo (CSV)</span>
              </button>
            </div>
          </div>

          {csvMessage && (
            <div
              className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
                csvMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {csvMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{csvMessage.text}</span>
              </div>
              <button onClick={() => setCsvMessage(null)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Métricas Bancarias */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Movimientos Importados
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {bankTransactions.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Registros del extracto</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Abonos (Depósitos)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {formatCurrency(totalBankAbonos)}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Entradas de dinero</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Cargos (Retiros)
              </span>
              <div className="text-2xl font-black text-rose-700 mt-2">
                {formatCurrency(totalBankCargos)}
              </div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">Salidas / Gastos pagados</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Estatus Conciliación
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-2">
                {bankConciliados} / {bankTransactions.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {bankPendientes > 0 ? `${bankPendientes} pendientes de conciliar` : "100% Conciliado"}
              </div>
            </div>
          </div>

          {/* Tabla de Conciliación Bancaria vs CFDI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Conciliación de Movimientos Bancarios contra CFDI 4.0
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asocia cada cargo o abono bancario con su factura fiscal para acreditar el flujo de efectivo
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Fecha Banco</th>
                    <th className="px-6 py-3 font-semibold">Concepto / Referencia</th>
                    <th className="px-6 py-3 font-semibold">Tipo</th>
                    <th className="px-6 py-3 font-semibold text-right">Importe</th>
                    <th className="px-6 py-3 font-semibold">CFDI Relacionado / Sugerido</th>
                    <th className="px-6 py-3 font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <p>No hay extractos bancarios cargados todavía.</p>
                          <button
                            type="button"
                            onClick={handleLoadDemoBankCsv}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Cargar Extracto Demo (CSV)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bankTransactions.map((tx) => {
                      const esAbono = tx.tipo === "ABONO";
                      // Buscar facturas coincidentes por monto exacto o cercano
                      const matchExacto = availableInvoices.find(
                        (inv) => Math.abs(inv.total - tx.monto) < 0.05
                      );

                      // CFDI actualmente seleccionado en el dropdown
                      const currentSelectedUuid = selectedCfdiMatches[tx.id] || (matchExacto ? matchExacto.uuid : "");

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                            {formatDate(tx.fecha)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{tx.concepto}</div>
                            {tx.referencia && (
                              <div className="font-mono text-[10px] text-slate-400">
                                Ref: {tx.referencia}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                esAbono
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {esAbono ? "ABONO (Depósito)" : "CARGO (Retiro)"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold">
                            <span className={esAbono ? "text-emerald-700" : "text-rose-700"}>
                              {esAbono ? "+" : "-"}{formatCurrency(tx.monto)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {tx.conciliado ? (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-mono text-[11px] truncate max-w-[200px]" title={tx.cfdiUuidRelacionado || ""}>
                                  UUID: {tx.cfdiUuidRelacionado || "Conciliado"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={currentSelectedUuid}
                                  onChange={(e) =>
                                    setSelectedCfdiMatches((prev) => ({
                                      ...prev,
                                      [tx.id]: e.target.value,
                                    }))
                                  }
                                  className="w-full max-w-xs px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                  <option value="">-- Seleccionar Factura CFDI --</option>
                                  {availableInvoices.map((inv) => {
                                    const matchAmount = Math.abs(inv.total - tx.monto) < 0.05;
                                    return (
                                      <option key={inv.id} value={inv.uuid}>
                                        {matchAmount ? "⭐ [Match exacto] " : ""}
                                        {inv.serie ? `${inv.serie}-` : ""}{inv.folio || "S/F"} • {formatCurrency(inv.total)} • {inv.tipo === "EMITIDA" ? inv.receptorNombre : inv.emisorNombre}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {tx.conciliado ? (
                              <button
                                type="button"
                                onClick={() => handleUnreconcile(tx.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                                title="Revertir conciliación"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Revertir
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReconcile(tx.id, currentSelectedUuid)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Conciliar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Registrar Pago PPD (REP 2.0) */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">
                  Registrar Cobro / Complemento de Pago 2.0
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Factura PPD:</span>
                <span className="font-bold font-mono text-slate-900">
                  {selectedInvoice.serie ? `${selectedInvoice.serie}-` : ""}
                  {selectedInvoice.folio}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receptor:</span>
                <span className="font-semibold text-slate-800">
                  {selectedInvoice.receptorNombre}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Factura:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(selectedInvoice.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Pendiente Actual:</span>
                <span className="font-bold text-amber-700 font-mono">
                  {formatCurrency(selectedInvoice.saldoPendiente)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto del Cobro Recibido (MXN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedInvoice.saldoPendiente}
                  min={0.01}
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
