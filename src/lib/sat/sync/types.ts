export type SatSyncTipo = "EMITIDAS" | "RECIBIDAS" | "TODAS";

export type SatSyncStatus = "SOLICITADA" | "EN_PROCESO" | "COMPLETADA" | "ERROR";

export interface SatSyncRequestInput {
  organizationId: string;
  userId: string;
  tipo: SatSyncTipo;
  fechaInicio: string; // ISO o YYYY-MM-DD
  fechaFin: string;    // ISO o YYYY-MM-DD
}

export interface SatSyncJobResult {
  jobId: string;
  status: SatSyncStatus;
  tipo: SatSyncTipo;
  fechaInicio: string;
  fechaFin: string;
  facturasProcesadas: number;
  facturasNuevas: number;
  facturasDuplicadas: number;
  mensaje: string;
  errorDetalle?: string;
  modo: "REAL_EFIRMA_SAT" | "SANDBOX_SIMULADO";
}

export interface FacturaSatExtraida {
  uuid: string;
  serie?: string;
  folio?: string;
  tipoDeComprobante: "I" | "E" | "P" | "N";
  tipo: "EMITIDA" | "RECIBIDA";
  fecha: Date;
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimen: string;
  receptorRfc: string;
  receptorNombre: string;
  receptorCp: string;
  receptorRegimen: string;
  receptorUsoCfdi: string;
  subtotal: number;
  descuento: number;
  total: number;
  totalIvaTrasladado: number;
  totalIvaRetenido: number;
  totalIsrRetenido: number;
  metodoPago: "PUE" | "PPD";
  formaPago: string;
  lugarExpedicion: string;
  rawXml: string;
}
