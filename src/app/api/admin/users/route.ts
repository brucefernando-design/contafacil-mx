import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANES_CONFIG, PlanType } from "@/lib/sat/subscription-engine";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return { ok: false, status: 403, error: "Acceso denegado. Se requiere rol de Super Administrador." };
  }

  return { ok: true, admin: user };
}

// GET: Obtener lista completa de usuarios y métricas del sistema
export async function GET() {
  const authCheck = await verifyAdmin();
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDespacho: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            periodEnd: true,
            timbresIncluidos: true,
            timbresUsados: true,
            mpPaymentId: true,
            updatedAt: true,
          },
        },
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                rfc: true,
                razonSocial: true,
                regimenFiscal: true,
              },
            },
          },
        },
      },
    });

    const totalOrgs = await prisma.organization.count();
    const totalInvoices = await prisma.invoice.count();

    const metrics = {
      totalUsers: users.length,
      totalOrgs,
      totalInvoices,
      freeUsers: users.filter((u) => (u.subscription?.plan || "FREE") === "FREE").length,
      proUsers: users.filter((u) => u.subscription?.plan === "PRO").length,
      despachoUsers: users.filter((u) => u.subscription?.plan === "DESPACHO").length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      contadores: users.filter((u) => u.role === "CONTADOR").length,
    };

    return NextResponse.json({ users, metrics });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al obtener usuarios para el panel admin." },
      { status: 500 }
    );
  }
}

// POST: Crear usuario directamente con planes de cortesía o modalidades especiales
export async function POST(req: Request) {
  const authCheck = await verifyAdmin();
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      role = "USER",
      isDespacho = false,
      plan = "FREE",
      modalidad = "NORMAL", // "GRATIS_TOTAL" | "CORTESIA_TIMBRES" | "NORMAL"
      timbresPersonalizados,
      vigenciaYears = 10,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "El correo electrónico es inválido." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este correo electrónico." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const planType: PlanType = (["FREE", "PRO", "DESPACHO"].includes(plan) ? plan : "FREE") as PlanType;

    // Calcular timbres y vigencia según la modalidad seleccionada
    let timbresIncluidos = PLANES_CONFIG[planType].timbresIncluidos;
    let periodEnd: Date | null = null;

    if (modalidad === "GRATIS_TOTAL") {
      // Cuenta 100% gratuita para socios/amigos/personal con timbres incluidos
      periodEnd = new Date(Date.now() + (Number(vigenciaYears) || 10) * 365 * 24 * 60 * 60 * 1000);
      timbresIncluidos = timbresPersonalizados !== undefined && timbresPersonalizados !== ""
        ? Number(timbresPersonalizados)
        : PLANES_CONFIG[planType].timbresIncluidos;
    } else if (modalidad === "CORTESIA_TIMBRES") {
      // Cuenta cortesía: plataforma gratis pero 0 timbres incluidos (solo pagan sus timbrados al PAC)
      periodEnd = new Date(Date.now() + (Number(vigenciaYears) || 10) * 365 * 24 * 60 * 60 * 1000);
      timbresIncluidos = 0;
    } else {
      // Modalidad normal
      if (planType !== "FREE") {
        periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: ["USER", "CONTADOR", "ADMIN"].includes(role) ? role : "USER",
        isDespacho: Boolean(isDespacho) || planType === "DESPACHO",
        subscription: {
          create: {
            plan: planType,
            status: "ACTIVE",
            periodEnd,
            timbresIncluidos,
            timbresUsados: 0,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDespacho: true,
        createdAt: true,
        subscription: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Usuario ${newUser.name} creado exitosamente con plan ${planType} (${modalidad}).`,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error al crear usuario en Super Admin." },
      { status: 500 }
    );
  }
}
