import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFiscalPeriod } from "@/lib/sat/period-helper";
import { PeriodSelector } from "@/components/PeriodSelector";
import { BalanzaView } from "./BalanzaView";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

export default async function BalanzaPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const { year: currentYear, month: currentMonth, startDate, endDate, nombreMes } =
    await resolveFiscalPeriod(props.searchParams);

  // Consultar todas las cuentas de catálogo y entradas de pólizas de la organización
  const cuentas = await prisma.satCatalogAccount.findMany({
    where: { organizationId: activeOrg.id },
    orderBy: { codigoSat: "asc" },
  });

  // Calcular movimientos dinámicos a partir de las pólizas registradas en el periodo
  const entries = await prisma.polizaEntry.findMany({
    where: {
      poliza: {
        organizationId: activeOrg.id,
        fecha: { gte: startDate, lte: endDate },
      },
    },
  });

  // Agrupar movimientos por código SAT
  const movimientosPorCuenta: Record<string, { cargos: number; abonos: number; nombre: string }> = {};
  for (const entry of entries) {
    if (!movimientosPorCuenta[entry.cuentaCodigo]) {
      movimientosPorCuenta[entry.cuentaCodigo] = {
        cargos: 0,
        abonos: 0,
        nombre: entry.cuentaNombre,
      };
    }
    movimientosPorCuenta[entry.cuentaCodigo].cargos += Number(entry.debe);
    movimientosPorCuenta[entry.cuentaCodigo].abonos += Number(entry.haber);
  }

  const serializedCuentas = cuentas.map((c) => ({
    ...c,
    saldoInicial: Number(c.saldoInicial),
    cargos: Number(c.cargos),
    abonos: Number(c.abonos),
    saldoFinal: Number(c.saldoFinal),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight inline-flex items-center gap-2">
            Balanza de Comprobación SAT (Anexo 24)
            <AyudaTermino terminoId="balanza" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Contabilidad Electrónica obligatoria SAT con código agrupador, saldos iniciales, movimientos y comprobación de sumas iguales para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> • Periodo: <strong className="text-emerald-800 font-bold">{nombreMes} {currentYear}</strong>
          </p>
        </div>
        <PeriodSelector currentYear={currentYear} currentMonth={currentMonth} />
      </div>

      <BalanzaView
        activeRfc={activeOrg.rfc}
        activeOrgName={activeOrg.razonSocial}
        cuentas={serializedCuentas}
        movimientos={movimientosPorCuenta}
      />
    </div>
  );
}
