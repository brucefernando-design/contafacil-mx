import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: sessionData.activeOrg.id,
      },
      orderBy: {
        numeroEmpleado: "asc",
      },
    });

    return NextResponse.json({ employees });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al obtener colaboradores" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      numeroEmpleado,
      nombre,
      primerApellido,
      segundoApellido,
      rfc,
      curp,
      nss,
      codigoPostal,
      email,
      telefono,
      puesto,
      departamento,
      tipoContrato,
      tipoJornada,
      regimenContratacion,
      periodicidadPago,
      salarioDiario,
      salarioBaseCotApor,
      salarioDiarioInteg,
      bancoClave,
      cuentaBancaria,
    } = body;

    if (!nombre || !primerApellido || !rfc || !curp || !codigoPostal || !salarioDiario) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: Nombre, Primer Apellido, RFC, CURP, CP o Salario Diario" },
        { status: 400 }
      );
    }

    // Limpieza de datos SAT
    const cleanRfc = rfc.trim().toUpperCase();
    const cleanCurp = curp.trim().toUpperCase();
    const cleanCp = codigoPostal.trim();
    const numEmp = numeroEmpleado?.trim() || `EMP-${Date.now().toString().slice(-4)}`;

    const sd = parseFloat(salarioDiario);
    const sbc = salarioBaseCotApor ? parseFloat(salarioBaseCotApor) : sd * 1.0493; // Factor de integración básico de ley
    const sdi = salarioDiarioInteg ? parseFloat(salarioDiarioInteg) : sbc;

    const employee = await prisma.employee.create({
      data: {
        organizationId: sessionData.activeOrg.id,
        numeroEmpleado: numEmp,
        nombre: nombre.trim().toUpperCase(),
        primerApellido: primerApellido.trim().toUpperCase(),
        segundoApellido: segundoApellido ? segundoApellido.trim().toUpperCase() : null,
        rfc: cleanRfc,
        curp: cleanCurp,
        nss: nss?.trim() || null,
        codigoPostal: cleanCp,
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        puesto: puesto?.trim() || "Colaborador",
        departamento: departamento?.trim() || "General",
        tipoContrato: tipoContrato || "TIEMPO_INDETERMINADO",
        tipoJornada: tipoJornada || "DIURNA",
        regimenContratacion: regimenContratacion || "SUELDOS_SALARIOS",
        periodicidadPago: periodicidadPago || "QUINCENAL",
        salarioDiario: sd,
        salarioBaseCotApor: sbc,
        salarioDiarioInteg: sdi,
        bancoClave: bancoClave || null,
        cuentaBancaria: cuentaBancaria?.trim() || null,
      },
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un colaborador con este Número de Empleado o RFC en tu empresa." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Error al registrar colaborador" },
      { status: 500 }
    );
  }
}
