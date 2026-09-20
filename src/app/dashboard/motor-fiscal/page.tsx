import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFiscalPeriod } from "@/lib/sat/period-helper";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PeriodoSinXmlEmptyState } from "@/components/PeriodoSinXmlEmptyState";
import { MotorFiscalView } from "./MotorFiscalView";

export default async function MotorFiscalPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  // Obtener periodo seleccionado (o Septiembre 2026 por default para demo)
  const { year: currentYear, month: currentMonth, startDate, endDate, nombreMes } =
    await resolveFiscalPeriod(props.searchParams);

  const facturasEmitidas = await prisma.invoice.findMany({
    where: {
      organizationId: activeOrg.id,
      tipo: "EMITIDA",
      estatus: "VIGENTE",
      fecha: { gte: startDate, lte: endDate },
    },
    include: { paymentComplements: true },
  });

  const facturasRecibidas = await prisma.invoice.findMany({
    where: {
      organizationId: activeOrg.id,
      tipo: "RECIBIDA",
      estatus: "VIGENTE",
      fecha: { gte: startDate, lte: endDate },
    },
  });

  const emitidasPue = facturasEmitidas.filter((f) => f.metodoPago === "PUE");
  const emitidasPpd = facturasEmitidas.filter((f) => f.metodoPago === "PPD");

  // Calcular cobrado real PUE + PPD pagos
  let ingresosCobrados = 0;
  let ivaCobrado = 0;
  let retIsr = 0;
  let retIva = 0;

  for (const f of emitidasPue) {
    ingresosCobrados += Number(f.subtotal);
    ivaCobrado += Number(f.totalIvaTrasladado);
    retIsr += Number(f.totalIsrRetenido);
    retIva += Number(f.totalIvaRetenido);
  }

  // Sumar pagos PPD de facturas emitidas este mes
  for (const f of emitidasPpd) {
    for (const p of f.paymentComplements) {
      if (p.fechaPago >= startDate && p.fechaPago <= endDate) {
        const factor = Number(p.monto) / (Number(f.total) || 1);
        ingresosCobrados += Number(f.subtotal) * factor;
        ivaCobrado += Number(f.totalIvaTrasladado) * factor;
        retIsr += Number(f.totalIsrRetenido) * factor;
        retIva += Number(f.totalIvaRetenido) * factor;
      }
    }
  }

  // Buscar también complementos de pago cobrados en este mes para facturas PPD de meses previos
  const complementosPpdPrevias = await prisma.paymentComplement.findMany({
    where: {
      fechaPago: { gte: startDate, lte: endDate },
      invoicePpd: {
        organizationId: activeOrg.id,
        tipo: "EMITIDA",
        estatus: "VIGENTE",
        fecha: { lt: startDate },
      },
    },
    include: { invoicePpd: true },
  });

  for (const p of complementosPpdPrevias) {
    const inv = p.invoicePpd;
    const factor = Number(p.monto) / (Number(inv.total) || 1);
    ingresosCobrados += Number(inv.subtotal) * factor;
    ivaCobrado += Number(inv.totalIvaTrasladado) * factor;
    retIsr += Number(inv.totalIsrRetenido) * factor;
    retIva += Number(inv.totalIvaRetenido) * factor;
  }

  const deduccionesPagadas = facturasRecibidas.reduce((sum, g) => sum + Number(g.subtotal), 0);
  const ivaPagado = facturasRecibidas.reduce((sum, g) => sum + Number(g.totalIvaTrasladado), 0);

  const totalFacturas = facturasEmitidas.length + facturasRecibidas.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Motor Fiscal SAT México 2026
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulador y liquidador oficial de impuestos provisionales para RESICO PF, Actividad Empresarial, Arrendamiento y PM General • Periodo: <strong className="text-emerald-800 font-bold">{nombreMes} {currentYear}</strong>
          </p>
        </div>
        <PeriodSelector currentYear={currentYear} currentMonth={currentMonth} />
      </div>

      {totalFacturas === 0 ? (
        <PeriodoSinXmlEmptyState
          nombreMes={nombreMes}
          year={currentYear}
          month={currentMonth}
          titulo="Este mes no tiene comprobantes"
          descripcion={`No se muestran cálculos en $0.00 porque ${nombreMes} ${currentYear} no tiene facturas emitidas ni gastos XML registrados. Puedes cargar los comprobantes de prueba para este mes, ir a la demostración de Septiembre 2026, o cambiar de periodo.`}
        />
      ) : (
        <MotorFiscalView
          key={`${activeOrg.id}-${currentYear}-${currentMonth}`}
          activeOrg={{
            id: activeOrg.id,
            rfc: activeOrg.rfc,
            razonSocial: activeOrg.razonSocial,
            tipoPersona: activeOrg.tipoPersona,
            regimenFiscal: activeOrg.regimenFiscal,
            coeficienteUtilidad: activeOrg.coeficienteUtilidad ? Number(activeOrg.coeficienteUtilidad) : null,
            deduccionCiega: activeOrg.deduccionCiega,
          }}
          periodo={{
            year: currentYear,
            month: currentMonth,
            nombreMes,
          }}
          origenDatos={{
            totalFacturas,
            facturasEmitidasCount: facturasEmitidas.length,
            facturasRecibidasCount: facturasRecibidas.length,
            emitidasPueCount: emitidasPue.length,
            emitidasPpdCount: emitidasPpd.length,
          }}
          initialData={{
            ingresosCobrados: Number(ingresosCobrados.toFixed(2)),
            deduccionesPagadas: Number(deduccionesPagadas.toFixed(2)),
            retencionesIsr: Number(retIsr.toFixed(2)),
            retencionesIva: Number(retIva.toFixed(2)),
            ivaCobrado: Number(ivaCobrado.toFixed(2)),
            ivaPagado: Number(ivaPagado.toFixed(2)),
          }}
        />
      )}
    </div>
  );
}
