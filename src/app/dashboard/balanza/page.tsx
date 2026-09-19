import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BalanzaView } from "./BalanzaView";

export default async function BalanzaPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  // Consultar todas las cuentas de catálogo y entradas de pólizas de la organización
  const cuentas = await prisma.satCatalogAccount.findMany({
    where: { organizationId: activeOrg.id },
    orderBy: { codigoSat: "asc" },
  });

  // Calcular movimientos dinámicos a partir de las pólizas registradas
  const entries = await prisma.polizaEntry.findMany({
    where: {
      poliza: { organizationId: activeOrg.id },
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
    movimientosPorCuenta[entry.cuentaCodigo].cargos += entry.debe;
    movimientosPorCuenta[entry.cuentaCodigo].abonos += entry.haber;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Balanza de Comprobación SAT (Anexo 24)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Contabilidad Electrónica obligatoria SAT con código agrupador, saldos iniciales, movimientos y comprobación de sumas iguales para <strong className="font-mono text-emerald-800">{activeOrg.rfc}</strong>
        </p>
      </div>

      <BalanzaView
        activeRfc={activeOrg.rfc}
        activeOrgName={activeOrg.razonSocial}
        cuentas={cuentas}
        movimientos={movimientosPorCuenta}
      />
    </div>
  );
}
