import Link from "next/link";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, REGIMENES_SAT } from "@/lib/utils";
import { calcularImpuestosSat2026, calcularFechaVencimientoSat, obtenerNombreMes } from "@/lib/sat/tax-engine";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Info,
  Plus,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.user || !sessionData.activeOrg) return null;

  const { activeOrg, user } = sessionData;

  // Fecha del mes actual dinámico
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
  const nombreMes = obtenerNombreMes(currentMonth);

  // Consultar facturas del mes
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: activeOrg.id,
      fecha: { gte: startDate, lte: endDate },
    },
    include: { items: true, paymentComplements: true },
    orderBy: { fecha: "desc" },
  });

  const allRecentInvoices = await prisma.invoice.findMany({
    where: { organizationId: activeOrg.id },
    take: 8,
    orderBy: { fecha: "desc" },
  });

  // Facturas emitidas PUE (efectivamente cobradas)
  const emitidasPue = invoices.filter(
    (i) => i.tipo === "EMITIDA" && i.metodoPago === "PUE" && i.estatus === "VIGENTE"
  );
  // Facturas emitidas PPD con cobros registrados
  const emitidasPpd = invoices.filter(
    (i) => i.tipo === "EMITIDA" && i.metodoPago === "PPD" && i.estatus === "VIGENTE"
  );
  // Gastos pagados
  const gastosPagados = invoices.filter(
    (i) => i.tipo === "RECIBIDA" && i.estatus === "VIGENTE"
  );

  // Calcular flujo de ingresos cobrados
  let ingresosCobrados = emitidasPue.reduce((acc, f) => acc + Number(f.subtotal), 0);
  let ivaCobrado = emitidasPue.reduce((acc, f) => acc + Number(f.totalIvaTrasladado), 0);
  let retIsr = emitidasPue.reduce((acc, f) => acc + Number(f.totalIsrRetenido), 0);
  let retIva = emitidasPue.reduce((acc, f) => acc + Number(f.totalIvaRetenido), 0);

  // Sumar cobros registrados en PPD
  for (const ppd of emitidasPpd) {
    for (const comp of ppd.paymentComplements) {
      const factor = Number(comp.monto) / (Number(ppd.total) || 1);
      ingresosCobrados += Number(ppd.subtotal) * factor;
      ivaCobrado += Number(ppd.totalIvaTrasladado) * factor;
      retIsr += Number(ppd.totalIsrRetenido) * factor;
      retIva += Number(ppd.totalIvaRetenido) * factor;
    }
  }

  const deduccionesPagadas = gastosPagados.reduce((acc, g) => acc + Number(g.subtotal), 0);
  const ivaPagado = gastosPagados.reduce((acc, g) => acc + Number(g.totalIvaTrasladado), 0);

  // Cálculo en tiempo real con motor fiscal SAT 2026
  const calcFiscal = calcularImpuestosSat2026({
    regimenFiscal: activeOrg.regimenFiscal,
    tipoPersona: activeOrg.tipoPersona as "PF" | "PM",
    ingresosCobrados,
    deduccionesPagadas,
    retencionesIsr: retIsr,
    retencionesIva: retIva,
    ivaCobrado,
    ivaPagado,
    coeficienteUtilidad: activeOrg.coeficienteUtilidad ? Number(activeOrg.coeficienteUtilidad) : 0.0825,
    usaDeduccionCiega: activeOrg.deduccionCiega,
  });

  // Vencimiento SAT 2026
  const vencimiento = calcularFechaVencimientoSat(activeOrg.rfc, currentYear, currentMonth);

  // Alertas activas
  const alertas = await prisma.fiscalAlert.findMany({
    where: { organizationId: activeOrg.id, leida: false },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activeOrg.rfc}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {activeOrg.tipoPersona === "PM" ? "Persona Moral" : "Persona Física"}
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
              Régimen {activeOrg.regimenFiscal}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {activeOrg.razonSocial}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {REGIMENES_SAT[activeOrg.regimenFiscal] || "Régimen Fiscal General"} • C.P. {activeOrg.codigoPostal}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/facturacion"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Factura CFDI 4.0
          </Link>
          <Link
            href="/dashboard/boveda"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs border border-slate-200 transition-all"
          >
            <FolderArchive className="w-4 h-4 text-slate-600" /> Bóveda XML
          </Link>
          <Link
            href="/dashboard/motor-fiscal"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-all"
          >
            <Scale className="w-4 h-4" /> Simulador SAT 2026
          </Link>
        </div>
      </div>

      {/* Aviso Legal SAT */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">Aviso Legal SAT:</strong> ContaFácil MX es una plataforma independiente de gestión y cálculo contable. Los cálculos, declaraciones preliminares y simulaciones son de carácter informativo conforme a la legislación fiscal mexicana (LISR, LIVA, CFF y RMF). No sustituyen la asesoría profesional de un contador público titulado ni constituyen una resolución vinculante del Servicio de Administración Tributaria (SAT).
        </p>
      </div>

      {/* Alertas Preventivas SAT si existen */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                alerta.severidad === "CRITICAL"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : alerta.severidad === "HIGH"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm mb-0.5">{alerta.titulo}</div>
                <p className="opacity-90">{alerta.descripcion}</p>
              </div>
              <Link
                href="/dashboard/alertas"
                className="text-xs font-semibold underline shrink-0 hover:opacity-80"
              >
                Revisar →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards (4 Métricas Fiscales Clave) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos Cobrados */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ingresos Cobrados
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(calcFiscal.ingresosBase)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> Flujo Efectivo
              </span>
              <span>• {nombreMes} {currentYear}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Deducciones Pagadas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {activeOrg.regimenFiscal === "626"
                ? "Gastos con CFDI"
                : activeOrg.regimenFiscal === "606"
                ? "Deducción Ciega (35%)"
                : "Deducciones Autorizadas"}
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(calcFiscal.deduccionesAplicadas || deduccionesPagadas)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
              <span className="text-blue-600 font-semibold flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {gastosPagados.length} facturas
              </span>
              <span>• Pagadas</span>
            </div>
          </div>
        </div>

        {/* Card 3: ISR Estimado a Pagar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ISR Prov. Estimado
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              ISR
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(calcFiscal.isrAPagar)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">
                Tasa: {calcFiscal.tasaOcuotaIsr}%
              </span>
              {calcFiscal.retencionesIsr > 0 && (
                <span>• Menos {formatCurrency(calcFiscal.retencionesIsr)} ret.</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: IVA Neto */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {calcFiscal.esSaldoAFavorIva ? "Saldo a Favor IVA" : "IVA Neto a Pagar"}
            </span>
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                calcFiscal.esSaldoAFavorIva
                  ? "bg-teal-50 text-teal-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              IVA
            </span>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black ${
                calcFiscal.esSaldoAFavorIva ? "text-teal-700" : "text-slate-900"
              }`}
            >
              {formatCurrency(
                calcFiscal.esSaldoAFavorIva
                  ? calcFiscal.saldoAFavorIvaMonto
                  : calcFiscal.ivaAPagar
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              Trasladado: {formatCurrency(calcFiscal.ivaTrasladado)} - Acreditable: {formatCurrency(calcFiscal.ivaAcreditable)}
            </div>
          </div>
        </div>
      </div>

      {/* Calendario SAT y Estado de Cuenta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario de Obligaciones SAT 2026 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Calendario Fiscal SAT 2026
                </h3>
                <span className="text-[11px] text-slate-500">
                  Día 17 + Días adicionales por 6to dígito
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Obligación:</span>
                <span className="font-bold text-slate-900">Pago Provisional ISR / IVA</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Periodo:</span>
                <span className="font-bold text-slate-900">{nombreMes} {currentYear}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Fecha Límite SAT:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatDate(vencimiento.fechaLimite)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                {vencimiento.descripcion}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Estatus CSD:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Certificado Activo (Vigente 2028)
            </span>
          </div>
        </div>

        {/* Desglose del Régimen Fiscal */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Reglas del Régimen {activeOrg.regimenFiscal} (SAT 2026)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo provisional mensual automatizado conforme a la LISR
              </p>
            </div>
            <Link
              href="/dashboard/motor-fiscal"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ver cálculo completo →
            </Link>
          </div>

          <div className="space-y-2.5">
            {calcFiscal.desglosePasoAPaso.slice(0, 5).map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{p.paso}:</span>
                  <span className="text-slate-500 ml-2">{p.detalle}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 shrink-0 ml-4">
                  {p.paso.includes("Tasa") || p.paso.includes("CU")
                    ? `${p.monto}%`
                    : formatCurrency(p.monto)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-medium text-emerald-900">
                Opinión de Cumplimiento 32-D:
              </span>
              <strong className="text-emerald-800 uppercase">
                {activeOrg.opinionCumplimiento}
              </strong>
            </div>
            <span className="text-emerald-700 text-[11px] font-medium">
              Sin créditos fiscales pendientes
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas Recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Comprobantes Fiscales Recientes (CFDI 4.0)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Facturas emitidas y recibidas con timbrado digital y validación SAT
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/boveda"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ir a Bóveda XML →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 font-semibold">Folio / UUID</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Fecha</th>
                <th className="px-6 py-3 font-semibold">Contraparte</th>
                <th className="px-6 py-3 font-semibold">Método</th>
                <th className="px-6 py-3 font-semibold text-right">Total</th>
                <th className="px-6 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRecentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No hay facturas registradas aún para este RFC.
                  </td>
                </tr>
              ) : (
                allRecentInvoices.map((inv) => {
                  const esEmitida = inv.tipo === "EMITIDA";
                  const contraparte = esEmitida
                    ? `${inv.receptorNombre} (${inv.receptorRfc})`
                    : `${inv.emisorNombre} (${inv.emisorRfc})`;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-mono font-bold text-slate-900">
                          {inv.serie ? `${inv.serie}-` : ""}{inv.folio || "S/F"}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={inv.uuid}>
                          {inv.uuid}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            esEmitida
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {esEmitida ? "Emitida" : "Recibida"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                        {formatDate(inv.fecha)}
                      </td>
                      <td className="px-6 py-3.5 max-w-xs truncate" title={contraparte}>
                        <span className="font-medium text-slate-800">{contraparte}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            inv.metodoPago === "PUE"
                              ? "bg-slate-100 text-slate-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {inv.metodoPago}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/facturas/${inv.id}/pdf`}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Ver Representación Impresa (PDF)"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/dashboard/polizas"
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                            title="Ver Póliza Contable"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </Link>
                        </div>
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
  );
}
