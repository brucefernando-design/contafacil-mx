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

  // Calcular cobrado real PUE + PPD pagos
  let ingresosCobrados = 0;
  let ivaCobrado = 0;
  let retIsr = 0;
  let retIva = 0;

  for (const f of facturasEmitidas) {
    if (f.metodoPago === "PUE") {
      ingresosCobrados += Number(f.subtotal);
      ivaCobrado += Number(f.totalIvaTrasladado);
      retIsr += Number(f.totalIsrRetenido);
      retIva += Number(f.totalIvaRetenido);
    } else {
      for (const p of f.paymentComplements) {
        const factor = Number(p.monto) / (Number(f.total) || 1);
        ingresosCobrados += Number(f.subtotal) * factor;
        ivaCobrado += Number(f.totalIvaTrasladado) * factor;
        retIsr += Number(f.totalIsrRetenido) * factor;
        retIva += Number(f.totalIvaRetenido) * factor;
      }
    }
  }

  const deduccionesPagadas = facturasRecibidas.reduce((sum, g) => sum + Number(g.subtotal), 0);
  const ivaPagado = facturasRecibidas.reduce((sum, g) => sum + Number(g.totalIvaTrasladado), 0);

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

      {facturasEmitidas.length === 0 && facturasRecibidas.length === 0 && (
        <PeriodoSinXmlEmptyState
          nombreMes={nombreMes}
          year={currentYear}
          month={currentMonth}
          descripcion="Este periodo fiscal no tiene ingresos ni gastos XML registrados. Puedes cargar los comprobantes de prueba para visualizar el cálculo de ISR e IVA, o cambiar de mes."
        />
      )}

      <MotorFiscalView
        activeOrg={{
          id: activeOrg.id,
          rfc: activeOrg.rfc,
          razonSocial: activeOrg.razonSocial,
          tipoPersona: activeOrg.tipoPersona,
          regimenFiscal: activeOrg.regimenFiscal,
          coeficienteUtilidad: activeOrg.coeficienteUtilidad ? Number(activeOrg.coeficienteUtilidad) : null,
          deduccionCiega: activeOrg.deduccionCiega,
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
    </div>
  );
}
