import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.employee.findFirst({
      where: {
        id,
        organizationId: sessionData.activeOrg.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Colaborador no encontrado" }, { status: 404 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        nombre: body.nombre ? body.nombre.trim().toUpperCase() : existing.nombre,
        primerApellido: body.primerApellido ? body.primerApellido.trim().toUpperCase() : existing.primerApellido,
        segundoApellido: body.segundoApellido !== undefined ? (body.segundoApellido ? body.segundoApellido.trim().toUpperCase() : null) : existing.segundoApellido,
        rfc: body.rfc ? body.rfc.trim().toUpperCase() : existing.rfc,
        curp: body.curp ? body.curp.trim().toUpperCase() : existing.curp,
        nss: body.nss !== undefined ? body.nss : existing.nss,
        codigoPostal: body.codigoPostal ? body.codigoPostal.trim() : existing.codigoPostal,
        email: body.email !== undefined ? body.email : existing.email,
        telefono: body.telefono !== undefined ? body.telefono : existing.telefono,
        puesto: body.puesto !== undefined ? body.puesto : existing.puesto,
        departamento: body.departamento !== undefined ? body.departamento : existing.departamento,
        tipoContrato: body.tipoContrato || existing.tipoContrato,
        tipoJornada: body.tipoJornada || existing.tipoJornada,
        regimenContratacion: body.regimenContratacion || existing.regimenContratacion,
        periodicidadPago: body.periodicidadPago || existing.periodicidadPago,
        salarioDiario: body.salarioDiario ? parseFloat(body.salarioDiario) : existing.salarioDiario,
        salarioBaseCotApor: body.salarioBaseCotApor ? parseFloat(body.salarioBaseCotApor) : existing.salarioBaseCotApor,
        salarioDiarioInteg: body.salarioDiarioInteg ? parseFloat(body.salarioDiarioInteg) : existing.salarioDiarioInteg,
        bancoClave: body.bancoClave !== undefined ? body.bancoClave : existing.bancoClave,
        cuentaBancaria: body.cuentaBancaria !== undefined ? body.cuentaBancaria : existing.cuentaBancaria,
        status: body.status || existing.status,
      },
    });

    return NextResponse.json({ employee: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al actualizar colaborador" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // Marcamos como INACTIVO para preservar integridad de recibos históricos
    await prisma.employee.updateMany({
      where: {
        id,
        organizationId: sessionData.activeOrg.id,
      },
      data: {
        status: "INACTIVO",
      },
    });

    return NextResponse.json({ success: true, message: "Colaborador dado de baja" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al dar de baja colaborador" },
      { status: 500 }
    );
  }
}
