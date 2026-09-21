import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BovedaView } from "./BovedaView";
import { ShieldCheck } from "lucide-react";

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

      {/* Security & Sync Guarantee Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-emerald-950 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-emerald-900">Bóveda Fiscal Certificada CFDI 4.0</p>
            <p className="text-[11px] text-emerald-700 font-normal">
              Sincronización Automática con el SAT vía e.firma institucional y Detección en tiempo real de EFOS (Art. 69-B CFF).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            🔒 AES-256 Cifrado e.firma
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
            ⚡ SOAP SAT Oficial
          </span>
        </div>
      </div>

      <BovedaView initialInvoices={serializedInvoices} activeRfc={activeOrg.rfc} />
    </div>
  );
}
