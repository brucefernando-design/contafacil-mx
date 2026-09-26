import { getCurrentUserAndOrg } from "@/lib/session";
import { resolveFiscalPeriod } from "@/lib/sat/period-helper";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PeriodoSinXmlEmptyState } from "@/components/PeriodoSinXmlEmptyState";
import { MotorFiscalView } from "./MotorFiscalView";
import { sumarBaseMensual } from "@/lib/sat/papel-trabajo";

export default async function MotorFiscalPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  // Obtener periodo seleccionado
  const { year: currentYear, month: currentMonth, nombreMes } =
    await resolveFiscalPeriod(props.searchParams);

  // Sumar base mensual con rigor fiscal mexicano (PUE + PPD cobrados vs gastos pagados)
  const baseMensual = await sumarBaseMensual({
    organizationId: activeOrg.id,
    year: currentYear,
    month: currentMonth,
  });

  const { totalFacturas } = baseMensual.conteo;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Papel de Trabajo Mensual SAT
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cifras para copiar al portal del SAT. EasyConta no presenta la declaración. • Periodo:{" "}
            <strong className="text-emerald-800 font-bold">
              {nombreMes} {currentYear}
            </strong>
          </p>
        </div>
        <PeriodSelector currentYear={currentYear} currentMonth={currentMonth} />
      </div>

      {totalFacturas === 0 ? (
        <PeriodoSinXmlEmptyState
          nombreMes={nombreMes}
          year={currentYear}
          month={currentMonth}
          titulo="Este mes no tiene comprobantes registrados"
          descripcion={`No se registran facturas emitidas ni gastos XML en ${nombreMes} ${currentYear}. Sube tus archivos XML a la Bóveda o emite facturas para calcular automáticamente los pagos provisionales de ISR e IVA.`}
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
            totalFacturas: baseMensual.conteo.totalFacturas,
            facturasEmitidasCount: baseMensual.conteo.facturasEmitidasCount,
            facturasRecibidasCount: baseMensual.conteo.facturasRecibidasCount,
            emitidasPueCount: baseMensual.conteo.emitidasPueCount,
            emitidasPpdCount: baseMensual.conteo.emitidasPpdCount,
            emitidasPpdCobradosCount: baseMensual.conteo.emitidasPpdCobradosCount,
            gastosPagadosCount: baseMensual.conteo.gastosPagadosCount,
          }}
          initialData={{
            ingresosCobrados: baseMensual.ingresosCobrados,
            deduccionesPagadas: baseMensual.deduccionesPagadas,
            retencionesIsr: baseMensual.retencionesIsr,
            retencionesIva: baseMensual.retencionesIva,
            ivaCobrado: baseMensual.ivaCobrado,
            ivaPagado: baseMensual.ivaPagado,
          }}
        />
      )}
    </div>
  );
}
