import crypto from "crypto";
import { prisma } from "../prisma";

// Clave maestra de cifrado de 256 bits (32 bytes)
const MASTER_KEY_RAW =
  process.env.CERT_VAULT_KEY ||
  process.env.NEXTAUTH_SECRET ||
  "contafacil-sat-aes256-gcm-vault-key-32chars!";

function getVaultMasterKey(): Buffer {
  // Garantizar exactamente 32 bytes mediante SHA-256
  return crypto.createHash("sha256").update(MASTER_KEY_RAW).digest();
}

export interface EncryptedPayload {
  ciphertext: string; // Base64 o Hex
  iv: string;         // Hex
  tag: string;        // Hex
}

/**
 * Cifra datos binarios o de texto usando AES-256-GCM con autenticación criptográfica.
 */
export function encryptAes256Gcm(data: Buffer | string): EncryptedPayload {
  const masterKey = getVaultMasterKey();
  // 12 bytes IV estándar recomendado por NIST para AES-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  const inputBuffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Descifra y valida integridad/autenticidad mediante el Authentication Tag de AES-256-GCM.
 */
export function decryptAes256Gcm(ciphertextBase64: string, ivHex: string, tagHex: string): Buffer {
  const masterKey = getVaultMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);

  decipher.setAuthTag(tag);
  const encryptedBuffer = Buffer.from(ciphertextBase64, "base64");
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

  return decrypted;
}

export type TipoCertificado = "CSD" | "EFIRMA";
export type OperacionCertificado = "TIMBRADO" | "PORTAL_SAT" | "CONSULTA_METADATOS";

/**
 * REGLA ESTRICTA SAT (Art. 29 CFF y RMF 2026):
 * La e.firma (FIEL) NUNCA debe ser usada para el timbrado ni emisión de CFDI.
 * Para facturación digital debe emplearse exclusivamente el CSD (Certificado de Sello Digital).
 */
export function validarUsoCertificado(tipo: TipoCertificado, operacion: OperacionCertificado): void {
  if (operacion === "TIMBRADO" && tipo === "EFIRMA") {
    throw new Error(
      "Violación de seguridad y normativa SAT: La e.firma (FIEL) no puede ser utilizada para expedición o timbrado de CFDI. Debe utilizarse exclusivamente un Certificado de Sello Digital (CSD). Fundamento: Art. 29 CFF."
    );
  }
}

export interface GuardarCertificadoParams {
  organizationId: string;
  tipo: TipoCertificado;
  rfc: string;
  noCertificado?: string;
  cerBufferOrString: Buffer | string;
  keyBufferOrString: Buffer | string;
  passwordKey: string;
  validoDesde?: Date;
  validoHasta?: Date;
}

/**
 * Almacena un certificado (CSD o e.firma) cifrando CER, KEY y Contraseña en AES-256-GCM.
 */
export async function guardarCertificadoEnBoveda(params: GuardarCertificadoParams) {
  const encCer = encryptAes256Gcm(params.cerBufferOrString);
  const encKey = encryptAes256Gcm(params.keyBufferOrString);
  const encPass = encryptAes256Gcm(params.passwordKey);

  // Marcar anteriores como inactivos para ese tipo
  await prisma.certificateVault.updateMany({
    where: {
      organizationId: params.organizationId,
      tipo: params.tipo,
      activo: true,
    },
    data: { activo: false },
  });

  const record = await prisma.certificateVault.create({
    data: {
      organizationId: params.organizationId,
      tipo: params.tipo,
      rfc: params.rfc,
      noCertificado: params.noCertificado || "30001000000500003416",
      validoDesde: params.validoDesde || new Date("2024-01-01"),
      validoHasta: params.validoHasta || new Date("2028-12-31"),
      encryptedCer: encCer.ciphertext,
      cerIv: encCer.iv,
      cerTag: encCer.tag,
      encryptedKey: encKey.ciphertext,
      keyIv: encKey.iv,
      keyTag: encKey.tag,
      encryptedPassword: encPass.ciphertext,
      passwordIv: encPass.iv,
      passwordTag: encPass.tag,
      activo: true,
    },
  });

  return record;
}

/**
 * Obtiene el certificado CSD descifrado para TIMBRADO DE CFDI.
 * Si se solicita o encuentra una e.firma para timbrado, detiene la operación de inmediato.
 */
export async function obtenerCertificadoParaTimbrado(organizationId: string) {
  const cert = await prisma.certificateVault.findFirst({
    where: {
      organizationId,
      activo: true,
      tipo: "CSD", // Exige CSD explícitamente
    },
    orderBy: { createdAt: "desc" },
  });

  if (!cert) {
    // Verificar si intentaron configurar e.firma por error
    const efirmaFound = await prisma.certificateVault.findFirst({
      where: { organizationId, activo: true, tipo: "EFIRMA" },
    });

    if (efirmaFound) {
      validarUsoCertificado("EFIRMA", "TIMBRADO");
    }

    throw new Error(
      "No se encontró un Certificado de Sello Digital (CSD) activo para timbrar comprobantes. Debe cargar su CSD (.cer y .key)."
    );
  }

  // Garantizar regla por si el registro se alteró
  validarUsoCertificado(cert.tipo as TipoCertificado, "TIMBRADO");

  // Descifrar con validación de integridad AES-256-GCM
  const cer = decryptAes256Gcm(cert.encryptedCer, cert.cerIv, cert.cerTag);
  const key = decryptAes256Gcm(cert.encryptedKey, cert.keyIv, cert.keyTag);
  const password = decryptAes256Gcm(cert.encryptedPassword, cert.passwordIv, cert.passwordTag).toString("utf8");

  return {
    id: cert.id,
    tipo: cert.tipo,
    rfc: cert.rfc,
    noCertificado: cert.noCertificado,
    cer,
    key,
    password,
    validoHasta: cert.validoHasta,
  };
}
