interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Almacén en memoria por IP y Acción
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Validador de límite de tasa en memoria.
 * Permite hasta `limit` peticiones en una ventana de `windowMs` milisegundos.
 * Default: 20 peticiones / 60 segundos por IP y acción.
 */
export function checkRateLimit(
  ip: string,
  action: string,
  limit = 20,
  windowMs = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const cleanIp = (ip || "127.0.0.1").trim();
  const key = `${action}:${cleanIp}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.resetTime };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, reset: record.resetTime };
}

/**
 * Limpia el almacén en memoria (útil para pruebas unitarias o mantenimiento periódico).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
