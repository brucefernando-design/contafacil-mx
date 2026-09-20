import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validarPassword } from "@/lib/validation/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token de recuperación no proporcionado." },
        { status: 400 }
      );
    }

    const passVal = validarPassword(password);
    if (!passVal.valido) {
      return NextResponse.json({ error: passVal.error }, { status: 400 });
    }

    // Buscar token en la base de datos
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "El enlace es inválido o ha expirado." },
        { status: 400 }
      );
    }

    if (resetRecord.used) {
      return NextResponse.json(
        { error: "Este enlace de recuperación ya fue utilizado previamente." },
        { status: 400 }
      );
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { error: "El enlace de recuperación ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña de usuario y marcar token como usado en transacción
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.",
    });
  } catch (error: unknown) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: "Error interno al restablecer la contraseña." },
      { status: 500 }
    );
  }
}
