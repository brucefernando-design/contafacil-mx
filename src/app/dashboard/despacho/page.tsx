import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DespachoView } from "./DespachoView";

export default async function DespachoPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.user) return null;

  const { user, activeOrg, allOrgs } = sessionData;

  // Consultar información detallada de cada organización asignada al despacho
  const orgIds = allOrgs.map((o) => o.id);

  // Fecha del mes actual dinámico
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  // Obtener información y métricas de cada cliente
  const orgDetails = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    include: {
      invoices: {
        where: {
          fecha: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      taxDeclarations: {
        where: { year: currentYear, month: currentMonth },
      },
      fiscalAlerts: {
        where: { leida: false },
      },
    },
    orderBy: { razonSocial: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Módulo para Contadores Públicos
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Modo Despacho Contable (Multi-Cliente SAT 2026)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centro de control unificado para supervisión tributaria, declaraciones mensuales y cambio rápido de RFC
          </p>
        </div>
      </div>

      <DespachoView
        activeOrgId={activeOrg?.id || ""}
        clients={orgDetails.map((org) => {
          const emitidas = org.invoices.filter((i) => i.tipo === "EMITIDA");
          const totalFacturadoMes = emitidas.reduce((sum, i) => sum + Number(i.total), 0);
          const declaracion = org.taxDeclarations[0];

          return {
            id: org.id,
            rfc: org.rfc,
            razonSocial: org.razonSocial,
            tipoPersona: org.tipoPersona,
            regimenFiscal: org.regimenFiscal,
            codigoPostal: org.codigoPostal,
            opinionCumplimiento: org.opinionCumplimiento,
            efosStatus: org.efosStatus,
            totalFacturadoMes,
            declaracionEstatus: declaracion?.estatus || "PENDIENTE",
            declaracionIsr: declaracion?.isrAPagar ? Number(declaracion.isrAPagar) : 0,
            declaracionIva: declaracion?.ivaAPagar ? Number(declaracion.ivaAPagar) : 0,
            alertasCount: org.fiscalAlerts.length,
          };
        })}
      />
    </div>
  );
}
