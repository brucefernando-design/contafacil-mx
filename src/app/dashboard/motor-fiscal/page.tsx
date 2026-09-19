import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MotorFiscalView } from "./MotorFiscalView";

export default async function MotorFiscalPage() {
  const sessionData = await getCurrentUserAndOrg();
  if (!sessionData?.activeOrg) return null;

  const { activeOrg } = sessionData;

  // Obtener facturas y pagos del mes de Septiembre 2026 para prellenar datos reales
  const startDate = new Date(2026, 8, 1);
  const endDate = new Date(2026, 8, 30, 23, 59, 59);

  const facturasEmitidas = await prisma.invoice.findMany({
    where: {
      organizationId: activeOrg.id,
      tipo: "EMITIDA",
      estatus: "VIGENTE",
      fecha: { gte: startDate, lte: endDate },
    },
    include: { paymentComplements: true },
  });

  const facturasRecibidas = await prisma.invoice.findMany({
    where: {
      organizationId: activeOrg.id,
      tipo: "RECIBIDA",
      estatus: "VIGENTE",
      fecha: { gte: startDate, lte: endDate },
    },
  });

  // Calcular cobrado real PUE + PPD pagos
  let ingresosCobrados = 0;
  let ivaCobrado = 0;
  let retIsr = 0;
  let retIva = 0;

  for (const f of facturasEmitidas) {
    if (f.metodoPago === "PUE") {
      ingresosCobrados += f.subtotal;
      ivaCobrado += f.totalIvaTrasladado;
      retIsr += f.totalIsrRetenido;
      retIva += f.totalIvaRetenido;
    } else {
      for (const p of f.paymentComplements) {
        const factor = p.monto / (f.total || 1);
        ingresosCobrados += f.subtotal * factor;
        ivaCobrado += f.totalIvaTrasladado * factor;
        retIsr += f.totalIsrRetenido * factor;
        retIva += f.totalIvaRetenido * factor;
      }
    }
  }

  const deduccionesPagadas = facturasRecibidas.reduce((sum, g) => sum + g.subtotal, 0);
  const ivaPagado = facturasRecibidas.reduce((sum, g) => sum + g.totalIvaTrasladado, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Motor Fiscal SAT México 2026
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulador y liquidador oficial de impuestos provisionales para RESICO PF, Actividad Empresarial, Arrendamiento y PM General
          </p>
        </div>
      </div>

      <MotorFiscalView
        activeOrg={activeOrg}
        initialData={{
          ingresosCobrados: Number(ingresosCobrados.toFixed(2)),
          deduccionesPagadas: Number(deduccionesPagadas.toFixed(2)),
          retencionesIsr: Number(retIsr.toFixed(2)),
          retencionesIva: Number(retIva.toFixed(2)),
          ivaCobrado: Number(ivaCobrado.toFixed(2)),
          ivaPagado: Number(ivaPagado.toFixed(2)),
        }}
      />
    </div>
  );
}
