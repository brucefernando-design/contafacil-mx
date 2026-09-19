import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PolizasView } from "./PolizasView";

export default async function PolizasPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  const polizas = await prisma.poliza.findMany({
    where: { organizationId: activeOrg.id },
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pólizas Contables Electrónicas (SAT Anexo 24)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro contable con partida doble, códigos agrupadores SAT y vinculación de CFDI para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong>
          </p>
        </div>
      </div>

      <PolizasView initialPolizas={serializedPolizas} activeOrgId={activeOrg.id} />
    </div>
  );
}
