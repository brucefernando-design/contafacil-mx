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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Conciliación Fiscal PUE / PPD & Complementos de Pago
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Reglas de acumulación por flujo de efectivo SAT 2026 para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong>
        </p>
      </div>

      <ConciliacionView
        initialPpdInvoices={ppdInvoices}
        pueCount={pueCount}
        activeRfc={activeOrg.rfc}
      />
    </div>
  );
}
