import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = sessionData.activeOrg.id;

    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        receipts: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 });
    }

    if (period.polizaGenerada && period.polizaId) {
      return NextResponse.json(
        { message: "La póliza de este periodo ya había sido generada", polizaId: period.polizaId },
        { status: 200 }
      );
    }

    // Obtener siguiente número consecutivo de póliza
    const lastPoliza = await prisma.poliza.findFirst({
      where: { organizationId: orgId },
      orderBy: { numero: "desc" },
    });
    const nextNumero = (lastPoliza?.numero || 0) + 1;

    // Asientos Contables Oficiales SAT para Nómina:
    // CARGOS (Debe):
    // 601.01 Sueldos y Salarios (Gasto Operación) -> Total Percepciones
    //
    // ABONOS (Haber):
    // 216.01 Impuestos Retenidos de ISR por Sueldos (Pasivo) -> Retención ISR
    // 210.01 Cuotas Obreras IMSS por Pagar (Pasivo) -> IMSS Obrero
    // 102.01 Bancos / Efectivo (Activo) -> Total Neto a Pagar a Empleados

    const totalSueldos = new Decimal(period.totalPercepciones.toString());
    const totalIsr = new Decimal(period.totalRetencionIsr.toString());
    const totalImss = new Decimal(period.totalImssObrero.toString());
    const totalNeto = new Decimal(period.totalNeto.toString());

    const debe = totalSueldos;
    const haber = totalIsr.plus(totalImss).plus(totalNeto);

    // Ajuste de centavos si hubiese discrepancia en el redondeo
    const estaCuadrada = debe.equals(haber);

    const poliza = await prisma.$transaction(async (tx) => {
      const createdPoliza = await tx.poliza.create({
        data: {
          organizationId: orgId,
          tipo: "EGRESO",
          numero: nextNumero,
          fecha: period.fechaPago,
          concepto: `Póliza de Nómina - ${period.descripcion}`,
          totalDebe: debe.toNumber(),
          totalHaber: haber.toNumber(),
          estaCuadrada,
          entries: {
            create: [
              {
                cuentaCodigo: "601.01",
                cuentaNombre: "Sueldos y Salarios",
                concepto: `Percepciones devengadas ${period.descripcion}`,
                debe: debe.toNumber(),
                haber: 0,
              },
              {
                cuentaCodigo: "216.01",
                cuentaNombre: "Impuestos Retenidos - ISR Sueldos Art. 96",
                concepto: `Retención de ISR Nómina`,
                debe: 0,
                haber: totalIsr.toNumber(),
              },
              {
                cuentaCodigo: "210.01",
                cuentaNombre: "Cuotas IMSS e Infonavit por Pagar (Obreras)",
                concepto: `Retención IMSS Obrero Nómina`,
                debe: 0,
                haber: totalImss.toNumber(),
              },
              {
                cuentaCodigo: "102.01",
                cuentaNombre: "Bancos Nacionales (Dispersión Nómina)",
                concepto: `Pago neto a colaboradores ${period.descripcion}`,
                debe: 0,
                haber: totalNeto.toNumber(),
              },
            ],
          },
        },
      });

      await tx.payrollPeriod.update({
        where: { id },
        data: {
          polizaGenerada: true,
          polizaId: createdPoliza.id,
        },
      });

      return createdPoliza;
    });

    return NextResponse.json({
      success: true,
      polizaId: poliza.id,
      numero: poliza.numero,
      message: "Póliza de nómina generada y reflejada en balanza contable con éxito.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al generar póliza contable de nómina" },
      { status: 500 }
    );
  }
}
