import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFiscalPeriod } from "@/lib/sat/period-helper";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PeriodoSinXmlEmptyState } from "@/components/PeriodoSinXmlEmptyState";
import { ConciliacionView } from "./ConciliacionView";

export default async function ConciliacionPage(props: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const { year: currentYear, month: currentMonth, startDate, endDate, nombreMes } =
    await resolveFiscalPeriod(props.searchParams);

  // Consultar todas las facturas PPD y PUE
  const ppdInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: activeOrg.id,
      metodoPago: "PPD",
    },
    include: {
      paymentComplements: {
        orderBy: { fechaPago: "desc" },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const pueCount = await prisma.invoice.count({
    where: {
      organizationId: activeOrg.id,
      metodoPago: "PUE",
    },
  });

  // Consultar movimientos bancarios
  const bankTransactions = await prisma.bankTransaction.findMany({
    where: { organizationId: activeOrg.id },
    orderBy: { fecha: "desc" },
  });

  // Consultar todas las facturas para match de conciliación
  const allInvoices = await prisma.invoice.findMany({
    where: { organizationId: activeOrg.id },
    select: {
      id: true,
      uuid: true,
      serie: true,
      folio: true,
      tipo: true,
      total: true,
      fecha: true,
      metodoPago: true,
      emisorNombre: true,
      emisorRfc: true,
      receptorNombre: true,
      receptorRfc: true,
      estaConciliada: true,
    },
    orderBy: { fecha: "desc" },
  });

  // Serializar Decimales para el cliente
  const serializedPpd = ppdInvoices.map((inv) => ({
    id: inv.id,
    serie: inv.serie,
    folio: inv.folio,
    uuid: inv.uuid,
    fecha: inv.fecha,
    tipo: inv.tipo,
    total: Number(inv.total),
    saldoPendiente: Number(inv.saldoPendiente),
    estaConciliada: inv.estaConciliada,
    receptorRfc: inv.receptorRfc,
    receptorNombre: inv.receptorNombre,
    paymentComplements: inv.paymentComplements.map((p) => ({
      id: p.id,
      fechaPago: p.fechaPago,
      monto: Number(p.monto),
      numParcialidad: p.numParcialidad,
      saldoAnterior: Number(p.saldoAnterior),
      saldoInsoluto: Number(p.saldoInsoluto),
      formaPago: p.formaPago,
    })),
  }));

  const serializedBankTx = bankTransactions.map((tx) => ({
    id: tx.id,
    fecha: tx.fecha,
    concepto: tx.concepto,
    monto: Number(tx.monto),
    tipo: tx.tipo as "CARGO" | "ABONO",
    referencia: tx.referencia,
    cfdiUuidRelacionado: tx.cfdiUuidRelacionado,
    conciliado: tx.conciliado,
    fechaConciliacion: tx.fechaConciliacion,
  }));

  const serializedInvoices = allInvoices.map((inv) => ({
    id: inv.id,
    uuid: inv.uuid,
    serie: inv.serie,
    folio: inv.folio,
    tipo: inv.tipo,
    total: Number(inv.total),
    fecha: inv.fecha,
    metodoPago: inv.metodoPago,
    emisorNombre: inv.emisorNombre,
    emisorRfc: inv.emisorRfc,
    receptorNombre: inv.receptorNombre,
    receptorRfc: inv.receptorRfc,
    estaConciliada: inv.estaConciliada,
  }));

  const invoicesInPeriod = await prisma.invoice.count({
    where: {
      organizationId: activeOrg.id,
      fecha: { gte: startDate, lte: endDate },
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Conciliación Fiscal PUE / PPD & Conciliación Bancaria CSV
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reglas de acumulación por flujo de efectivo SAT 2026 y cruce de extractos bancarios para{" "}
            <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> • Periodo: <strong className="text-emerald-800 font-bold">{nombreMes} {currentYear}</strong>
          </p>
        </div>
        <PeriodSelector currentYear={currentYear} currentMonth={currentMonth} />
      </div>

      {invoicesInPeriod === 0 ? (
        <PeriodoSinXmlEmptyState
          currentYear={currentYear}
          currentMonth={currentMonth}
          nombreMes={nombreMes}
        />
      ) : (
        <ConciliacionView
          initialPpdInvoices={serializedPpd}
          pueCount={pueCount}
          activeRfc={activeOrg.rfc}
          initialBankTransactions={serializedBankTx}
          availableInvoices={serializedInvoices}
        />
      )}
    </div>
  );
}
