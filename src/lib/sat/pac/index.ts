import { PacProvider } from "./types";
import { MockPacProvider } from "./mock-provider";
import { HttpPacProvider } from "./http-provider";
import { FacturamaPacProvider } from "./facturama-provider";

export * from "./types";
export * from "./mock-provider";
export * from "./http-provider";
export * from "./facturama-provider";

/**
 * Retorna el proveedor PAC configurado para el sistema según PAC_MODE (default 'mock').
 * No se cachea para que los tests puedan cambiar variables de entorno libremente.
 */
export function getPacProvider(): PacProvider {
  const mode = (process.env.PAC_MODE || "mock").toLowerCase().trim();

  if (mode === "facturama" || mode === "http") {
    return new FacturamaPacProvider();
  }

  return new MockPacProvider();
}
