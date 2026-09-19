import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calcularImpuestosSat2026, calcularFechaVencimientoSat } from "@/lib/sat/tax-engine";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin RFC activo" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { year, month, autoCompute, manualOverrides } = body;

    const targetYear = Number(year) || 2026;
    const targetMonth = Number(month) || 9;

    let calcData;

    if (autoCompute) {
      // 1. Calcular automáticamente sumando las facturas cobradas y gastos pagados en el mes
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      // Ingresos cobrados: PUE emitidas en el mes + Pagos PPD cobrados en el mes
      const facturasPueEmitidas = await prisma.invoice.findMany({
        where: {
          organizationId: activeOrg.id,
          tipo: "EMITIDA",
          metodoPago: "PUE",
          estatus: "VIGENTE",
          fecha: { gte: startDate, lte: endDate },
        },
      });

      const pagosPpdCobrados = await prisma.paymentComplement.findMany({
        where: {
          fechaPago: { gte: startDate, lte: endDate },
          invoicePpd: { organizationId: activeOrg.id, tipo: "EMITIDA" },
        },
        include: { invoicePpd: true },
      });

      let ingresosCobrados = facturasPueEmitidas.reduce((sum, f) => sum + f.subtotal, 0);
      let ivaCobrado = facturasPueEmitidas.reduce((sum, f) => sum + f.totalIvaTrasladado, 0);
      let retIsr = facturasPueEmitidas.reduce((sum, f) => sum + f.totalIsrRetenido, 0);
      let retIva = facturasPueEmitidas.reduce((sum, f) => sum + f.totalIvaRetenido, 0);

      for (const p of pagosPpdCobrados) {
        // En PPD, el pago proporcional
        const factor = p.monto / (p.invoicePpd.total || 1);
        ingresosCobrados += p.invoicePpd.subtotal * factor;
        ivaCobrado += p.invoicePpd.totalIvaTrasladado * factor;
        retIsr += p.invoicePpd.totalIsrRetenido * factor;
        retIva += p.invoicePpd.totalIvaRetenido * factor;
      }

      // Gastos deducibles pagados en el mes
      const gastosPagados = await prisma.invoice.findMany({
        where: {
          organizationId: activeOrg.id,
          tipo: "RECIBIDA",
          estatus: "VIGENTE",
          fecha: { gte: startDate, lte: endDate },
        },
      });

      const deduccionesPagadas = gastosPagados.reduce((sum, g) => sum + g.subtotal, 0);
      const ivaPagado = gastosPagados.reduce((sum, g) => sum + g.totalIvaTrasladado, 0);

      calcData = calcularImpuestosSat2026({
        regimenFiscal: activeOrg.regimenFiscal,
        tipoPersona: activeOrg.tipoPersona,
        ingresosCobrados: Number(ingresosCobrados.toFixed(2)),
        deduccionesPagadas: Number(deduccionesPagadas.toFixed(2)),
        retencionesIsr: Number(retIsr.toFixed(2)),
        retencionesIva: Number(retIva.toFixed(2)),
        ivaCobrado: Number(ivaCobrado.toFixed(2)),
        ivaPagado: Number(ivaPagado.toFixed(2)),
        coeficienteUtilidad: activeOrg.coeficienteUtilidad || 0.0825,
        usaDeduccionCiega: activeOrg.deduccionCiega,
      });
    } else {
      calcData = manualOverrides;
    }

    const vencimiento = calcularFechaVencimientoSat(activeOrg.rfc, targetYear, targetMonth);

    // Upsert declaración mensual
    const declaration = await prisma.taxDeclarationMonth.upsert({
      where: {
        organizationId_year_month: {
          organizationId: activeOrg.id,
          year: targetYear,
          month: targetMonth,
        },
      },
      update: {
        regimen: activeOrg.regimenFiscal,
        ingresosCobrados: calcData.ingresosBase,
        deduccionesPagadas: calcData.deduccionesAplicadas,
        baseGravable: calcData.baseGravable,
        tasaIsr: calcData.tasaOcuotaIsr,
        isrDeterminado: calcData.isrDeterminado,
        retencionesIsr: calcData.retencionesIsr,
        isrAPagar: calcData.isrAPagar,
        ivaCobrado: calcData.ivaTrasladado,
        ivaPagado: calcData.ivaAcreditable,
        retencionesIva: calcData.retencionesIva,
        ivaAPagar: calcData.ivaAPagar,
        estatus: "CALCULADO",
        fechaLimite: vencimiento.fechaLimite,
      },
      create: {
        organizationId: activeOrg.id,
        year: targetYear,
        month: targetMonth,
        regimen: activeOrg.regimenFiscal,
        ingresosCobrados: calcData.ingresosBase,
        deduccionesPagadas: calcData.deduccionesAplicadas,
        baseGravable: calcData.baseGravable,
        tasaIsr: calcData.tasaOcuotaIsr,
        isrDeterminado: calcData.isrDeterminado,
        retencionesIsr: calcData.retencionesIsr,
        isrAPagar: calcData.isrAPagar,
        ivaCobrado: calcData.ivaTrasladado,
        ivaPagado: calcData.ivaAcreditable,
        retencionesIva: calcData.retencionesIva,
        ivaAPagar: calcData.ivaAPagar,
        estatus: "CALCULADO",
        fechaLimite: vencimiento.fechaLimite,
      },
    });

    return NextResponse.json({
      success: true,
      calculation: calcData,
      declaration,
      vencimiento,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
