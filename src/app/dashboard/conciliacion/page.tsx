import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ConciliacionView } from "./ConciliacionView";

export default async function ConciliacionPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Conciliación Fiscal PUE / PPD & Conciliación Bancaria CSV
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Reglas de acumulación por flujo de efectivo SAT 2026 y cruce de extractos bancarios para{" "}
          <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong>
        </p>
      </div>

      <ConciliacionView
        initialPpdInvoices={serializedPpd}
        pueCount={pueCount}
        activeRfc={activeOrg.rfc}
        initialBankTransactions={serializedBankTx}
        availableInvoices={serializedInvoices}
      />
    </div>
  );
}
