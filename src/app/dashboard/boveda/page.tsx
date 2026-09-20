import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BovedaView } from "./BovedaView";

export default async function BovedaPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: activeOrg.id },
    include: {
      items: true,
      paymentComplements: true,
    },
    orderBy: { fecha: "desc" },
  });

  const serializedInvoices = invoices.map((inv) => ({
    id: inv.id,
    tipo: inv.tipo,
    serie: inv.serie,
    folio: inv.folio,
    uuid: inv.uuid,
    fecha: inv.fecha,
    metodoPago: inv.metodoPago,
    formaPago: inv.formaPago,
    subtotal: Number(inv.subtotal),
    total: Number(inv.total),
    totalIvaTrasladado: Number(inv.totalIvaTrasladado),
    totalIsrRetenido: Number(inv.totalIsrRetenido),
    totalIvaRetenido: Number(inv.totalIvaRetenido),
    emisorRfc: inv.emisorRfc,
    emisorNombre: inv.emisorNombre,
    receptorRfc: inv.receptorRfc,
    receptorNombre: inv.receptorNombre,
    estatus: inv.estatus,
    rawXml: inv.rawXml,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Bóveda XML CFDI 4.0
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resguardo, carga, parseo inteligente y visor de comprobantes fiscales de <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong>
          </p>
        </div>
      </div>

      {/* Watermark Banner */}
      <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/40 rounded-2xl p-3 flex items-center justify-center gap-2.5 text-xs md:text-sm font-bold text-amber-900 shadow-xs">
        <span className="tracking-wide uppercase text-center">
          ⚠️ Timbrado de demostración. Este CFDI NO fue enviado al SAT.
        </span>
      </div>

      <BovedaView initialInvoices={serializedInvoices} activeRfc={activeOrg.rfc} />
    </div>
  );
}
