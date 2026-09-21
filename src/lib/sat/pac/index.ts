import { PacProvider } from "./types";
import { MockPacProvider } from "./mock-provider";
import { HttpPacProvider } from "./http-provider";
import { FacturamaPacProvider } from "./facturama-provider";

export * from "./types";
export * from "./mock-provider";
export * from "./http-provider";
export * from "./facturama-provider";

let cachedMock: MockPacProvider | null = null;
let cachedFacturama: FacturamaPacProvider | null = null;

/**
 * Retorna el proveedor PAC configurado para el sistema según PAC_MODE (default 'mock')
 */
export function getPacProvider(): PacProvider {
  const mode = (process.env.PAC_MODE || "mock").toLowerCase().trim();

  if (mode === "facturama" || mode === "http") {
    if (!cachedFacturama) {
      cachedFacturama = new FacturamaPacProvider();
    }
    return cachedFacturama;
  }

  if (!cachedMock) {
    cachedMock = new MockPacProvider();
  }
  return cachedMock;
}
