import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin organización activa" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { bankTransactionId, invoiceUuid } = body;

    if (!bankTransactionId || !invoiceUuid) {
      return NextResponse.json({ error: "Faltan parámetros bankTransactionId o invoiceUuid." }, { status: 400 });
    }

    const tx = await prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, organizationId: activeOrg.id },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transacción bancaria no encontrada." }, { status: 404 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { uuid: invoiceUuid, organizationId: activeOrg.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "CFDI no encontrado en esta organización." }, { status: 404 });
    }

    // Vincular y marcar ambos como conciliados
    const updatedTx = await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: {
        conciliado: true,
        cfdiUuidRelacionado: invoice.uuid,
        fechaConciliacion: new Date(),
      },
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        estaConciliada: true,
        fechaEfectivoCobro: tx.fecha,
        saldoPendiente: 0.0,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Movimiento bancario (${tx.concepto}) conciliado exitosamente con CFDI ${invoice.uuid}.`,
      transaction: updatedTx,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const { searchParams } = new URL(req.url);
    const bankTransactionId = searchParams.get("id");

    if (!bankTransactionId) {
      return NextResponse.json({ error: "ID no provisto" }, { status: 400 });
    }

    const tx = await prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, organizationId: activeOrg.id },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    const updated = await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: {
        conciliado: false,
        cfdiUuidRelacionado: null,
        fechaConciliacion: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Conciliación revertida.",
      transaction: updated,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
