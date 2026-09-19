import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "@/lib/sat/accounting-engine";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin RFC activo" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { invoiceId, montoPago, fechaPago, formaPago } = body;

    if (!invoiceId || !montoPago || montoPago <= 0) {
      return NextResponse.json({ error: "Monto de pago e invoiceId son requeridos" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: activeOrg.id },
      include: { paymentComplements: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Factura PPD no encontrada" }, { status: 404 });
    }

    if (invoice.metodoPago !== "PPD") {
      return NextResponse.json({ error: "Solo comprobantes con método PPD admiten Complemento de Pago" }, { status: 400 });
    }

    const saldoAnterior = invoice.saldoPendiente;
    const saldoInsoluto = Math.max(0, Number((saldoAnterior - montoPago).toFixed(2)));
    const estaTotalmenteLiquidada = saldoInsoluto <= 0;
    const fechaPagoObj = fechaPago ? new Date(fechaPago) : new Date();

    // 1. Crear el Complemento de Pago
    const complement = await prisma.paymentComplement.create({
      data: {
        invoicePpdId: invoice.id,
        fechaPago: fechaPagoObj,
        formaPago: formaPago || "03",
        monto: montoPago,
        numParcialidad: invoice.paymentComplements.length + 1,
        saldoAnterior,
        saldoInsoluto,
        monedaPago: "MXN",
      },
    });

    // 2. Actualizar el saldo pendiente de la factura original
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        saldoPendiente: saldoInsoluto,
        estaConciliada: estaTotalmenteLiquidada,
        fechaEfectivoCobro: fechaPagoObj,
      },
    });

    // 3. Generar Póliza Contable de Cobro PPD con reclasificación de IVA
    const polizasCount = await prisma.poliza.count({
      where: { organizationId: activeOrg.id },
    });
    const polizaDraft = AccountingEngine.generarPolizaCobroPpd(
      invoice,
      montoPago,
      fechaPagoObj,
      polizasCount + 1
    );

    const poliza = await prisma.poliza.create({
      data: {
        organizationId: activeOrg.id,
        invoiceId: invoice.id,
        tipo: polizaDraft.tipo,
        numero: polizaDraft.numero,
        fecha: polizaDraft.fecha,
        concepto: polizaDraft.concepto,
        uuidRelacionado: polizaDraft.uuidRelacionado,
        totalDebe: polizaDraft.totalDebe,
        totalHaber: polizaDraft.totalHaber,
        estaCuadrada: polizaDraft.estaCuadrada,
        entries: {
          create: polizaDraft.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
      include: { entries: true },
    });

    return NextResponse.json({
      success: true,
      complement,
      updatedInvoice,
      poliza,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
