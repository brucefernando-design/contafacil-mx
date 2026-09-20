import { prisma } from "../prisma";
import { AuditAction } from "@prisma/client";

export { AuditAction };

/**
 * Filtro de seguridad estricto para eliminar cualquier secreto, contraseña o llave privada
 * de los registros de auditoría y bitácoras del sistema.
 */
export function sanitizarDetalles(detalles: unknown): string {
  if (detalles === null || detalles === undefined) return "";

  if (typeof detalles === "string") {
    // Sanitizar cadenas que contengan patrones de contraseñas, secretos, tokens o llaves PEM
    return detalles
      .replace(
        /(password|contrase[ñn]a|secret|private[_-]?key|vault[_-]?key|token|apiKey)=([^\s,&]+)/gi,
        "$1=[REDACTED]"
      )
      .replace(
        /-----BEGIN [A-Z0-9 ]+-----[\s\S]+?-----END [A-Z0-9 ]+-----/g,
        "[CERTIFICATE_OR_KEY_REDACTED]"
      );
  }

  if (typeof detalles === "object") {
    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const limpio: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (/pass|secret|key|cer|token|priv|auth|sello|credential/i.test(k)) {
          limpio[k] = "[REDACTED]";
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          limpio[k] = sanitizeObject(v as Record<string, unknown>);
        } else {
          limpio[k] = v;
        }
      }
      return limpio;
    };

    return JSON.stringify(sanitizeObject(detalles as Record<string, unknown>));
  }

  return String(detalles);
}

export interface RegistrarAuditoriaParams {
  action: AuditAction;
  organizationId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  detalles?: unknown;
}

/**
 * Registra una entrada en la bitácora de auditoría asegurando sanitización de secretos.
 */
export async function registrarAuditoria(params: RegistrarAuditoriaParams) {
  try {
    const sanitizedDetalles = sanitizarDetalles(params.detalles);

    return await prisma.auditLog.create({
      data: {
        action: params.action,
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        userEmail: params.userEmail || null,
        ip: params.ip || null,
        detalles: sanitizedDetalles,
      },
    });
  } catch (err: unknown) {
    // Nunca romper el flujo de la aplicación si la auditoría falla
    console.error("[AuditLog Error]", (err as Error).message);
    return null;
  }
}
