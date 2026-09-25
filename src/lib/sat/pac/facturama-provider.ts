/**
 * FacturamaPacProvider
 * Integración oficial con Facturama API Multiemisor (CFDI 4.0 SAT)
 * Endpoints:
 * - Emisión: POST /api-lite/3/cfdis
 * - XML Timbrado: GET /Cfdi/xml/issuedLite/{id}
 * - CSD: POST /api-lite/csds
 * - Cancelación: DELETE /api-lite/3/cfdis/{id} o /Cfdi/{id}?type=issuedLite&motive={motive}
 *
 * Entornos:
 * - production → https://api.facturama.mx        (timbrado SAT real)
 * - sandbox    → https://apisandbox.facturama.mx  (sin valor fiscal)
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

const URLS: Record<"production" | "sandbox", string> = {
  production: "https://api.facturama.mx",
  sandbox: "https://apisandbox.facturama.mx",
};

export class FacturamaPacProvider implements PacProvider {
  public readonly name = "Facturama PAC Oficial SAT (CFDI 4.0)";
  public readonly mode = "http" as const;
  public readonly pacEnv: "production" | "sandbox";

  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly user: string;

  constructor(env: "production" | "sandbox" = "sandbox") {
    this.pacEnv = env;

    const user = (process.env.FACTURAMA_USER || process.env.PAC_USER || "").trim();
    const pass = (process.env.FACTURAMA_PASSWORD || process.env.PAC_PASSWORD || "").trim();

    if (!user || !pass) {
      throw new Error(
        "Faltan FACTURAMA_USER / FACTURAMA_PASSWORD en .env. " +
        "Configura las variables de entorno antes de usar FacturamaPacProvider."
      );
    }
    this.user = user;

    // PAC_BASE_URL tiene precedencia; si falta, se deriva del entorno
    this.baseUrl = (
      process.env.PAC_BASE_URL ||
      process.env.FACTURAMA_URL ||
      URLS[env]
    ).replace(/\/$/, "");

    const token = Buffer.from(`${user}:${pass}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  /**
   * Timbra un comprobante fiscal digital CFDI 4.0 en Facturama
   */
  public async timbrar(input: TimbradoCfdiInput): Promise<TimbradoCfdiResponse> {
    const folioStr = input.folio || String(Date.now()).slice(-6);
    const serieStr = input.serie || "A";

    // Mapear conceptos a la estructura requerida por Facturama CFDI 4.0
    const items = input.conceptos.map((c) => {
      const subtotal = Number((c.cantidad * c.valorUnitario).toFixed(2));
      const discount = c.descuento || 0;
      const baseImpuesto = Math.max(0, subtotal - discount);
      const taxes: Array<{
        Total: number;
        Name: string;
        Base: number;
        Rate: number;
        IsRetention: boolean;
      }> = [];

      // IVA Trasladado (16%)
      if (c.ivaTasa && c.ivaTasa > 0) {
        taxes.push({
          Total: Number((baseImpuesto * c.ivaTasa).toFixed(2)),
          Name: "IVA",
          Base: baseImpuesto,
          Rate: c.ivaTasa,
          IsRetention: false,
        });
      }

      // Retención ISR (ej. 1.25% RESICO o 10% Honorarios)
      if (c.retIsrTasa && c.retIsrTasa > 0) {
        taxes.push({
          Total: Number((baseImpuesto * c.retIsrTasa).toFixed(2)),
          Name: "ISR",
          Base: baseImpuesto,
          Rate: c.retIsrTasa,
          IsRetention: true,
        });
      }

      // Retención IVA (ej. 10.6667%)
      if (c.retIvaTasa && c.retIvaTasa > 0) {
        taxes.push({
          Total: Number((baseImpuesto * c.retIvaTasa).toFixed(2)),
          Name: "IVA",
          Base: baseImpuesto,
          Rate: c.retIvaTasa,
          IsRetention: true,
        });
      }

      const totalItem = Number(
        (
          subtotal -
          discount +
          (c.ivaTasa ? baseImpuesto * c.ivaTasa : 0) -
          (c.retIsrTasa ? baseImpuesto * c.retIsrTasa : 0) -
          (c.retIvaTasa ? baseImpuesto * c.retIvaTasa : 0)
        ).toFixed(2)
      );

      return {
        ProductCode: c.claveProdServ || "80141600",
        IdentificationNumber: c.claveProdServ || "SERV-001",
        Description: c.descripcion,
        Unit: c.unidad || "Servicio",
        UnitCode: c.claveUnidad || "E48",
        UnitPrice: c.valorUnitario,
        Quantity: c.cantidad,
        Subtotal: subtotal,
        Discount: discount,
        TaxObject: c.objetoImp || "02",
        Taxes: taxes.length > 0 ? taxes : undefined,
        Total: totalItem,
      };
    });

    const payload = {
      CfdiType: input.tipoDeComprobante || "I",
      PaymentForm: input.formaPago || "03",
      PaymentMethod: input.metodoPago || "PUE",
      ExpeditionPlace: input.lugarExpedicion,
      Folio: folioStr,
      Serie: serieStr,
      Currency: input.moneda || "MXN",
      Issuer: {
        FiscalRegime: input.emisor.regimenFiscal,
        Rfc: input.emisor.rfc.trim().toUpperCase(),
        Name: input.emisor.nombre.trim().toUpperCase(),
      },
      Receiver: {
        Rfc: input.receptor.rfc.trim().toUpperCase(),
        Name: input.receptor.nombre.trim().toUpperCase(),
        FiscalRegime: input.receptor.regimenFiscalReceptor || "601",
        TaxZipCode: input.receptor.domicilioFiscalReceptor || input.lugarExpedicion,
        CfdiUse: input.receptor.usoCfdi || "G03",
      },
      Items: items,
    };

    const res = await fetch(`${this.baseUrl}/api-lite/3/cfdis`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      let modelStateErrors = "";
      if (data.ModelState && typeof data.ModelState === "object") {
        modelStateErrors = Object.values(data.ModelState)
          .flat()
          .join(". ");
      }

      const rawMsg: string =
        modelStateErrors ||
        data.Message ||
        data.message ||
        "Error desconocido al timbrar en Facturama.";

      // Detectar específicamente el error de CSD no encontrado en Facturama
      const isCsdMissing =
        rawMsg.toLowerCase().includes("certificado") ||
        rawMsg.toLowerCase().includes("csd") ||
        rawMsg.toLowerCase().includes("no se encontr") ||
        rawMsg.toLowerCase().includes("not found");

      if (isCsdMissing) {
        throw new Error(
          `El CSD debe estar cargado en Facturama ${this.pacEnv} para este RFC emisor (${input.emisor.rfc}). ` +
          `Sube el CSD en el portal Facturama → Ajustes API → Certificados, o usa la bóveda de EasyConta para sincronizarlo.`
        );
      }

      throw new Error(`[Facturama PAC] ${rawMsg}`);
    }

    const uuid = data.Complement?.TaxStamp?.Uuid || data.Uuid || data.Id;
    const fechaTimbrado = data.Complement?.TaxStamp?.Date || data.Date || new Date().toISOString();
    const noCertificadoSAT = data.Complement?.TaxStamp?.SatCertNumber || "00001000000504465028";
    const selloCFD = data.Complement?.TaxStamp?.CfdiSign || "";
    const selloSAT = data.Complement?.TaxStamp?.SatSign || "";
    const cadenaOriginalSAT = data.OriginalString || `||1.1|${uuid}|${fechaTimbrado}|${selloCFD}|${noCertificadoSAT}||`;

    // Intentar obtener el XML timbrado oficial desde Facturama
    let xmlTimbrado = "";
    try {
      const xmlRes = await fetch(`${this.baseUrl}/Cfdi/xml/issuedLite/${data.Id}`, {
        headers: { Authorization: this.authHeader },
      });
      if (xmlRes.ok) {
        const xmlData = await xmlRes.json();
        if (xmlData.Content) {
          xmlTimbrado = Buffer.from(xmlData.Content, "base64").toString("utf-8");
        }
      }
    } catch {
      // Fallback XML si la descarga inmediata no responde
    }

    if (!xmlTimbrado) {
      xmlTimbrado = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Serie="${serieStr}" Folio="${folioStr}" Fecha="${fechaTimbrado}" SubTotal="${data.Subtotal || 0}" Total="${data.Total || 0}" Moneda="MXN" TipoDeComprobante="${input.tipoDeComprobante || "I"}" MetodoPago="${input.metodoPago}" LugarExpedicion="${input.lugarExpedicion}" Sello="${selloCFD}">
  <cfdi:Emisor Rfc="${input.emisor.rfc}" Nombre="${input.emisor.nombre}" RegimenFiscal="${input.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${input.receptor.rfc}" Nombre="${input.receptor.nombre}" DomicilioFiscalReceptor="${input.receptor.domicilioFiscalReceptor}" RegimenFiscalReceptor="${input.receptor.regimenFiscalReceptor}" UsoCFDI="${input.receptor.usoCfdi}"/>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbrado}" RfcProvCertif="FAC130626CP7" SelloCFD="${selloCFD}" NoCertificadoSAT="${noCertificadoSAT}" SelloSAT="${selloSAT}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
    }

    const qrCodeUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${input.emisor.rfc}&rr=${input.receptor.rfc}&tt=${data.Total || 0}&fe=${selloCFD.slice(-8)}`;

    return {
      success: true,
      codigoEstatus: "200",
      mensaje: "CFDI 4.0 timbrado exitosamente con Facturama (SAT Oficial)",
      pacEnv: this.pacEnv,
      uuid,
      fechaTimbrado,
      noCertificadoSAT,
      selloCFD,
      selloSAT,
      cadenaOriginalSAT,
      qrCodeUrl,
      xmlTimbrado,
      subtotal: data.Subtotal || 0,
      descuento: data.Discount || 0,
      totalIvaTrasladado: (data.Taxes || []).filter((t: any) => !t.IsRetention && t.Name === "IVA").reduce((acc: number, t: any) => acc + t.Total, 0),
      totalIvaRetenido: (data.Taxes || []).filter((t: any) => t.IsRetention && t.Name === "IVA").reduce((acc: number, t: any) => acc + t.Total, 0),
      totalIsrRetenido: (data.Taxes || []).filter((t: any) => t.IsRetention && t.Name === "ISR").reduce((acc: number, t: any) => acc + t.Total, 0),
      total: data.Total || 0,
    };
  }

  /**
   * Solicita la cancelación del CFDI ante el SAT mediante Facturama
   */
  public async cancelar(input: CancelacionCfdiInput): Promise<CancelacionCfdiResponse> {
    const motivo = input.motivo || "02";
    const replacementParam = input.folioSustitucion ? `&uuidReplacement=${input.folioSustitucion}` : "";
    const url = `${this.baseUrl}/Cfdi/${input.uuid}?type=issuedLite&motive=${motivo}${replacementParam}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: this.authHeader },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.Message || data.message || "Error al solicitar cancelación en Facturama";
      throw new Error(`[Facturama Cancelación] ${msg}`);
    }

    return {
      success: true,
      codigoEstatus: "200",
      mensaje: "Cancelación procesada ante el SAT",
      uuid: input.uuid,
      fechaCancelacion: new Date().toISOString(),
      acuseXml: data.AcuseXml || undefined,
    };
  }

  /**
   * Consulta el estatus del CFDI
   */
  public async consultarEstatus(input: ConsultaEstatusInput): Promise<ConsultaEstatusResponse> {
    const url = `${this.baseUrl}/cfdi/status?uuid=${input.uuid}&issuerRfc=${input.rfcEmisor}&receiverRfc=${input.rfcReceptor}&total=${input.total}`;
    const res = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        codigoEstatus: String(res.status),
        estado: "No Encontrado",
        esCancelable: "No",
        mensaje: data.Message || "Error al consultar estatus",
      };
    }

    return {
      codigoEstatus: "200",
      estado: data.Status === "active" ? "Vigente" : data.Status === "canceled" ? "Cancelado" : "No Encontrado",
      esCancelable: data.IsCancelable || "Cancelable sin aceptación",
      estatusCancelacion: data.CancelationStatus,
      mensaje: "Consulta de estatus exitosa",
    };
  }

  /**
   * Sincroniza un Certificado de Sello Digital (CSD) hacia Facturama Multiemisor
   */
  public async syncCsd(
    rfc: string,
    cerBase64: string,
    keyBase64: string,
    passwordKey: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api-lite/csds`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Rfc: rfc.trim().toUpperCase(),
        Certificate: cerBase64,
        PrivateKey: keyBase64,
        PrivateKeyPassword: passwordKey,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.Message || data.message || "Error al registrar CSD en Facturama";
      return { success: false, message: msg };
    }

    return { success: true, message: "CSD registrado con éxito en Facturama" };
  }
}
