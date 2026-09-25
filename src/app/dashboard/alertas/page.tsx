import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AlertasView } from "./AlertasView";
import { SatAlertsEngine } from "@/lib/sat/sat-alerts-engine";
import { resolveFiscalPeriod } from "@/lib/sat/period-helper";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PeriodoSinXmlEmptyState } from "@/components/PeriodoSinXmlEmptyState";

export default async function AlertasPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const { year: currentYear, month: currentMonth, startDate, endDate, nombreMes } =
    await resolveFiscalPeriod(props.searchParams);

  // Consultar conteo de facturas en el periodo
  const invoicesInPeriod = await prisma.invoice.count({
    where: {
      organizationId: activeOrg.id,
      fecha: { gte: startDate, lte: endDate },
    },
  });

  // Ejecutar auditoría en vivo
  const auditoriaAlertas = await SatAlertsEngine.auditarAlertasEmpresa(activeOrg.id);

  // Consultar alertas guardadas en base de datos
  const alertasGuardadas = await prisma.fiscalAlert.findMany({
    where: { organizationId: activeOrg.id },
    orderBy: { createdAt: "desc" },
  });

  // Consultar muestra de lista negra del SAT
  const listaNegraMuestra = await prisma.satBlacklist.findMany({
    take: 10,
    orderBy: { publicacionDof: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Centro de Alertas Fiscales (Opinión 32-D & Monitoreo 69-B)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoreo preventivo para detección de riesgos y cumplimiento ante el SAT para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> • Periodo: <strong className="text-emerald-800 font-bold">{nombreMes} {currentYear}</strong>
          </p>
        </div>
        <PeriodSelector currentYear={currentYear} currentMonth={currentMonth} />
      </div>

      {invoicesInPeriod === 0 && (
        <PeriodoSinXmlEmptyState
          currentYear={currentYear}
          currentMonth={currentMonth}
          nombreMes={nombreMes}
        />
      )}

      <AlertasView
        activeOrg={activeOrg}
        alertasAuditoria={auditoriaAlertas}
        alertasGuardadas={alertasGuardadas}
        listaNegra={listaNegraMuestra}
      />
    </div>
  );
}
