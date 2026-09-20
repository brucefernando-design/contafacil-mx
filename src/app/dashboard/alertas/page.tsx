import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AlertasView } from "./AlertasView";
import { SatAlertsEngine } from "@/lib/sat/sat-alerts-engine";

export default async function AlertasPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Centro de Alertas Fiscales (Simulación 32-D & Lista de Demo 69-B)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Módulo de simulación y lista de demo preventiva para detección de riesgos informativos para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong> (No sustituye consultas oficiales ante el SAT ni DOF)
        </p>
      </div>

      <AlertasView
        activeOrg={activeOrg}
        alertasAuditoria={auditoriaAlertas}
        alertasGuardadas={alertasGuardadas}
        listaNegra={listaNegraMuestra}
      />
    </div>
  );
}
