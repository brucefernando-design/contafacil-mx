import { prisma } from "@/lib/prisma";

export interface SumarBaseMensualParams {
  organizationId: string;
  year: number;
  month: number;
}

export interface SumarBaseMensualResult {
  ingresosCobrados: number;
  deduccionesPagadas: number;
  retencionesIsr: number;
  retencionesIva: number;
  ivaCobrado: number;
  ivaPagado: number;
  conteo: {
    totalFacturas: number;
    facturasEmitidasCount: number;
    facturasRecibidasCount: number;
    emitidasPueCount: number;
    emitidasPpdCount: number;
    emitidasPpdCobradosCount: number;
    gastosPagadosCount: number;
    gastosPpdPendientesCount: number;
  };
}

/**
 * Calcula con rigor fiscal mexicano las bases de flujo de efectivo del mes:
 * - Ingresos cobrados = CFDI EMITIDA PUE del mes (por fecha) + PaymentComplement del mes ligados a EMITIDA PPD (prorrateo por monto/total)
 * - IVA cobrado y retenciones con el mismo criterio (PUE + factor PPD)
 * - Gastos pagados = RECIBIDA PUE del mes + RECIBIDA conciliadas/pagadas (sin sumar PPDs pendientes)
 */
export async function sumarBaseMensual(
  params: SumarBaseMensualParams
): Promise<SumarBaseMensualResult> {
  const { organizationId, year, month } = params;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Facturas emitidas vigentes del mes
  const facturasEmitidas = await prisma.invoice.findMany({
    where: {
      organizationId,
      tipo: "EMITIDA",
      estatus: "VIGENTE",
      fecha: { gte: startDate, lte: endDate },
    },
    include: { paymentComplements: true },
  });

  const emitidasPue = facturasEmitidas.filter((f) => f.metodoPago === "PUE");
  const emitidasPpd = facturasEmitidas.filter((f) => f.metodoPago === "PPD");

  let ingresosCobrados = 0;
  let ivaCobrado = 0;
  let retIsr = 0;
  let retIva = 0;
  let emitidasPpdCobradosCount = 0;

  // A) Sumar PUE emitidas (cobro de contado en el mes)
  for (const f of emitidasPue) {
    ingresosCobrados += Number(f.subtotal);
    ivaCobrado += Number(f.totalIvaTrasladado);
    retIsr += Number(f.totalIsrRetenido);
    retIva += Number(f.totalIvaRetenido);
  }

  // B) Sumar complementos de pago de facturas PPD emitidas en este mismo mes
  for (const f of emitidasPpd) {
    for (const p of f.paymentComplements) {
      if (p.fechaPago >= startDate && p.fechaPago <= endDate) {
        emitidasPpdCobradosCount++;
        const factor = Number(p.monto) / (Number(f.total) || 1);
        ingresosCobrados += Number(f.subtotal) * factor;
        ivaCobrado += Number(f.totalIvaTrasladado) * factor;
        retIsr += Number(f.totalIsrRetenido) * factor;
        retIva += Number(f.totalIvaRetenido) * factor;
      }
    }
  }

  // C) Buscar complementos de pago cobrados en este mes para facturas PPD emitidas en meses previos
  const complementosPpdPrevias = await prisma.paymentComplement.findMany({
    where: {
      fechaPago: { gte: startDate, lte: endDate },
      invoicePpd: {
        organizationId,
        tipo: "EMITIDA",
        estatus: "VIGENTE",
        fecha: { lt: startDate },
      },
    },
    include: { invoicePpd: true },
  });

  for (const p of complementosPpdPrevias) {
    emitidasPpdCobradosCount++;
    const inv = p.invoicePpd;
    const factor = Number(p.monto) / (Number(inv.total) || 1);
    ingresosCobrados += Number(inv.subtotal) * factor;
    ivaCobrado += Number(inv.totalIvaTrasladado) * factor;
    retIsr += Number(inv.totalIsrRetenido) * factor;
    retIva += Number(inv.totalIvaRetenido) * factor;
  }

  // 2. Facturas recibidas (Gastos) del mes
  const facturasRecibidas = await prisma.invoice.findMany({
    where: {
      organizationId,
      tipo: "RECIBIDA",
      estatus: "VIGENTE",
      fecha: { gte: startDate, lte: endDate },
    },
  });

  // Criterio de gastos pagados:
  // - PUE: Pagado efectivamente en el mes
  // - PPD: Únicamente si estaConciliada=true o saldoPendiente <= 0 o fechaEfectivoCobro en el mes
  // - NO se suman PPD no pagadas
  let deduccionesPagadas = 0;
  let ivaPagado = 0;
  let gastosPagadosCount = 0;
  let gastosPpdPendientesCount = 0;

  for (const g of facturasRecibidas) {
    const esPue = g.metodoPago === "PUE";
    const esPpdPagada =
      g.metodoPago === "PPD" &&
      (g.estaConciliada ||
        Number(g.saldoPendiente) <= 0 ||
        (g.fechaEfectivoCobro && g.fechaEfectivoCobro >= startDate && g.fechaEfectivoCobro <= endDate));

    if (esPue || esPpdPagada) {
      gastosPagadosCount++;
      deduccionesPagadas += Number(g.subtotal);
      ivaPagado += Number(g.totalIvaTrasladado);
    } else {
      gastosPpdPendientesCount++;
    }
  }

  const totalFacturas = facturasEmitidas.length + facturasRecibidas.length;

  return {
    ingresosCobrados: Number(ingresosCobrados.toFixed(2)),
    deduccionesPagadas: Number(deduccionesPagadas.toFixed(2)),
    retencionesIsr: Number(retIsr.toFixed(2)),
    retencionesIva: Number(retIva.toFixed(2)),
    ivaCobrado: Number(ivaCobrado.toFixed(2)),
    ivaPagado: Number(ivaPagado.toFixed(2)),
    conteo: {
      totalFacturas,
      facturasEmitidasCount: facturasEmitidas.length,
      facturasRecibidasCount: facturasRecibidas.length,
      emitidasPueCount: emitidasPue.length,
      emitidasPpdCount: emitidasPpd.length,
      emitidasPpdCobradosCount,
      gastosPagadosCount,
      gastosPpdPendientesCount,
    },
  };
}
