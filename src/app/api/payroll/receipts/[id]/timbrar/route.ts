import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPacProvider } from "@/lib/sat/pac";

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
    const { activeOrg } = sessionData;

    // Buscar el recibo y validar que pertenezca a la organización
    const receipt = await prisma.payrollReceipt.findFirst({
      where: {
        id,
        organizationId: activeOrg.id,
      },
      include: {
        employee: true,
        payrollPeriod: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Recibo de nómina no encontrado" }, { status: 404 });
    }

    if (receipt.uuid && receipt.status === "TIMBRADA") {
      return NextResponse.json(
        { error: "Este recibo ya se encuentra timbrado ante el SAT", uuid: receipt.uuid },
        { status: 400 }
      );
    }

    // Instanciar proveedor PAC Facturama
    const pac = getPacProvider();

    // Folio y serie para nómina
    const folioStr = receipt.folio || String(Date.now()).slice(-6);
    const serieStr = receipt.serie || "NOM";

    // Mapeo a Timbrado CFDI 4.0 con TipoDeComprobante "N" (Nómina)
    const timbradoInput = {
      tipoDeComprobante: "N" as const,
      emisor: {
        rfc: activeOrg.rfc,
        nombre: activeOrg.razonSocial,
        regimenFiscal: activeOrg.regimenFiscal,
      },
      receptor: {
        rfc: receipt.employee.rfc,
        nombre: `${receipt.employee.nombre} ${receipt.employee.primerApellido} ${receipt.employee.segundoApellido || ""}`.trim(),
        domicilioFiscalReceptor: receipt.employee.codigoPostal,
        regimenFiscalReceptor: "605", // Sueldos y Salarios
        usoCfdi: "CN01", // Nómina
      },
      conceptos: [
        {
          claveProdServ: "84111505", // Servicios de nómina SAT
          claveUnidad: "ACT",
          unidad: "Actividad",
          descripcion: `Pago de Nómina - ${receipt.payrollPeriod.descripcion}`,
          cantidad: 1,
          valorUnitario: Number(receipt.totalPercepciones),
          descuento: Number(receipt.totalDeducciones),
          objetoImp: "01", // No objeto de impuesto (IVA no aplica en nómina)
        },
      ],
      formaPago: "99", // Por definir (según catálogo nómina SAT)
      metodoPago: "PUE" as const,
      lugarExpedicion: activeOrg.codigoPostal,
      serie: serieStr,
      folio: folioStr,
      moneda: "MXN",
    };

    const pacResult = await pac.timbrar(timbradoInput);

    if (!pacResult.success) {
      // Guardar error en el recibo
      await prisma.payrollReceipt.update({
        where: { id: receipt.id },
        data: {
          errorTimbrado: pacResult.mensaje || "Error al timbrar nómina",
        },
      });

      return NextResponse.json(
        { error: pacResult.mensaje || "Error devuelto por el PAC Facturama" },
        { status: 400 }
      );
    }

    // Actualizar recibo con los datos del timbrado SAT
    const updatedReceipt = await prisma.payrollReceipt.update({
      where: { id: receipt.id },
      data: {
        status: "TIMBRADA",
        uuid: pacResult.uuid,
        serie: serieStr,
        folio: folioStr,
        fechaTimbrado: pacResult.fechaTimbrado ? new Date(pacResult.fechaTimbrado) : new Date(),
        selloSat: pacResult.selloSAT,
        selloCfd: pacResult.selloCFD,
        noCertificadoSat: pacResult.noCertificadoSAT,
        cadenaOriginalSat: pacResult.cadenaOriginalSAT,
        xmlSat: pacResult.xmlTimbrado,
        errorTimbrado: null,
      },
    });

    // Si todos los recibos del periodo están timbrados, marcar periodo como TIMBRADA
    const totalRecibos = await prisma.payrollReceipt.count({
      where: { payrollPeriodId: receipt.payrollPeriodId },
    });
    const timbradosCount = await prisma.payrollReceipt.count({
      where: { payrollPeriodId: receipt.payrollPeriodId, status: "TIMBRADA" },
    });

    if (totalRecibos > 0 && totalRecibos === timbradosCount) {
      await prisma.payrollPeriod.update({
        where: { id: receipt.payrollPeriodId },
        data: { status: "TIMBRADA" },
      });
    }

    return NextResponse.json({
      success: true,
      uuid: pacResult.uuid,
      receipt: updatedReceipt,
      message: "Recibo de nómina timbrado exitosamente ante el SAT vía Facturama.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al procesar el timbrado de nómina" },
      { status: 500 }
    );
  }
}
