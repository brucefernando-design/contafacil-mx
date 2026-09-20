import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validarEmail, validarPassword } from "@/lib/validation/auth";
import { enviarBienvenida } from "@/lib/email/resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, acceptedTerms } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre completo es obligatorio." },
        { status: 400 }
      );
    }

    if (!acceptedTerms) {
      return NextResponse.json(
        { error: "Debes aceptar los Términos de Servicio y el Aviso de Privacidad para continuar." },
        { status: 400 }
      );
    }

    const emailVal = validarEmail(email);
    if (!emailVal.valido) {
      return NextResponse.json({ error: emailVal.error }, { status: 400 });
    }

    const passVal = validarPassword(password);
    if (!passVal.valido) {
      return NextResponse.json({ error: passVal.error }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Validar email único
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya se encuentra registrado en el sistema." },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario en base de datos con suscripción FREE por defecto
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "USER",
        isDespacho: false,
        subscription: {
          create: {
            plan: "FREE",
            status: "ACTIVE",
            timbresIncluidos: 10,
            timbresUsados: 0,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Enviar email de bienvenida en background (no bloquea el registro si falla)
    void enviarBienvenida(user.name, user.email);

    return NextResponse.json(
      {
        success: true,
        message: "¡Cuenta creada exitosamente! Revisa tu correo para la bienvenida.",
        user,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Error interno al registrar usuario." },
      { status: 500 }
    );
  }
}
