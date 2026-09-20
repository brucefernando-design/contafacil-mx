/**
 * HttpPacProvider (Stub de integración comercial PAC SAT)
 *
 * PROVEEDORES PAC OBJETIVO PARA EASYCONTA MX:
 * ============================================
 * 1. FACTURAMA (https://www.facturama.mx / https://api.facturama.com.mx)
 *    - Arquitectura REST JSON para CFDI 4.0.
 *    - Endpoints previstos: POST /2/cfdis (timbrado), DELETE /cfdi/{id}?type=issued&motive={motive} (cancelación).
 *    - Autenticación: Basic Auth con credenciales de API o Bearer Token.
 *
 * 2. SW SAPIEN / SMARTERWEB (https://sw.com.mx)
 *    - PAC autorizado SAT #58172 con servicios REST y SOAP de alta disponibilidad.
 *    - Endpoints previstos: POST /cfdi40/issue/v4, POST /cfdi/v4/cancel/csd.
 *    - Autenticación: Token en cabecera 'Authorization: Bearer <PAC_API_KEY>'.
 *
 * NOTA DE SEGURIDAD FISCAL:
 * En cumplimiento con las directivas del proyecto, no se inventan endpoints no oficiales del SAT.
 * Esta clase valida la presencia obligatoria de PAC_API_KEY y PAC_BASE_URL para cuando se active
 * el timbrado con el PAC comercial definitivo en producción.
 */

import {
  CancelacionCfdiInput,
  CancelacionCfdiResponse,
  ConsultaEstatusInput,
  ConsultaEstatusResponse,
  PacProvider,
  TimbradoCfdiInput,
  TimbradoCfdiResponse,
} from "./types";

export class HttpPacProvider implements PacProvider {
  public readonly name = "HTTP Commercial PAC Provider (Facturama / SW Sapien Ready)";
  public readonly mode = "http" as const;

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    const key = process.env.PAC_API_KEY;
    if (!key || key.trim() === "") {
      throw new Error(
        "Configuración PAC inválida: La variable de entorno PAC_API_KEY es obligatoria cuando PAC_MODE=http. Por favor configúrala en tu archivo .env con las credenciales de Facturama o SW Sapien, o cambia a PAC_MODE=mock."
      );
    }

    this.apiKey = key.trim();
    this.baseUrl = (process.env.PAC_BASE_URL || "https://api.facturama.com.mx").replace(/\/$/, "");
  }

  public async timbrar(input: TimbradoCfdiInput): Promise<TimbradoCfdiResponse> {
    // Stub preparado para Facturama / SW Sapien en fase de producción
    throw new Error(
      `[HttpPacProvider] La conexión al PAC HTTP comercial (${this.baseUrl}) se encuentra en fase de homologación. Para pruebas locales y simulaciones, utiliza PAC_MODE=mock.`
    );
  }

  public async cancelar(input: CancelacionCfdiInput): Promise<CancelacionCfdiResponse> {
    throw new Error(
      `[HttpPacProvider] La cancelación mediante PAC HTTP comercial (${this.baseUrl}) se encuentra en fase de homologación. Para pruebas locales y simulaciones, utiliza PAC_MODE=mock.`
    );
  }

  public async consultarEstatus(input: ConsultaEstatusInput): Promise<ConsultaEstatusResponse> {
    throw new Error(
      `[HttpPacProvider] La consulta mediante PAC HTTP comercial (${this.baseUrl}) se encuentra en fase de homologación. Para pruebas locales y simulaciones, utiliza PAC_MODE=mock.`
    );
  }
}
