import { ConceptoItemInput, TimbradoCfdiInput, TimbradoCfdiResponse } from "../pac-mock";

export type { ConceptoItemInput, TimbradoCfdiInput, TimbradoCfdiResponse };

export type MotivoCancelacionSat = "01" | "02" | "03" | "04";

export interface CancelacionCfdiInput {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
  motivo: MotivoCancelacionSat;
  folioSustitucion?: string;
}

export interface CancelacionCfdiResponse {
  success: boolean;
  codigoEstatus: string;
  mensaje: string;
  uuid: string;
  fechaCancelacion: string;
  acuseXml?: string;
}

export interface ConsultaEstatusInput {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
}

export interface ConsultaEstatusResponse {
  codigoEstatus: string;
  estado: "Vigente" | "Cancelado" | "No Encontrado";
  esCancelable: string;
  estatusCancelacion?: string;
  mensaje: string;
}

/**
 * Contrato unificado para Proveedores Autorizados de Certificación (PAC) del SAT
 */
export interface PacProvider {
  readonly name: string;
  readonly mode: "mock" | "http";

  /**
   * Timbra un comprobante fiscal digital CFDI 4.0
   */
  timbrar(input: TimbradoCfdiInput): Promise<TimbradoCfdiResponse>;

  /**
   * Solicita la cancelación de un CFDI 4.0 ante el SAT
   */
  cancelar(input: CancelacionCfdiInput): Promise<CancelacionCfdiResponse>;

  /**
   * Consulta el estatus oficial de un UUID (Vigente / Cancelado)
   */
  consultarEstatus(input: ConsultaEstatusInput): Promise<ConsultaEstatusResponse>;
}
