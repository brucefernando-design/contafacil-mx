import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFiscalPeriod } from "@/lib/sat/period-helper";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PolizasView } from "./PolizasView";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

export default async function PolizasPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const { year: currentYear, month: currentMonth, startDate, endDate, nombreMes } =
    await resolveFiscalPeriod(props.searchParams);

  // Consultar pólizas del periodo seleccionado
  const polizas = await prisma.poliza.findMany({
    where: {
      organizationId: activeOrg.id,
      fecha: { gte: startDate, lte: endDate },
    },
    include: {
      entries: true,
      invoice: true,
    },
    orderBy: { numero: "desc" },
  });

  const serializedPolizas = polizas.map((p) => ({
    id: p.id,
    numero: p.numero,
    tipo: p.tipo,
    fecha: p.fecha,
    concepto: p.concepto,
    totalDebe: Number(p.totalDebe),
    totalHaber: Number(p.totalHaber),
    estaCuadrada: p.estaCuadrada,
    uuidRelacionado: p.uuidRelacionado,
    invoice: p.invoice ? {
      id: p.invoice.id,
      uuid: p.invoice.uuid,
      serie: p.invoice.serie,
      folio: p.invoice.folio,
      total: Number(p.invoice.total),
    } : null,
    entries: p.entries.map((e) => ({
      id: e.id,
      cuentaCodigo: e.cuentaCodigo,
      cuentaNombre: e.cuentaNombre,
      concepto: e.concepto,
      debe: Number(e.debe),
      haber: Number(e.haber),
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight inline-flex items-center gap-2">
            Pólizas Contables Electrónicas (SAT Anexo 24)
            <AyudaTermino terminoId="poliza" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro contable con partida doble, códigos agrupadores SAT y vinculación de CFDI para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> • Periodo: <strong className="text-emerald-800 font-bold">{nombreMes} {currentYear}</strong>
          </p>
        </div>
        <PeriodSelector currentYear={currentYear} currentMonth={currentMonth} />
      </div>

      <PolizasView initialPolizas={serializedPolizas} activeOrgId={activeOrg.id} />
    </div>
  );
}
