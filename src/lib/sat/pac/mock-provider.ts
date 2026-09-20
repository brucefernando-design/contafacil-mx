import { PacMockAdapter } from "../pac-mock";
import {
  CancelacionCfdiInput,
  CancelacionCfdiResponse,
  ConsultaEstatusInput,
  ConsultaEstatusResponse,
  PacProvider,
  TimbradoCfdiInput,
  TimbradoCfdiResponse,
} from "./types";

/**
 * MockPacProvider
 * Implementación local del PAC para simulación de timbrado, cancelación y consulta CFDI 4.0.
 */
export class MockPacProvider implements PacProvider {
  public readonly name = "EasyConta PAC Mock (SAT México 2026)";
  public readonly mode = "mock" as const;

  public async timbrar(input: TimbradoCfdiInput): Promise<TimbradoCfdiResponse> {
    return PacMockAdapter.timbrarCfdi40(input);
  }

  public async cancelar(input: CancelacionCfdiInput): Promise<CancelacionCfdiResponse> {
    if (!input.uuid || !input.rfcEmisor) {
      throw new Error("UUID y RFC del emisor son obligatorios para cancelar el CFDI.");
    }

    if (input.motivo === "01" && !input.folioSustitucion) {
      throw new Error(
        "Para el motivo '01' (Comprobante emitido con errores con relación), es obligatorio ingresar el UUID de sustitución."
      );
    }

    const fechaCancelacion = new Date().toISOString();
    const acuseXml = `<?xml version="1.0" encoding="UTF-8"?>
<Acuse xmlns="http://cancelacfd.sat.gob.mx" Fecha="${fechaCancelacion}" RfcEmisor="${input.rfcEmisor}">
  <Folios>
    <UUID>${input.uuid}</UUID>
    <EstatusUUID>201</EstatusUUID>
    <Motivo>${input.motivo}</Motivo>
    ${input.folioSustitucion ? `<FolioSustitucion>${input.folioSustitucion}</FolioSustitucion>` : ""}
  </Folios>
  <SelloDigitalSAT>MOCK_SELLO_SAT_CANCELACION_${input.uuid.slice(0, 8)}</SelloDigitalSAT>
</Acuse>`;

    return {
      success: true,
      codigoEstatus: "201",
      mensaje: "Comprobante cancelado exitosamente ante el SAT (PAC Mock 2026).",
      uuid: input.uuid,
      fechaCancelacion,
      acuseXml,
    };
  }

  public async consultarEstatus(input: ConsultaEstatusInput): Promise<ConsultaEstatusResponse> {
    return {
      codigoEstatus: "S - Comprobante obtenido satisfactoriamente",
      estado: "Vigente",
      esCancelable: "Cancelable sin aceptación",
      mensaje: `Estatus verificado exitosamente para UUID ${input.uuid} (PAC Mock).`,
    };
  }
}
