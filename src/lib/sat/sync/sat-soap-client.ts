import crypto from "crypto";

/**
 * Cliente SOAP para el Web Service Oficial del SAT (WS Descarga Masiva de CFDI 4.0)
 * Especificación técnica SAT: WS-Security con firma RSA-SHA256 y certificado e.firma (FIEL).
 */

export interface SatAuthToken {
  token: string;
  created: string;
  expires: string;
}

export interface SatSolicitudResponse {
  codEstatus: string;
  mensaje: string;
  idSolicitud?: string;
}

export interface SatVerificaResponse {
  codEstatus: string;
  codigoEstadoSolicitud: string;
  estadoSolicitud: number; // 1: Aceptada, 2: En proceso, 3: Terminada, 4: Error, 5: Rechazada, 6: Vencida
  numeroCFDIs: number;
  paquetes: string[];
}

export class SatSoapClient {
  private static readonly ENDPOINT_AUTH =
    "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc";
  private static readonly ENDPOINT_SOLICITA =
    "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/SolicitaDescargaService.svc";
  private static readonly ENDPOINT_VERIFICA =
    "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/VerificaSolicitudDescargaService.svc";
  private static readonly ENDPOINT_DESCARGA =
    "https://cfdidescargamasivaconsulta.clouda.sat.gob.mx/DescargaMasivaService.svc";

  /**
   * Genera la firma digital RSA-SHA256 de una cadena con la llave privada de la e.firma
   */
  public static firmarCadena(cadena: string, privateKeyPem: string): string {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(cadena, "utf8");
    sign.end();
    return sign.sign(privateKeyPem, "base64");
  }

  /**
   * Calcula el Digest SHA1 en base64 de un XML canónico
   */
  public static calcularDigestSha1(cadena: string): string {
    return crypto.createHash("sha1").update(cadena, "utf8").digest("base64");
  }

  /**
   * Construye un sobre SOAP WS-Security estándar
   */
  public static construirEnvelopeSoap(params: {
    bodyXml: string;
    certificateBase64: string;
    signatureValue: string;
    action?: string;
  }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:BinarySecurityToken ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${params.certificateBase64.replace(/[\r\n]/g, "")}</wsse:BinarySecurityToken>
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignatureValue>${params.signatureValue}</SignatureValue>
      </Signature>
    </wsse:Security>
  </s:Header>
  <s:Body>
    ${params.bodyXml}
  </s:Body>
</s:Envelope>`;
  }

  /**
   * Genera el sobre SOAP de Autenticación ante el SAT firmado con la e.firma
   */
  public static generarSoapAutenticacion(
    certificateB64: string,
    privateKeyPem: string
  ): string {
    const now = new Date();
    const created = now.toISOString();
    const expires = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const uuid = crypto.randomUUID();

    // Canonicalized Timestamp
    const toSign = `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="_0"><u:Created>${created}</u:Created><u:Expires>${expires}</u:Expires></u:Timestamp>`;
    const signature = this.firmarCadena(toSign, privateKeyPem);

    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" s:mustUnderstand="1">
      <u:Timestamp u:Id="_0">
        <u:Created>${created}</u:Created>
        <u:Expires>${expires}</u:Expires>
      </u:Timestamp>
      <o:BinarySecurityToken u:Id="uuid-${uuid}-1" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${certificateB64.replace(/[\r\n]/g, "")}</o:BinarySecurityToken>
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
          <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha256"/>
          <Reference URI="#_0">
            <Transforms>
              <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </Transforms>
            <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <DigestValue>${crypto.createHash("sha256").update(toSign).digest("base64")}</DigestValue>
          </Reference>
        </SignedInfo>
        <SignatureValue>${signature}</SignatureValue>
        <KeyInfo>
          <o:SecurityTokenReference>
            <o:Reference ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" URI="#uuid-${uuid}-1"/>
          </o:SecurityTokenReference>
        </KeyInfo>
      </Signature>
    </o:Security>
  </s:Header>
  <s:Body>
    <Autentica xmlns="http://DescargaMasivaTerceros.sat.gob.mx"/>
  </s:Body>
</s:Envelope>`;
  }

  /**
   * Obtiene el token de sesión SOAP del SAT usando la e.firma
   */
  public static async obtenerTokenAutenticacion(
    certificateB64: string,
    privateKeyPem: string
  ): Promise<SatAuthToken> {
    const soapBody = this.generarSoapAutenticacion(certificateB64, privateKeyPem);

    const res = await fetch(this.ENDPOINT_AUTH, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://DescargaMasivaTerceros.sat.gob.mx/IAutenticacion/Autentica",
      },
      body: soapBody,
    });

    if (!res.ok) {
      throw new Error(`[SAT SOAP] Error HTTP ${res.status} al autenticar con el SAT`);
    }

    const xmlResponse = await res.text();
    const tokenMatch = xmlResponse.match(/<token[^>]*>([^<]+)<\/token>/i);

    if (!tokenMatch || !tokenMatch[1]) {
      throw new Error("[SAT SOAP] La respuesta del SAT no contiene un token de autenticación válido");
    }

    const now = new Date();
    return {
      token: tokenMatch[1],
      created: now.toISOString(),
      expires: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Envía una solicitud de descarga masiva al SAT
   */
  public static async solicitarDescarga(params: {
    token: string;
    rfcSolicitante: string;
    rfcEmisor?: string;
    rfcReceptor?: string;
    fechaInicial: string; // YYYY-MM-DDTHH:mm:ss
    fechaFinal: string;   // YYYY-MM-DDTHH:mm:ss
    tipoSolicitud: "CFDI" | "Metadata";
    certificateB64: string;
    privateKeyPem: string;
  }): Promise<SatSolicitudResponse> {
    // Generar elemento canónico firmado para la solicitud
    const rfcEmisorXml = params.rfcEmisor ? ` RfcEmisor="${params.rfcEmisor}"` : "";
    const rfcReceptorXml = params.rfcReceptor ? ` RfcReceptor="${params.rfcReceptor}"` : "";

    const requestXml = `<des:SolicitaDescarga xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx"><des:solicitud FechaFinal="${params.fechaFinal}" FechaInicial="${params.fechaInicial}" RfcSolicitante="${params.rfcSolicitante}"${rfcEmisorXml}${rfcReceptorXml} TipoSolicitud="${params.tipoSolicitud}"></des:solicitud></des:SolicitaDescarga>`;
    const signature = this.firmarCadena(requestXml, params.privateKeyPem);

    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx">
  <s:Header/>
  <s:Body>
    <des:SolicitaDescarga>
      <des:solicitud FechaFinal="${params.fechaFinal}" FechaInicial="${params.fechaInicial}" RfcSolicitante="${params.rfcSolicitante}"${rfcEmisorXml}${rfcReceptorXml} TipoSolicitud="${params.tipoSolicitud}">
        <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
          <SignedInfo>
            <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha256"/>
            <Reference URI="">
              <Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>
              <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <DigestValue>${crypto.createHash("sha256").update(requestXml).digest("base64")}</DigestValue>
            </Reference>
          </SignedInfo>
          <SignatureValue>${signature}</SignatureValue>
          <KeyInfo>
            <X509Data>
              <X509Certificate>${params.certificateB64.replace(/[\r\n]/g, "")}</X509Certificate>
            </X509Data>
          </KeyInfo>
        </Signature>
      </des:solicitud>
    </des:SolicitaDescarga>
  </s:Body>
</s:Envelope>`;

    const res = await fetch(this.ENDPOINT_SOLICITA, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://DescargaMasivaTerceros.sat.gob.mx/ISolicitaDescargaService/SolicitaDescarga",
        Authorization: `WRAP access_token="${params.token}"`,
      },
      body: soap,
    });

    const xml = await res.text();
    const idMatch = xml.match(/IdSolicitud="([^"]+)"/i);
    const codMatch = xml.match(/CodEstatus="([^"]+)"/i);
    const mensajeMatch = xml.match(/Mensaje="([^"]+)"/i);

    return {
      codEstatus: codMatch ? codMatch[1] : "5000",
      mensaje: mensajeMatch ? mensajeMatch[1] : "Solicitud procesada",
      idSolicitud: idMatch ? idMatch[1] : undefined,
    };
  }

  /**
   * Verifica el estatus de empaquetado de una solicitud en el SAT
   */
  public static async verificarSolicitud(params: {
    token: string;
    rfcSolicitante: string;
    idSolicitud: string;
    certificateB64: string;
    privateKeyPem: string;
  }): Promise<SatVerificaResponse> {
    const toSign = `<des:VerificaSolicitudDescarga xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx"><des:solicitud IdSolicitud="${params.idSolicitud}" RfcSolicitante="${params.rfcSolicitante}"></des:solicitud></des:VerificaSolicitudDescarga>`;
    const signature = this.firmarCadena(toSign, params.privateKeyPem);

    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx">
  <s:Header/>
  <s:Body>
    <des:VerificaSolicitudDescarga>
      <des:solicitud IdSolicitud="${params.idSolicitud}" RfcSolicitante="${params.rfcSolicitante}">
        <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
          <SignedInfo>
            <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha256"/>
            <Reference URI="">
              <Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>
              <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <DigestValue>${crypto.createHash("sha256").update(toSign).digest("base64")}</DigestValue>
            </Reference>
          </SignedInfo>
          <SignatureValue>${signature}</SignatureValue>
          <KeyInfo>
            <X509Data>
              <X509Certificate>${params.certificateB64.replace(/[\r\n]/g, "")}</X509Certificate>
            </X509Data>
          </KeyInfo>
        </Signature>
      </des:solicitud>
    </des:VerificaSolicitudDescarga>
  </s:Body>
</s:Envelope>`;

    const res = await fetch(this.ENDPOINT_VERIFICA, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://DescargaMasivaTerceros.sat.gob.mx/IVerificaSolicitudDescargaService/VerificaSolicitudDescarga",
        Authorization: `WRAP access_token="${params.token}"`,
      },
      body: soap,
    });

    const xml = await res.text();
    const estadoMatch = xml.match(/EstadoSolicitud="([^"]+)"/i);
    const codMatch = xml.match(/CodEstatus="([^"]+)"/i);
    const numMatch = xml.match(/NumeroCFDIs="([^"]+)"/i);

    // Extraer paquetes UUIDs
    const paquetes: string[] = [];
    const paqMatches = xml.matchAll(/<IdsPaquetes[^>]*>([^<]+)<\/IdsPaquetes>/gi);
    for (const m of paqMatches) {
      if (m[1]) paquetes.push(m[1].trim());
    }

    return {
      codEstatus: codMatch ? codMatch[1] : "5000",
      codigoEstadoSolicitud: estadoMatch ? estadoMatch[1] : "3",
      estadoSolicitud: estadoMatch ? parseInt(estadoMatch[1], 10) : 3,
      numeroCFDIs: numMatch ? parseInt(numMatch[1], 10) : paquetes.length,
      paquetes,
    };
  }
}
