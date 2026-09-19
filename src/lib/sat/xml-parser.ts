import { XMLParser } from "fast-xml-parser";

export interface ParsedConcepto {
  claveProdServ: string;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento: number;
  objetoImp: string;
  ivaTasa?: number;
  ivaImporte?: number;
  retIsrTasa?: number;
  retIsrImporte?: number;
  retIvaTasa?: number;
  retIvaImporte?: number;
}

export interface ParsedPagoDoctoRelacionado {
  idDocumento: string; // UUID de la factura PPD relacionada
  serie?: string;
  folio?: string;
  monedaDr: string;
  metodoDePagoDr: string;
  numParcialidad: number;
  impSaldoAnt: number;
  impPagado: number;
  impSaldoInsoluto: number;
}

export interface ParsedCfdi40 {
  version: string;
  serie?: string;
  folio?: string;
  fecha: Date;
  formaPago: string;
  metodoPago: "PUE" | "PPD" | string;
  lugarExpedicion: string;
  moneda: string;
  tipoCambio: number;
  subtotal: number;
  descuento: number;
  total: number;
  tipoDeComprobante: string; // "I", "E", "P", "T", "N"
  
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };

  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscalReceptor: string;
    regimenFiscalReceptor: string;
    usoCfdi: string;
  };

  conceptos: ParsedConcepto[];
  
  totalIvaTrasladado: number;
  totalIvaRetenido: number;
  totalIsrRetenido: number;

  timbre: {
    uuid: string;
    fechaTimbrado: Date;
    rfcProvCertif: string;
    selloCFD: string;
    selloSAT: string;
    noCertificadoSAT: string;
  };

  complementoPagos?: {
    fechaPago: Date;
    formaDePagoP: string;
    montoTotalPagos: number;
    doctosRelacionados: ParsedPagoDoctoRelacionado[];
  };

  rawXml: string;
}

export class CfdiXmlParser {
  private static parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
  });

  public static parse(xmlContent: string): ParsedCfdi40 {
    try {
      const parsed = this.parser.parse(xmlContent);

      // El comprobante puede venir con prefijo cfdi:Comprobante o Comprobante
      const comprobante = parsed["cfdi:Comprobante"] || parsed["Comprobante"];
      if (!comprobante) {
        throw new Error("El XML no contiene un nodo raíz <cfdi:Comprobante> válido.");
      }

      const version = comprobante["@_Version"] || "4.0";
      const serie = comprobante["@_Serie"] || undefined;
      const folio = comprobante["@_Folio"] || undefined;
      const fechaStr = comprobante["@_Fecha"] || new Date().toISOString();
      const fecha = new Date(fechaStr);
      const formaPago = comprobante["@_FormaPago"] || "99";
      const metodoPago = comprobante["@_MetodoPago"] || "PUE";
      const lugarExpedicion = comprobante["@_LugarExpedicion"] || "00000";
      const moneda = comprobante["@_Moneda"] || "MXN";
      const tipoCambio = parseFloat(comprobante["@_TipoCambio"] || "1.0");
      const subtotal = parseFloat(comprobante["@_SubTotal"] || "0.0");
      const descuento = parseFloat(comprobante["@_Descuento"] || "0.0");
      const total = parseFloat(comprobante["@_Total"] || "0.0");
      const tipoDeComprobante = comprobante["@_TipoDeComprobante"] || "I";

      // Emisor
      const emisorNode = comprobante["cfdi:Emisor"] || comprobante["Emisor"] || {};
      const emisor = {
        rfc: (emisorNode["@_Rfc"] || "").toUpperCase(),
        nombre: emisorNode["@_Nombre"] || "",
        regimenFiscal: emisorNode["@_RegimenFiscal"] || "601",
      };

      // Receptor
      const receptorNode = comprobante["cfdi:Receptor"] || comprobante["Receptor"] || {};
      const receptor = {
        rfc: (receptorNode["@_Rfc"] || "").toUpperCase(),
        nombre: receptorNode["@_Nombre"] || "",
        domicilioFiscalReceptor: receptorNode["@_DomicilioFiscalReceptor"] || lugarExpedicion,
        regimenFiscalReceptor: receptorNode["@_RegimenFiscalReceptor"] || "601",
        usoCfdi: receptorNode["@_UsoCFDI"] || "G03",
      };

      // Conceptos
      const conceptosNode = comprobante["cfdi:Conceptos"] || comprobante["Conceptos"] || {};
      const rawConceptos = conceptosNode["cfdi:Concepto"] || conceptosNode["Concepto"] || [];
      const conceptoList = Array.isArray(rawConceptos) ? rawConceptos : [rawConceptos];

      const conceptos: ParsedConcepto[] = conceptoList.filter(Boolean).map((c: Record<string, unknown>) => {
        const itemImporte = parseFloat((c["@_Importe"] as string) || "0.0");
        const itemDescuento = parseFloat((c["@_Descuento"] as string) || "0.0");
        const itemObjImp = (c["@_ObjetoImp"] as string) || "02";

        let ivaTasa = 0.16;
        let ivaImporte = 0;
        let retIsrTasa = 0;
        let retIsrImporte = 0;
        let retIvaTasa = 0;
        let retIvaImporte = 0;

        const impNode = (c["cfdi:Impuestos"] || c["Impuestos"]) as Record<string, unknown> | undefined;
        if (impNode) {
          // Traslados concepto
          const trasNode = (impNode["cfdi:Traslados"] || impNode["Traslados"]) as Record<string, unknown> | undefined;
          if (trasNode) {
            const rawT = trasNode["cfdi:Traslado"] || trasNode["Traslado"];
            const tList = Array.isArray(rawT) ? rawT : [rawT];
            for (const t of tList) {
              if (t && ((t as Record<string, string>)["@_Impuesto"] === "002" || (t as Record<string, string>)["@_Impuesto"] === "IVA")) {
                ivaTasa = parseFloat((t as Record<string, string>)["@_TasaOCuota"] || "0.16");
                ivaImporte += parseFloat((t as Record<string, string>)["@_Importe"] || "0.0");
              }
            }
          }

          // Retenciones concepto
          const retNode = (impNode["cfdi:Retenciones"] || impNode["Retenciones"]) as Record<string, unknown> | undefined;
          if (retNode) {
            const rawR = retNode["cfdi:Retencion"] || retNode["Retencion"];
            const rList = Array.isArray(rawR) ? rawR : [rawR];
            for (const r of rList) {
              if (r) {
                const impId = (r as Record<string, string>)["@_Impuesto"];
                const impTasa = parseFloat((r as Record<string, string>)["@_TasaOCuota"] || "0.0");
                const impVal = parseFloat((r as Record<string, string>)["@_Importe"] || "0.0");
                if (impId === "001" || impId === "ISR") {
                  retIsrTasa = impTasa;
                  retIsrImporte += impVal;
                } else if (impId === "002" || impId === "IVA") {
                  retIvaTasa = impTasa;
                  retIvaImporte += impVal;
                }
              }
            }
          }
        }

        return {
          claveProdServ: (c["@_ClaveProdServ"] as string) || "01010101",
          claveUnidad: (c["@_ClaveUnidad"] as string) || "E48",
          unidad: (c["@_Unidad"] as string) || "Servicio",
          descripcion: (c["@_Descripcion"] as string) || "",
          cantidad: parseFloat((c["@_Cantidad"] as string) || "1.0"),
          valorUnitario: parseFloat((c["@_ValorUnitario"] as string) || "0.0"),
          importe: itemImporte,
          descuento: itemDescuento,
          objetoImp: itemObjImp,
          ivaTasa,
          ivaImporte,
          retIsrTasa,
          retIsrImporte,
          retIvaTasa,
          retIvaImporte,
        };
      });

      // Impuestos a nivel Comprobante
      let totalIvaTrasladado = 0;
      let totalIvaRetenido = 0;
      let totalIsrRetenido = 0;

      const impuestosGlobalNode = comprobante["cfdi:Impuestos"] || comprobante["Impuestos"];
      if (impuestosGlobalNode) {
        totalIvaTrasladado = parseFloat(impuestosGlobalNode["@_TotalImpuestosTrasladados"] || "0.0");
        
        // Retenciones globales
        const retGlobalNode = impuestosGlobalNode["cfdi:Retenciones"] || impuestosGlobalNode["Retenciones"];
        if (retGlobalNode) {
          const rawR = retGlobalNode["cfdi:Retencion"] || retGlobalNode["Retencion"];
          const rList = Array.isArray(rawR) ? rawR : [rawR];
          for (const r of rList) {
            if (r) {
              const impId = (r as Record<string, string>)["@_Impuesto"];
              const impVal = parseFloat((r as Record<string, string>)["@_Importe"] || "0.0");
              if (impId === "001" || impId === "ISR") totalIsrRetenido += impVal;
              else if (impId === "002" || impId === "IVA") totalIvaRetenido += impVal;
            }
          }
        }
      }

      // Si no vienen en el nodo global, sumar de los conceptos
      if (totalIvaTrasladado === 0 && conceptos.length > 0) {
        totalIvaTrasladado = conceptos.reduce((sum, c) => sum + (c.ivaImporte || 0), 0);
      }
      if (totalIsrRetenido === 0 && conceptos.length > 0) {
        totalIsrRetenido = conceptos.reduce((sum, c) => sum + (c.retIsrImporte || 0), 0);
      }
      if (totalIvaRetenido === 0 && conceptos.length > 0) {
        totalIvaRetenido = conceptos.reduce((sum, c) => sum + (c.retIvaImporte || 0), 0);
      }

      // Complemento TimbreFiscalDigital
      const complementoNode = comprobante["cfdi:Complemento"] || comprobante["Complemento"] || {};
      const tfdNode = complementoNode["tfd:TimbreFiscalDigital"] || complementoNode["TimbreFiscalDigital"] || {};

      const uuid = (tfdNode["@_UUID"] || "").toUpperCase();
      const fechaTimbradoStr = tfdNode["@_FechaTimbrado"] || fechaStr;
      const fechaTimbrado = new Date(fechaTimbradoStr);
      const rfcProvCertif = tfdNode["@_RfcProvCertif"] || "CFA110101SAT";
      const selloCFD = tfdNode["@_SelloCFD"] || comprobante["@_Sello"] || "";
      const selloSAT = tfdNode["@_SelloSAT"] || "";
      const noCertificadoSAT = tfdNode["@_NoCertificadoSAT"] || "00001000000504465028";

      // Complemento de Pagos 2.0 (si aplica)
      let complementoPagos: ParsedCfdi40["complementoPagos"] = undefined;
      const pagosNode = complementoNode["pago20:Pagos"] || complementoNode["Pagos"];
      if (pagosNode) {
        const rawPago = pagosNode["pago20:Pago"] || pagosNode["Pago"];
        const pagoObj = Array.isArray(rawPago) ? rawPago[0] : rawPago;
        if (pagoObj) {
          const rawDr = pagoObj["pago20:DoctoRelacionado"] || pagoObj["DoctoRelacionado"] || [];
          const drList = Array.isArray(rawDr) ? rawDr : [rawDr];
          const doctosRelacionados: ParsedPagoDoctoRelacionado[] = drList.filter(Boolean).map((dr: Record<string, string>) => ({
            idDocumento: (dr["@_IdDocumento"] || "").toUpperCase(),
            serie: dr["@_Serie"],
            folio: dr["@_Folio"],
            monedaDr: dr["@_MonedaDR"] || "MXN",
            metodoDePagoDr: dr["@_MetodoDePagoDR"] || "PPD",
            numParcialidad: parseInt(dr["@_NumParcialidad"] || "1", 10),
            impSaldoAnt: parseFloat(dr["@_ImpSaldoAnt"] || "0.0"),
            impPagado: parseFloat(dr["@_ImpPagado"] || "0.0"),
            impSaldoInsoluto: parseFloat(dr["@_ImpSaldoInsoluto"] || "0.0"),
          }));

          complementoPagos = {
            fechaPago: new Date(pagoObj["@_FechaPago"] || fechaStr),
            formaDePagoP: pagoObj["@_FormaDePagoP"] || "03",
            montoTotalPagos: parseFloat(pagoObj["@_Monto"] || "0.0"),
            doctosRelacionados,
          };
        }
      }

      return {
        version,
        serie,
        folio,
        fecha,
        formaPago,
        metodoPago,
        lugarExpedicion,
        moneda,
        tipoCambio,
        subtotal,
        descuento,
        total,
        tipoDeComprobante,
        emisor,
        receptor,
        conceptos,
        totalIvaTrasladado,
        totalIvaRetenido,
        totalIsrRetenido,
        timbre: {
          uuid,
          fechaTimbrado,
          rfcProvCertif,
          selloCFD,
          selloSAT,
          noCertificadoSAT,
        },
        complementoPagos,
        rawXml: xmlContent,
      };
    } catch (err: unknown) {
      throw new Error(`Error al procesar el archivo XML CFDI 4.0: ${(err as Error).message}`);
    }
  }
}
