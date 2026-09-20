import { Resend } from "resend";

// Helper para obtener cliente Resend solo en runtime
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = process.env.RESEND_FROM_EMAIL || "EasyConta MX <onboarding@resend.dev>";

// ─────────────────────────────────────────────────────────────────────────────
// Plantillas HTML
// ─────────────────────────────────────────────────────────────────────────────

function plantillaBienvenida(nombre: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a EasyConta MX</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                EasyConta MX
              </h1>
              <p style="margin:4px 0 0;color:#a7f3d0;font-size:13px;">
                Contabilidad SAT simplificada
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">
                ¡Hola, ${nombre}! 👋
              </h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Tu cuenta en <strong>EasyConta MX</strong> fue creada exitosamente.
                Ya puedes emitir tus primeras facturas CFDI 4.0, ver tu motor fiscal y
                llevar tu contabilidad en un solo lugar.
              </p>

              <!-- Aviso demo -->
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:24px 0;">
                <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">
                  ⚠️ Cuenta en modo DEMO
                </p>
                <p style="margin:8px 0 0;color:#92400e;font-size:13px;line-height:1.5;">
                  El timbrado es de <strong>demostración</strong>. Los CFDI generados
                  <strong>NO se envían al SAT</strong>. Cuando quieras timbrado real,
                  actualiza tu plan.
                </p>
              </div>

              <!-- Plan -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;">
                <p style="margin:0;color:#065f46;font-size:13px;font-weight:700;">Plan FREE activado</p>
                <p style="margin:4px 0 0;color:#065f46;font-size:13px;">
                  ✅ 10 timbres de demostración/mes<br/>
                  ✅ 1 RFC<br/>
                  ✅ Motor Fiscal RESICO + Actividad Empresarial<br/>
                  ✅ Bóveda de comprobantes
                </p>
              </div>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://easyconta.allia2.com.mx"}/dashboard"
                      style="background:#059669;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
                      Ir a mi Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                Si no creaste esta cuenta, ignora este correo.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                EasyConta MX — Herramienta de demostración. No es servicio oficial del SAT.<br/>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://easyconta.allia2.com.mx"}/privacidad"
                  style="color:#059669;text-decoration:none;">Aviso de Privacidad</a>
                &nbsp;·&nbsp;
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://easyconta.allia2.com.mx"}/terminos"
                  style="color:#059669;text-decoration:none;">Términos de Servicio</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones públicas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envía el correo de bienvenida al nuevo usuario.
 * No lanza excepción si falla — el registro no debe bloquearse por email.
 */
export async function enviarBienvenida(nombre: string, email: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY no configurada — email de bienvenida omitido.");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "¡Bienvenido a EasyConta MX! 🎉",
      html: plantillaBienvenida(nombre),
    });

    if (error) {
      console.error("[Resend] Error enviando bienvenida:", error);
    } else {
      console.info("[Resend] Email de bienvenida enviado a:", email);
    }
  } catch (err) {
    // No propagamos — el error de email no debe romper el registro
    console.error("[Resend] Excepción enviando email:", err);
  }
}

/**
 * Envía confirmación de pago / upgrade de plan.
 */
export async function enviarConfirmacionPlan(
  nombre: string,
  email: string,
  plan: string
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const planEmojis: Record<string, string> = {
    PRO: "⭐",
    DESPACHO: "🏢",
    FREE: "✅",
  };

  const emoji = planEmojis[plan] || "✅";

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `${emoji} Plan ${plan} activado en EasyConta MX`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
          <h2 style="color:#059669;">¡Plan ${plan} activado! ${emoji}</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Tu plan <strong>${plan}</strong> ha sido activado exitosamente en EasyConta MX.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://easyconta.allia2.com.mx"}/dashboard/plan"
              style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">
              Ver mi Plan →
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">
            EasyConta MX — Herramienta de demostración. No es servicio oficial del SAT.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Resend] Error enviando confirmación de plan:", err);
  }
}
