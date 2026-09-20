import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { validarEmail } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { enviarRecuperarPassword } from "@/lib/email/resend";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Rate limit: máx 5 solicitudes por minuto por IP para evitar spam
    const rl = checkRateLimit(ip, "forgot_password", 5, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un minuto antes de volver a intentar." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    const emailVal = validarEmail(email);
    if (!emailVal.valido) {
      return NextResponse.json({ error: emailVal.error }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Si el usuario existe, generar token y enviar correo
    if (user) {
      // Invalidar tokens previos no usados
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de vigencia

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
          used: false,
        },
      });

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        "https://easyconta.allia2.com.mx";

      const resetLink = `${appUrl}/restablecer-password?token=${token}`;

      void enviarRecuperarPassword(user.name, user.email, resetLink);
    }

    // Respuesta genérica por seguridad para evitar enumeración de usuarios
    return NextResponse.json({
      success: true,
      message:
        "Si el correo electrónico está registrado, recibirás un enlace con instrucciones para restablecer tu contraseña en los próximos minutos.",
    });
  } catch (error: unknown) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de recuperación." },
      { status: 500 }
    );
  }
}
