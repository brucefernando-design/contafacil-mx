import crypto from "crypto";

export interface ConceptoItemInput {
  claveProdServ: string;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  descuento?: number;
  objetoImp?: string; // "01" No objeto, "02" Sí objeto
  ivaTasa?: number; // 0.16
  retIsrTasa?: number; // 0.0125 (RESICO a PM) o 0.10 (Honorarios AE)
  retIvaTasa?: number; // 0.106667 (2/3 partes del IVA)
}

export interface TimbradoCfdiInput {
  serie?: string;
  folio?: string;
  fecha?: Date;
  formaPago: string; // "01", "03", "04", "99"
  metodoPago: "PUE" | "PPD";
  lugarExpedicion: string; // CP Emisor
  tipoDeComprobante?: "I" | "E" | "P" | "T" | "N";
  moneda?: string;
  tipoCambio?: number;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscalReceptor: string; // CP Receptor
    regimenFiscalReceptor: string;
    usoCfdi: string; // "G03", "G01", "CP01", etc.
  };
  conceptos: ConceptoItemInput[];
}

export interface TimbradoCfdiResponse {
  success: boolean;
  codigoEstatus: string;
  mensaje: string;
  uuid: string;
  fechaTimbrado: string;
  noCertificadoSAT: string;
  selloCFD: string;
  selloSAT: string;
  cadenaOriginalSAT: string;
  qrCodeUrl: string;
  xmlTimbrado: string;
  subtotal: number;
  descuento: number;
  totalIvaTrasladado: number;
  totalIvaRetenido: number;
  totalIsrRetenido: number;
  total: number;
}

/**
 * PAC Mock Adapter SAT 2026
 * Simula la respuesta y timbrado oficial con sello digital, cadena original,
 * UUID estandarizado y estructura XML CFDI 4.0.
 */
export class PacMockAdapter {
  private static readonly RFC_PAC_PROV = "CFA110101SAT";
  private static readonly NO_CERTIFICADO_SAT = "00001000000504465028";

  public static async timbrarCfdi40(input: TimbradoCfdiInput): Promise<TimbradoCfdiResponse> {
    // 1. Validar RFCs según regla SAT
    if (!this.validarRfc(input.emisor.rfc)) {
      throw new Error(`RFC de Emisor inválido: ${input.emisor.rfc}`);
    }
    if (!this.validarRfc(input.receptor.rfc) && input.receptor.rfc !== "XAXX010101000") {
      throw new Error(`RFC de Receptor inválido: ${input.receptor.rfc}`);
    }

    // 2. Cálculos de importes e impuestos
    let subtotal = 0;
    let descuentoTotal = 0;
    let totalIvaTrasladado = 0;
    let totalIvaRetenido = 0;
    let totalIsrRetenido = 0;

    const conceptosCalculados = input.conceptos.map((item) => {
      const cantidad = item.cantidad || 1;
      const valorUnitario = item.valorUnitario || 0;
      const importe = Number((cantidad * valorUnitario).toFixed(2));
      const descuento = item.descuento || 0;
      const baseGravable = Math.max(0, importe - descuento);

      subtotal += importe;
      descuentoTotal += descuento;

      let ivaImporte = 0;
      if (item.objetoImp !== "01" && (item.ivaTasa ?? 0.16) > 0) {
        ivaImporte = Number((baseGravable * (item.ivaTasa ?? 0.16)).toFixed(2));
        totalIvaTrasladado += ivaImporte;
      }

      let retIsrImporte = 0;
      if ((item.retIsrTasa ?? 0) > 0) {
        retIsrImporte = Number((baseGravable * item.retIsrTasa!).toFixed(2));
        totalIsrRetenido += retIsrImporte;
      }

      let retIvaImporte = 0;
      if ((item.retIvaTasa ?? 0) > 0) {
        retIvaImporte = Number((baseGravable * item.retIvaTasa!).toFixed(2));
        totalIvaRetenido += retIvaImporte;
      }

      return {
        ...item,
        importe,
        descuento,
        ivaImporte,
        retIsrImporte,
        retIvaImporte,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    descuentoTotal = Number(descuentoTotal.toFixed(2));
    totalIvaTrasladado = Number(totalIvaTrasladado.toFixed(2));
    totalIvaRetenido = Number(totalIvaRetenido.toFixed(2));
    totalIsrRetenido = Number(totalIsrRetenido.toFixed(2));

    const total = Number(
      (subtotal - descuentoTotal + totalIvaTrasladado - totalIvaRetenido - totalIsrRetenido).toFixed(2)
    );

    // 3. Generar Timbre Fiscal Digital (UUID v4)
    const uuid = crypto.randomUUID().toUpperCase();
    const now = input.fecha || new Date();
    const fechaIso = now.toISOString().split(".")[0];
    const fechaTimbrado = new Date(now.getTime() + 1500).toISOString().split(".")[0];

    // Mock Sellos criptográficos SAT
    const selloCFD = crypto
      .createHash("sha256")
      .update(`${uuid}|${subtotal}|${total}|${input.emisor.rfc}`)
      .digest("base64");
    const selloSAT = crypto
      .createHash("sha256")
      .update(`${selloCFD}|${uuid}|${fechaTimbrado}`)
      .digest("base64");

    const cadenaOriginalSAT = `||1.1|${uuid}|${fechaTimbrado}|${this.RFC_PAC_PROV}|${selloCFD}|${this.NO_CERTIFICADO_SAT}||`;

    // 4. Cadena y QR Oficial SAT de Validación
    const ultimos8Sello = selloCFD.slice(-8);
    const totalFormateado = total.toFixed(6);
    const qrCodeUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${input.emisor.rfc}&rr=${input.receptor.rfc}&tt=${totalFormateado}&fe=${ultimos8Sello}`;

    // 5. Construir XML CFDI 4.0 Oficial
    const serieAttr = input.serie ? `Serie="${this.escapeXml(input.serie)}" ` : "";
    const folioAttr = input.folio ? `Folio="${this.escapeXml(input.folio)}" ` : "";
    const tipoComprobante = input.tipoDeComprobante || "I";

    const conceptosXml = conceptosCalculados
      .map((c) => {
        let impXml = "";
        if (c.ivaImporte > 0 || c.retIsrImporte > 0 || c.retIvaImporte > 0) {
          let traslados = "";
          if (c.ivaImporte > 0) {
            traslados = `
        <cfdi:Traslados>
          <cfdi:Traslado Base="${(c.importe - c.descuento).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(c.ivaTasa ?? 0.16).toFixed(6)}" Importe="${c.ivaImporte.toFixed(2)}"/>
        </cfdi:Traslados>`;
          }
          let retenciones = "";
          if (c.retIsrImporte > 0 || c.retIvaImporte > 0) {
            retenciones = `
        <cfdi:Retenciones>
          ${c.retIsrImporte > 0 ? `<cfdi:Retencion Base="${(c.importe - c.descuento).toFixed(2)}" Impuesto="001" TipoFactor="Tasa" TasaOCuota="${(c.retIsrTasa || 0).toFixed(6)}" Importe="${c.retIsrImporte.toFixed(2)}"/>` : ""}
          ${c.retIvaImporte > 0 ? `<cfdi:Retencion Base="${(c.importe - c.descuento).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${(c.retIvaTasa || 0).toFixed(6)}" Importe="${c.retIvaImporte.toFixed(2)}"/>` : ""}
        </cfdi:Retenciones>`;
          }

          impXml = `
      <cfdi:Impuestos>
        ${traslados}
        ${retenciones}
      </cfdi:Impuestos>`;
        }

        return `    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" Cantidad="${c.cantidad}" ClaveUnidad="${c.claveUnidad}" Unidad="${c.unidad || "Servicio"}" Descripcion="${this.escapeXml(c.descripcion)}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${c.importe.toFixed(2)}" Descuento="${c.descuento.toFixed(2)}" ObjetoImp="${c.objetoImp || "02"}">
      ${impXml}
    </cfdi:Concepto>`;
      })
      .join("\n");

    const xmlTimbrado = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="4.0" ${serieAttr}${folioAttr}Fecha="${fechaIso}" Sello="${selloCFD}" FormaPago="${input.formaPago}" NoCertificado="30001000000500003416" SubTotal="${subtotal.toFixed(2)}" Descuento="${descuentoTotal.toFixed(2)}" Moneda="${input.moneda || "MXN"}" TipoCambio="${input.tipoCambio || 1}" Total="${total.toFixed(2)}" TipoDeComprobante="${tipoComprobante}" Exportacion="01" MetodoPago="${input.metodoPago}" LugarExpedicion="${input.lugarExpedicion}">
  <cfdi:Emisor Rfc="${input.emisor.rfc}" Nombre="${this.escapeXml(input.emisor.nombre)}" RegimenFiscal="${input.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${input.receptor.rfc}" Nombre="${this.escapeXml(input.receptor.nombre)}" DomicilioFiscalReceptor="${input.receptor.domicilioFiscalReceptor}" RegimenFiscalReceptor="${input.receptor.regimenFiscalReceptor}" UsoCFDI="${input.receptor.usoCfdi}"/>
  <cfdi:Conceptos>
${conceptosXml}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${totalIvaTrasladado.toFixed(2)}" TotalImpuestosRetenidos="${(totalIvaRetenido + totalIsrRetenido).toFixed(2)}">
    ${totalIvaRetenido + totalIsrRetenido > 0 ? `<cfdi:Retenciones>
      ${totalIsrRetenido > 0 ? `<cfdi:Retencion Impuesto="001" Importe="${totalIsrRetenido.toFixed(2)}"/>` : ""}
      ${totalIvaRetenido > 0 ? `<cfdi:Retencion Impuesto="002" Importe="${totalIvaRetenido.toFixed(2)}"/>` : ""}
    </cfdi:Retenciones>` : ""}
    ${totalIvaTrasladado > 0 ? `<cfdi:Traslados>
      <cfdi:Traslado Base="${(subtotal - descuentoTotal).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${totalIvaTrasladado.toFixed(2)}"/>
    </cfdi:Traslados>` : ""}
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbrado}" RfcProvCertif="${this.RFC_PAC_PROV}" SelloCFD="${selloCFD}" NoCertificadoSAT="${this.NO_CERTIFICADO_SAT}" SelloSAT="${selloSAT}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return {
      success: true,
      codigoEstatus: "200",
      mensaje: "Comprobante CFDI 4.0 timbrado exitosamente por PAC EasyConta MX Mock",
      uuid,
      fechaTimbrado,
      noCertificadoSAT: this.NO_CERTIFICADO_SAT,
      selloCFD,
      selloSAT,
      cadenaOriginalSAT,
      qrCodeUrl,
      xmlTimbrado,
      subtotal,
      descuento: descuentoTotal,
      totalIvaTrasladado,
      totalIvaRetenido,
      totalIsrRetenido,
      total,
    };
  }

  public static validarRfc(rfc: string): boolean {
    const cleanRfc = rfc.trim().toUpperCase();
    // PM: 3 letras, 6 números (YYMMDD), 3 homoclave = 12 caracteres
    // PF: 4 letras, 6 números (YYMMDD), 3 homoclave = 13 caracteres
    const regexPf = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const regexPm = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
    return regexPf.test(cleanRfc) || regexPm.test(cleanRfc);
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
