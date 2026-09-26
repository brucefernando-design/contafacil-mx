import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { enviarReciboNomina } from "@/lib/email/resend";

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
      return NextResponse.json({ error: "Periodo de nómina no encontrado" }, { status: 404 });
    }

    if (!period.receipts || period.receipts.length === 0) {
      return NextResponse.json(
        { error: "El periodo seleccionado no tiene recibos calculados para dispersar." },
        { status: 400 }
      );
    }

    let enviados = 0;
    let omitidosSinEmail = 0;
    let fallidos = 0;

    const detalle: Array<{
      receiptId: string;
      employeeId: string;
      empleado: string;
      email: string | null;
      status: "ENVIADO" | "SIN_EMAIL" | "ERROR";
      error?: string;
    }> = [];

    for (const receipt of period.receipts) {
      const emp = receipt.employee;
      const empNombre = `${emp.nombre} ${emp.primerApellido} ${emp.segundoApellido || ""}`.trim();
      const empEmail = emp.email?.trim() || null;

      if (!empEmail) {
        omitidosSinEmail++;
        detalle.push({
          receiptId: receipt.id,
          employeeId: emp.id,
          empleado: empNombre,
          email: null,
          status: "SIN_EMAIL",
          error: "Colaborador sin correo electrónico registrado.",
        });
        continue;
      }

      try {
        const result = await enviarReciboNomina({
          nombreEmpleado: empNombre,
          email: empEmail,
          rfcEmpleado: emp.rfc,
          descripcionPeriodo: period.descripcion,
          fechaPago: period.fechaPago,
          totalPercepciones: Number(receipt.totalPercepciones),
          totalDeducciones: Number(receipt.totalDeducciones),
          netoPagar: Number(receipt.netoPagar),
          uuid: receipt.uuid,
          xmlSat: receipt.xmlSat,
        });

        if (result.sent) {
          enviados++;
          detalle.push({
            receiptId: receipt.id,
            employeeId: emp.id,
            empleado: empNombre,
            email: empEmail,
            status: "ENVIADO",
          });
        } else {
          fallidos++;
          detalle.push({
            receiptId: receipt.id,
            employeeId: emp.id,
            empleado: empNombre,
            email: empEmail,
            status: "ERROR",
            error: result.reason || "Fallo en envío de correo",
          });
        }
      } catch (err: any) {
        fallidos++;
        detalle.push({
          receiptId: receipt.id,
          employeeId: emp.id,
          empleado: empNombre,
          email: empEmail,
          status: "ERROR",
          error: err?.message || "Excepción inesperada al enviar correo",
        });
      }
    }

    return NextResponse.json({
      success: true,
      periodo: period.descripcion,
      resumen: {
        total: period.receipts.length,
        enviados,
        omitidosSinEmail,
        fallidos,
      },
      detalle,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al procesar la dispersión de recibos" },
      { status: 500 }
    );
  }
}
