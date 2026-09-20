import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATALOGO_SAT_BASE } from "@/lib/sat/accounting-engine";
import { guardarCertificadoEnBoveda } from "@/lib/sat/crypto-vault";
import { validarRfcEstructura, validarRegimenFiscal } from "@/lib/validation/auth";
import { puedeCrearRfc } from "@/lib/sat/subscription-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await auth();
    const targetUserId = session?.user?.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "No autenticado. Debes iniciar sesión antes de configurar un RFC." },
        { status: 401 }
      );
    }

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

    const rfcCheck = validarRfcEstructura(cleanRfc, tipoPersona === "PM" ? "PM" : "PF");
    if (!rfcCheck.valido) {
      return NextResponse.json({ error: rfcCheck.error }, { status: 400 });
    }

    const regCheck = validarRegimenFiscal(regimenFiscal, tipoPersona === "PM" ? "PM" : "PF");
    if (!regCheck.valido) {
      return NextResponse.json({ error: regCheck.error }, { status: 400 });
    }

    // 0. Validar límite de RFCs del plan del usuario (FREE: 1 RFC, PRO: 3 RFCs, DESPACHO: 25 RFCs)
    const userWithSub = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        subscription: true,
        memberships: { where: { role: "OWNER" } },
      },
    });

    const userPlan = userWithSub?.subscription?.plan || "FREE";
    const rfcsActuales = userWithSub?.memberships.length || 0;

    const rfcPermitidoCheck = puedeCrearRfc(userPlan, rfcsActuales);
    if (!rfcPermitidoCheck.permitido) {
      return NextResponse.json(
        {
          error: rfcPermitidoCheck.error,
          code: "RFC_LIMIT_REACHED",
          redirectUrl: "/precios",
        },
        { status: 403 }
      );
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
        userId: targetUserId,
        organizationId: newOrg.id,
        role: "OWNER",
      },
    });

    // 3. Establecer como activa para el usuario
    await prisma.user.update({
      where: { id: targetUserId },
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

    // 5. Cifrar y guardar CSD en Bóveda Criptográfica AES-256-GCM
    const { cerBase64, keyBase64, csdPassword, efirmaCerBase64, efirmaKeyBase64, efirmaPassword } = body;
    await guardarCertificadoEnBoveda({
      organizationId: newOrg.id,
      tipo: "CSD",
      rfc: newOrg.rfc,
      noCertificado: "30001000000500003416",
      cerBufferOrString: cerBase64 || Buffer.from(`MOCK_CSD_CER_${newOrg.rfc}`),
      keyBufferOrString: keyBase64 || Buffer.from(`MOCK_CSD_KEY_${newOrg.rfc}`),
      passwordKey: csdPassword || "Demo1234!",
      validoDesde: new Date(),
      validoHasta: new Date("2028-12-31"),
    });

    // 6. Si se proporcionó e.firma en onboarding, resguardarla (NUNCA para timbrado)
    if (efirmaCerBase64 && efirmaKeyBase64 && efirmaPassword) {
      await guardarCertificadoEnBoveda({
        organizationId: newOrg.id,
        tipo: "EFIRMA",
        rfc: newOrg.rfc,
        noCertificado: "00001000000504465028",
        cerBufferOrString: efirmaCerBase64,
        keyBufferOrString: efirmaKeyBase64,
        passwordKey: efirmaPassword,
        validoDesde: new Date(),
        validoHasta: new Date("2028-12-31"),
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
