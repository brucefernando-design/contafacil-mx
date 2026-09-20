import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPacProvider, MotivoCancelacionSat } from "@/lib/sat/pac";
import { AccountingEngine } from "@/lib/sat/accounting-engine";
import { registrarAuditoria } from "@/lib/sat/audit";

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin RFC activo" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const body = await req.json();
    const { invoiceId, motivo = "02", folioSustitucion } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId es obligatorio" }, { status: 400 });
    }

    // 1. Buscar la factura en la base de datos
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: String(invoiceId),
        organizationId: activeOrg.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada para la organización activa" }, { status: 404 });
    }

    if (invoice.estatus === "CANCELADO") {
      return NextResponse.json({ error: "Esta factura ya se encuentra cancelada." }, { status: 400 });
    }

    // 2. Procesar la cancelación ante el proveedor PAC (PAC_MODE)
    const pac = getPacProvider();
    const cancelacionRes = await pac.cancelar({
      uuid: invoice.uuid,
      rfcEmisor: invoice.emisorRfc,
      rfcReceptor: invoice.receptorRfc,
      total: Number(invoice.total),
      motivo: (motivo as MotivoCancelacionSat) || "02",
      folioSustitucion: folioSustitucion?.trim() || undefined,
    });

    const fechaCancelacion = new Date();

    // 3. Actualizar estatus de la factura a CANCELADO
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        estatus: "CANCELADO",
      },
    });

    // 4. Generar y registrar Póliza de Reversión Contable en Anexo 24
    const polizasCount = await prisma.poliza.count({
      where: { organizationId: activeOrg.id },
    });

    const reversionDraft = AccountingEngine.generarPolizaReversion(
      invoice,
      polizasCount + 1,
      fechaCancelacion,
      motivo
    );

    const polizaReversion = await prisma.poliza.create({
      data: {
        organizationId: activeOrg.id,
        invoiceId: invoice.id,
        tipo: reversionDraft.tipo,
        numero: reversionDraft.numero,
        fecha: reversionDraft.fecha,
        concepto: reversionDraft.concepto,
        uuidRelacionado: reversionDraft.uuidRelacionado,
        totalDebe: reversionDraft.totalDebe,
        totalHaber: reversionDraft.totalHaber,
        estaCuadrada: reversionDraft.estaCuadrada,
        entries: {
          create: reversionDraft.entries.map((e) => ({
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

    // 5. Registrar en bitácora de auditoría
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    await registrarAuditoria({
      action: "CANCELAR",
      organizationId: activeOrg.id,
      userId: sessionData.user.id,
      userEmail: sessionData.user.email,
      ip,
      detalles: `CFDI cancelado. UUID=${invoice.uuid}, Motivo=${motivo}${folioSustitucion ? `, Sustitucion=${folioSustitucion}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      message: "Factura cancelada exitosamente y póliza de reversión generada.",
      invoice: updatedInvoice,
      polizaReversion,
      cancelacion: cancelacionRes,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al cancelar la factura." },
      { status: 500 }
    );
  }
}
