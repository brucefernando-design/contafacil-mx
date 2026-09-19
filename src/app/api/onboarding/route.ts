import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATALOGO_SAT_BASE } from "@/lib/sat/accounting-engine";
import { PacMockAdapter } from "@/lib/sat/pac-mock";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tipoPersona,
      rfc,
      razonSocial,
      regimenFiscal,
      codigoPostal,
      calle,
      colonia,
      municipio,
      estado,
      coeficienteUtilidad,
      deduccionCiega,
      serieDefault,
    } = body;

    const cleanRfc = String(rfc || "").trim().toUpperCase();

    if (!cleanRfc || !razonSocial || !codigoPostal || !regimenFiscal) {
      return NextResponse.json({ error: "Todos los campos obligatorios deben completarse" }, { status: 400 });
    }

    if (!PacMockAdapter.validarRfc(cleanRfc)) {
      return NextResponse.json({ error: `El RFC '${cleanRfc}' no cumple con la estructura fiscal del SAT.` }, { status: 400 });
    }

    // Verificar si el RFC ya existe
    const existingOrg = await prisma.organization.findUnique({
      where: { rfc: cleanRfc },
    });

    if (existingOrg) {
      return NextResponse.json({ error: `El RFC '${cleanRfc}' ya está registrado en el sistema.` }, { status: 409 });
    }

    // 1. Crear Organización
    const newOrg = await prisma.organization.create({
      data: {
        rfc: cleanRfc,
        razonSocial: razonSocial.trim(),
        tipoPersona: tipoPersona === "PM" ? "PM" : "PF",
        regimenFiscal,
        codigoPostal: String(codigoPostal).padStart(5, "0"),
        calle: calle?.trim() || null,
        colonia: colonia?.trim() || null,
        municipio: municipio?.trim() || null,
        estado: estado?.trim() || null,
        coeficienteUtilidad: coeficienteUtilidad ? Number(coeficienteUtilidad) : 0.0825,
        deduccionCiega: deduccionCiega !== false,
        csdStatus: "ACTIVO",
        csdNoCertificado: "30001000000500003416",
        csdVencimiento: new Date("2028-12-31"),
        serieDefault: serieDefault || "F",
        folioActual: 1,
        opinionCumplimiento: "POSITIVA",
        efosStatus: "LIMPIO",
      },
    });

    // 2. Asociar al usuario actual
    await prisma.organizationMember.create({
      data: {
        userId: session.user.id,
        organizationId: newOrg.id,
        role: "OWNER",
      },
    });

    // 3. Establecer como activa para el usuario
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeCompanyId: newOrg.id },
    });

    // 4. Inicializar Catálogo de Cuentas SAT Anexo 24
    for (const cta of CATALOGO_SAT_BASE) {
      await prisma.satCatalogAccount.create({
        data: {
          organizationId: newOrg.id,
          codigoSat: cta.codigoSat,
          nombre: cta.nombre,
          tipo: cta.tipo,
          nivel: cta.nivel,
          saldoInicial: 0.0,
          cargos: 0.0,
          abonos: 0.0,
          saldoFinal: 0.0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      organization: newOrg,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
