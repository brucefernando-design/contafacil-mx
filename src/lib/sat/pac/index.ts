import { PacProvider } from "./types";
import { MockPacProvider } from "./mock-provider";
import { HttpPacProvider } from "./http-provider";
import { FacturamaPacProvider } from "./facturama-provider";

export * from "./types";
export * from "./mock-provider";
export * from "./http-provider";
export * from "./facturama-provider";

/**
 * Resuelve el entorno PAC activo.
 * Lee PAC_ENV primero; si no está, acepta PAC_MODE como alias legacy.
 * Valores soportados: 'mock' | 'sandbox' | 'production' | 'facturama' (alias legacy de sandbox)
 */
export function getPacEnv(): "mock" | "sandbox" | "production" {
  const raw = (
    process.env.PAC_ENV ||
    process.env.PAC_MODE ||
    "mock"
  )
    .toLowerCase()
    .trim();

  if (raw === "production") return "production";
  if (raw === "sandbox" || raw === "facturama" || raw === "http") return "sandbox";
  return "mock";
}

/**
 * Retorna el proveedor PAC configurado según PAC_ENV (o PAC_MODE como alias).
 * No se cachea para que los tests puedan cambiar variables de entorno libremente.
 *
 * - mock       → MockPacProvider (sin HTTP, solo local)
 * - sandbox    → FacturamaPacProvider apuntando a apisandbox.facturama.mx
 * - production → FacturamaPacProvider apuntando a api.facturama.mx
 *                Requiere FACTURAMA_USER y FACTURAMA_PASSWORD; lanza error si faltan.
 */
export function getPacProvider(): PacProvider {
  const env = getPacEnv();

  if (env === "production" || env === "sandbox") {
    return new FacturamaPacProvider(env);
  }

  return new MockPacProvider();
}

