"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, REGIMENES_SAT } from "@/lib/utils";
import { calcularImpuestosSat2026, TaxCalculationResult } from "@/lib/sat/tax-engine";
import {
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Percent,
  Printer,
  RotateCcw,
  Save,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";
import { descargarCsvEnNavegador } from "@/lib/export/csv";

interface MotorFiscalViewProps {
  activeOrg: {
    id: string;
    rfc: string;
    razonSocial: string;
    tipoPersona: string;
    regimenFiscal: string;
    coeficienteUtilidad: number | null;
    deduccionCiega: boolean;
  };
  periodo: {
    year: number;
    month: number;
    nombreMes: string;
  };
  origenDatos: {
    totalFacturas: number;
    facturasEmitidasCount: number;
    facturasRecibidasCount: number;
    emitidasPueCount: number;
    emitidasPpdCount: number;
  };
  initialData: {
    ingresosCobrados: number;
    deduccionesPagadas: number;
    retencionesIsr: number;
    retencionesIva: number;
    ivaCobrado: number;
    ivaPagado: number;
  };
}

export function MotorFiscalView({
  activeOrg,
  periodo,
  origenDatos,
  initialData,
}: MotorFiscalViewProps) {
  const router = useRouter();

  const [regimen, setRegimen] = useState<string>(activeOrg.regimenFiscal || "626");
  const [ingresos, setIngresos] = useState<number>(initialData.ingresosCobrados);
  const [deducciones, setDeducciones] = useState<number>(initialData.deduccionesPagadas);
  const [retIsr, setRetIsr] = useState<number>(initialData.retencionesIsr);
  const [retIva, setRetIva] = useState<number>(initialData.retencionesIva);
  const [ivaCobrado, setIvaCobrado] = useState<number>(initialData.ivaCobrado);
  const [ivaPagado, setIvaPagado] = useState<number>(initialData.ivaPagado);

  // Parámetros específicos
  const [coeficienteUtilidad, setCoeficienteUtilidad] = useState<number>(
    activeOrg.coeficienteUtilidad || 0.0825
  );
  const [usaDeduccionCiega, setUsaDeduccionCiega] = useState<boolean>(activeOrg.deduccionCiega);
  const [impuestoPredial, setImpuestoPredial] = useState<number>(1500);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal Espejo SAT y copia
  const [showModalSat, setShowModalSat] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopiarValor = (key: string, valor: number | string) => {
    navigator.clipboard.writeText(String(valor));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleExportarResumenCsv = () => {
    const headers = ["Concepto Fiscal SAT", "Monto (MXN)", "Detalle / Fundamento"];
    const rows = [
      ["Empresa", activeOrg.razonSocial, `RFC: ${activeOrg.rfc}`],
      ["Periodo", `${periodo.nombreMes} ${periodo.year}`, `Régimen: ${calculo.nombreRegimen}`],
      ["Ingresos Efectivamente Cobrados", calculo.ingresosBase, "Comprobantes PUE y cobros PPD del periodo"],
      ["Deducciones Autorizadas Pagadas", calculo.deduccionesAplicadas, "Gastos e inversiones deducibles"],
      ["Base Gravable Proyectada", calculo.baseGravable, "Ingresos menos deducciones aplicables"],
      ["Tasa o Coeficiente Aplicable", `${calculo.tasaOcuotaIsr}%`, "Tarifa LISR según régimen"],
      ["ISR Causado / Determinado", calculo.isrDeterminado, "Impuesto bruto calculado"],
      ["Retenciones de ISR por Personas Morales", calculo.retencionesIsr, "Art. 113-J LISR u otros"],
      ["ISR Neto a Cargo / Pagar", calculo.isrAPagar, "Monto a enterar en portal bancario SAT"],
      ["IVA Trasladado Cobrado (16%)", calculo.ivaTrasladado, "Actos o actividades gravados"],
      ["IVA Acreditable Pagado (16%)", calculo.ivaAcreditable, "IVA pagado en gastos deducibles"],
      ["Retenciones de IVA Acreditables", calculo.retencionesIva, "Retenciones de IVA recibidas"],
      ["IVA Neto a Pagar", calculo.esSaldoAFavorIva ? 0 : calculo.ivaAPagar, "Impuesto a cargo"],
      ["Saldo a Favor de IVA", calculo.esSaldoAFavorIva ? calculo.saldoAFavorIvaMonto : 0, "Acreditamiento para meses posteriores"],
    ];

    descargarCsvEnNavegador(
      `ResumenFiscal_${activeOrg.rfc}_${periodo.year}_M${periodo.month}`,
      headers,
      rows
    );
  };

  // Ejecutar cálculo reactivo en vivo
  const calculo: TaxCalculationResult = calcularImpuestosSat2026({
    regimenFiscal: regimen,
    tipoPersona: regimen === "601" ? "PM" : "PF",
    ingresosCobrados: Number(ingresos) || 0,
    deduccionesPagadas: Number(deducciones) || 0,
    retencionesIsr: Number(retIsr) || 0,
    retencionesIva: Number(retIva) || 0,
    ivaCobrado: Number(ivaCobrado) || 0,
    ivaPagado: Number(ivaPagado) || 0,
    coeficienteUtilidad: Number(coeficienteUtilidad) || 0.0825,
    usaDeduccionCiega,
    impuestoPredial: Number(impuestoPredial) || 0,
  });

  const handleGuardarDeclaracion = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/tax/save-declaration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: periodo.year,
          month: periodo.month,
          autoCompute: false,
          manualOverrides: calculo,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        router.refresh();
      } else {
        alert("Error al guardar el cálculo en la declaración provisional.");
      }
    } catch {
      alert("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestablecerDatosReales = () => {
    setRegimen(activeOrg.regimenFiscal);
    setIngresos(initialData.ingresosCobrados);
    setDeducciones(initialData.deduccionesPagadas);
    setRetIsr(initialData.retencionesIsr);
    setRetIva(initialData.retencionesIva);
    setIvaCobrado(initialData.ivaCobrado);
    setIvaPagado(initialData.ivaPagado);
    setSavedSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Aviso Legal SAT Obligatorio */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <strong className="font-semibold">Aviso Legal SAT:</strong> Las simulaciones, tasas y cálculos proyectados en este motor son de carácter orientativo y de apoyo técnico basadas en la legislación tributaria mexicana vigente (LISR, LIVA, CFF y RMF). No sustituyen la dictaminación ni la asesoría legal/fiscal personalizada de un Contador Público Titulado, ni constituyen una resolución vinculante del Servicio de Administración Tributaria (SAT).
        </div>
      </div>

      {/* Selector de Régimen SAT 2026 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
          Selecciona el Régimen Fiscal para la Simulación:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              id: "626",
              nombre: "RESICO PF (626)",
              tipo: "Persona Física",
              desc: "1% a 2.5% progresivo sobre flujo. Sin deducciones para ISR.",
            },
            {
              id: "612",
              nombre: "Act. Empresarial (612)",
              tipo: "Persona Física",
              desc: "Tarifa Art. 96 LISR sobre Utilidad (Ingresos - Gastos).",
            },
            {
              id: "606",
              nombre: "Arrendamiento (606)",
              tipo: "Persona Física",
              desc: "Deducción Ciega del 35% + Predial o comprobadas.",
            },
            {
              id: "601",
              nombre: "PM General (601)",
              tipo: "Persona Moral",
              desc: "Coeficiente de Utilidad (CU) × 30% Tasa Ley.",
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRegimen(item.id);
                // Si es RESICO y no había retención, sugerir 1.25%
                if (item.id === "626" && retIsr === 0) {
                  setRetIsr(Number((ingresos * 0.0125).toFixed(2)));
                  setRetIva(Number((ingresos * 0.106667).toFixed(2)));
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                regimen === item.id
                  ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="text-xs font-bold">{item.nombre}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.tipo}</div>
              <div className="text-[11px] text-slate-600 mt-1.5 font-normal leading-snug">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel Izquierdo: Controles y Parámetros */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Parámetros del Mes (Flujo Efectivo)
              </h2>
              <p className="text-xs text-slate-500">
                Modifica los importes para calcular el impacto fiscal en tiempo real
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestablecerDatosReales}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
              title="Restablecer a facturas reales"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Banner indicador de origen de datos (N facturas del mes) */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
            <FileCheck2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-950">
              <div className="font-bold flex items-center gap-1.5">
                <span>Precarga automática desde CFDI</span>
                <span className="bg-emerald-200/80 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded font-mono">
                  {origenDatos.totalFacturas} facturas del mes
                </span>
              </div>
              <div className="text-emerald-800 text-[11px] mt-0.5">
                Datos calculados a partir de {origenDatos.facturasEmitidasCount} emitidas ({origenDatos.emitidasPueCount} PUE cobradas) y {origenDatos.facturasRecibidasCount} gastos recibidos para {periodo.nombreMes} {periodo.year}.
              </div>
            </div>
          </div>

          {/* Ingresos Cobrados */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ingresos Cobrados (Subtotal sin IVA)</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                  {origenDatos.emitidasPueCount} PUE
                </span>
              </label>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(ingresos)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="1000"
              value={ingresos}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setIngresos(val);
                setIvaCobrado(Number((val * 0.16).toFixed(2)));
                if (regimen === "626") {
                  setRetIsr(Number((val * 0.0125).toFixed(2)));
                  setRetIva(Number((val * 0.106667).toFixed(2)));
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Deducciones Pagadas */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Deducciones y Gastos Pagados (CFDI)</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-mono">
                  {origenDatos.facturasRecibidasCount} facturas
                </span>
              </label>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(deducciones)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="1000"
              value={deducciones}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDeducciones(val);
                setIvaPagado(Number((val * 0.16).toFixed(2)));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {regimen === "626" && (
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                * En RESICO PF las deducciones NO reducen el ISR, pero sí acreditan el IVA.
              </span>
            )}
          </div>

          {/* Opciones Específicas por Régimen */}
          {regimen === "601" && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Coeficiente de Utilidad (CU PM General)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.005"
                  value={coeficienteUtilidad}
                  onChange={(e) => setCoeficienteUtilidad(parseFloat(e.target.value) || 0.0825)}
                  className="w-32 px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                />
                <span className="text-xs text-slate-500 font-semibold">
                  = {(coeficienteUtilidad * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {regimen === "606" && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={usaDeduccionCiega}
                  onChange={(e) => setUsaDeduccionCiega(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Aplicar Deducción Ciega (35% sin comprobante)</span>
              </label>

              {usaDeduccionCiega && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Impuesto Predial Pagado del Periodo:
                  </label>
                  <input
                    type="number"
                    value={impuestoPredial}
                    onChange={(e) => setImpuestoPredial(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Retenciones de Terceros */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Retención ISR (PM)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={retIsr}
                onChange={(e) => setRetIsr(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Retención IVA (PM)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={retIva}
                onChange={(e) => setRetIva(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Panel Derecho: Liquidación Fiscal y Auditoría Paso a Paso */}
        <div className="lg:col-span-7 space-y-4">
          {/* Resultados Clave (ISR e IVA a pagar) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
                ISR Provisional Neto a Pagar
                <AyudaTermino terminoId="isr" />
              </span>
              <div className="text-3xl font-black text-emerald-400">
                {formatCurrency(calculo.isrAPagar)}
              </div>
              <div className="text-xs text-slate-300 pt-1 border-t border-slate-700 flex justify-between">
                <span>Tasa efectiva / marginal:</span>
                <strong className="font-mono">{calculo.tasaOcuotaIsr}%</strong>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
                {calculo.esSaldoAFavorIva ? "Saldo a Favor de IVA" : "IVA Neto a Pagar"}
                <AyudaTermino terminoId="iva" />
              </span>
              <div
                className={`text-3xl font-black ${
                  calculo.esSaldoAFavorIva ? "text-teal-400" : "text-amber-400"
                }`}
              >
                {formatCurrency(
                  calculo.esSaldoAFavorIva ? calculo.saldoAFavorIvaMonto : calculo.ivaAPagar
                )}
              </div>
              <div className="text-xs text-slate-300 pt-1 border-t border-slate-700 flex justify-between">
                <span>Balance de IVA:</span>
                <strong className="font-mono">
                  {calculo.esSaldoAFavorIva ? "Acreditamiento" : "Pago Bancario"}
                </strong>
              </div>
            </div>
          </div>

          {/* Desglose Auditoría Paso a Paso */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Memoria de Cálculo y Fundamento SAT 2026
                </h3>
                <p className="text-xs text-slate-500">
                  {calculo.nombreRegimen}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportarResumenCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-colors"
                  title="Descargar desglose de liquidación en formato CSV compatible con Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar CSV / Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowModalSat(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
                  title="Abrir carátula espejo con casilleros idénticos al portal del SAT y copia en 1 clic"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Ficha Espejo SAT</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleGuardarDeclaracion}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Guardando..." : "Guardar Declaración"}</span>
                </button>
              </div>
            </div>

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Declaración provisional mensual actualizada con éxito en la base de datos fiscal.
                </span>
              </div>
            )}

            <div className="space-y-2">
              {calculo.desglosePasoAPaso.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs gap-4"
                >
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">{item.paso}</span>
                    <span className="text-slate-500 text-[11px]">{item.detalle}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 shrink-0 text-sm">
                    {item.paso.includes("Tasa") || item.paso.includes("CU")
                      ? `${item.monto}%`
                      : formatCurrency(item.monto)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ficha Espejo SAT */}
      {showModalSat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      Carátula Espejo Portal SAT
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      SAT 2026
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {activeOrg.razonSocial} ({activeOrg.rfc}) · {periodo.nombreMes} {periodo.year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalSat(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p>
                  <strong>Formato Oficial SAT:</strong> El portal tributario requiere capturar cifras redondeadas en pesos enteros sin centavos. Haz clic en <strong>Copiar</strong> en cada casilla para transferir el valor al formulario del SAT.
                </p>
              </div>

              {/* Sección ISR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold uppercase tracking-wider text-slate-600 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Casilleros ISR — {calculo.nombreRegimen}
                  </span>
                  <span className="text-[11px] text-slate-400">Declaración Provisional Mensual</span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      id: "isr_ingresos",
                      label: "Total de ingresos efectivamente cobrados del periodo",
                      valorRedondeado: Math.round(calculo.ingresosBase),
                      valorExacto: calculo.ingresosBase,
                    },
                    {
                      id: "isr_deducciones",
                      label: "Deducciones autorizadas / deducción ciega aplicable",
                      valorRedondeado: Math.round(calculo.deduccionesAplicadas),
                      valorExacto: calculo.deduccionesAplicadas,
                    },
                    {
                      id: "isr_base",
                      label: "Base gravable para pago provisional",
                      valorRedondeado: Math.round(calculo.baseGravable),
                      valorExacto: calculo.baseGravable,
                    },
                    {
                      id: "isr_tasa",
                      label: "Tasa o porcentaje aplicable según tarifa",
                      valorRedondeado: calculo.tasaOcuotaIsr,
                      valorExacto: `${calculo.tasaOcuotaIsr}%`,
                      esPorcentaje: true,
                    },
                    {
                      id: "isr_causado",
                      label: "Impuesto causado del periodo",
                      valorRedondeado: Math.round(calculo.isrDeterminado),
                      valorExacto: calculo.isrDeterminado,
                    },
                    {
                      id: "isr_retenciones",
                      label: "Retenciones de ISR efectivamente efectuadas por PM",
                      valorRedondeado: Math.round(calculo.retencionesIsr),
                      valorExacto: calculo.retencionesIsr,
                    },
                    {
                      id: "isr_cargo",
                      label: "Impuesto a cargo (Monto a pagar en línea de captura)",
                      valorRedondeado: Math.round(calculo.isrAPagar),
                      valorExacto: calculo.isrAPagar,
                      destacado: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        item.destacado
                          ? "bg-emerald-50/60 border-emerald-200"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="font-semibold text-slate-800 text-xs">{item.label}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Exacto: {typeof item.valorExacto === "number" ? formatCurrency(item.valorExacto) : item.valorExacto}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          {item.esPorcentaje ? `${item.valorRedondeado}%` : `$ ${item.valorRedondeado.toLocaleString("es-MX")}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopiarValor(item.id, item.valorRedondeado)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            copiedKey === item.id
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          }`}
                        >
                          {copiedKey === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección IVA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold uppercase tracking-wider text-slate-600 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Casilleros IVA — Declaración Definitiva Mensual
                  </span>
                  <span className="text-[11px] text-slate-400">Ley del IVA Art. 5</span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      id: "iva_base",
                      label: "Total de actos o actividades gravados a tasa 16%",
                      valorRedondeado: Math.round(calculo.ingresosBase),
                      valorExacto: calculo.ingresosBase,
                    },
                    {
                      id: "iva_cobrado",
                      label: "IVA cobrado / trasladado al 16%",
                      valorRedondeado: Math.round(calculo.ivaTrasladado),
                      valorExacto: calculo.ivaTrasladado,
                    },
                    {
                      id: "iva_acreditable",
                      label: "IVA acreditable del periodo (gastos deducibles)",
                      valorRedondeado: Math.round(calculo.ivaAcreditable),
                      valorExacto: calculo.ivaAcreditable,
                    },
                    {
                      id: "iva_retenciones",
                      label: "Retenciones de IVA efectivamente aplicadas",
                      valorRedondeado: Math.round(calculo.retencionesIva),
                      valorExacto: calculo.retencionesIva,
                    },
                    {
                      id: "iva_cargo_favor",
                      label: calculo.esSaldoAFavorIva
                        ? "Saldo a favor de IVA determinado"
                        : "Impuesto a cargo de IVA (Línea de captura)",
                      valorRedondeado: Math.round(
                        calculo.esSaldoAFavorIva ? calculo.saldoAFavorIvaMonto : calculo.ivaAPagar
                      ),
                      valorExacto: calculo.esSaldoAFavorIva
                        ? calculo.saldoAFavorIvaMonto
                        : calculo.ivaAPagar,
                      destacado: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        item.destacado
                          ? "bg-teal-50/60 border-teal-200"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="font-semibold text-slate-800 text-xs">{item.label}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Exacto: {formatCurrency(item.valorExacto)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          $ {item.valorRedondeado.toLocaleString("es-MX")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopiarValor(item.id, item.valorRedondeado)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            copiedKey === item.id
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          }`}
                        >
                          {copiedKey === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Fundamento: LISR Arts. 96, 106, 113-E y LIVA Art. 5.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportarResumenCsv}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Descargar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModalSat(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
