import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calcularImpuestosSat2026, calcularFechaVencimientoSat } from "@/lib/sat/tax-engine";
import { sumarBaseMensual } from "@/lib/sat/papel-trabajo";

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
      // 1. Calcular automáticamente con rigor fiscal mensual (PUE + PPD cobrados vs gastos pagados)
      const baseMensual = await sumarBaseMensual({
        organizationId: activeOrg.id,
        year: targetYear,
        month: targetMonth,
      });

      calcData = calcularImpuestosSat2026({
        regimenFiscal: activeOrg.regimenFiscal,
        tipoPersona: activeOrg.tipoPersona,
        ingresosCobrados: baseMensual.ingresosCobrados,
        deduccionesPagadas: baseMensual.deduccionesPagadas,
        retencionesIsr: baseMensual.retencionesIsr,
        retencionesIva: baseMensual.retencionesIva,
        ivaCobrado: baseMensual.ivaCobrado,
        ivaPagado: baseMensual.ivaPagado,
        coeficienteUtilidad: activeOrg.coeficienteUtilidad ? Number(activeOrg.coeficienteUtilidad) : 0.0825,
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
