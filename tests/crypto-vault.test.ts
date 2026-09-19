import { describe, it, expect } from "vitest";
import {
  encryptAes256Gcm,
  decryptAes256Gcm,
  validarUsoCertificado,
} from "../src/lib/sat/crypto-vault";

describe("ContaFácil MX - Bóveda de Certificados Criptográfica (AES-256-GCM)", () => {
  it("Cifra y descifra correctamente un texto plano con autenticación", () => {
    const textoOriginal = "ClaveSecretaSAT2026!#$";
    const encrypted = encryptAes256Gcm(textoOriginal);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toHaveLength(24); // 12 bytes en hex = 24 caracteres
    expect(encrypted.tag).toHaveLength(32); // 16 bytes en hex = 32 caracteres

    const decryptedBuffer = decryptAes256Gcm(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    expect(decryptedBuffer.toString("utf8")).toBe(textoOriginal);
  });

  it("Cifra y descifra correctamente un buffer binario (ej. archivo .cer o .key)", () => {
    const binarioDummy = Buffer.from([0x30, 0x82, 0x04, 0x12, 0x02, 0x01, 0x01, 0xff]);
    const encrypted = encryptAes256Gcm(binarioDummy);

    const decrypted = decryptAes256Gcm(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    expect(decrypted.equals(binarioDummy)).toBe(true);
  });

  it("Falla el descifrado si el auth tag o el ciphertext han sido alterados (integridad GCM)", () => {
    const textoOriginal = "CertificadoDigitalSAT";
    const encrypted = encryptAes256Gcm(textoOriginal);

    // Alterar el tag
    const tagAlterado = "00".repeat(16);
    expect(() => {
      decryptAes256Gcm(encrypted.ciphertext, encrypted.iv, tagAlterado);
    }).toThrow();
  });

  it("Permite CSD para operación de TIMBRADO", () => {
    expect(() => {
      validarUsoCertificado("CSD", "TIMBRADO");
    }).not.toThrow();
  });

  it("Permite e.firma para operaciones de autenticación en portal SAT", () => {
    expect(() => {
      validarUsoCertificado("EFIRMA", "PORTAL_SAT");
      validarUsoCertificado("EFIRMA", "CONSULTA_METADATOS");
    }).not.toThrow();
  });

  it("REGLA CRÍTICA SAT: Arroja error explícito si se intenta usar e.firma (FIEL) para TIMBRADO", () => {
    expect(() => {
      validarUsoCertificado("EFIRMA", "TIMBRADO");
    }).toThrowError(/Violación de seguridad y normativa SAT: La e\.firma \(FIEL\) no puede ser utilizada para expedición o timbrado de CFDI/);
  });

  it("Exige la variable de entorno CERT_VAULT_KEY sin fallback hardcodeado inseguro", () => {
    const originalKey = process.env.CERT_VAULT_KEY;
    delete process.env.CERT_VAULT_KEY;

    expect(() => {
      encryptAes256Gcm("test");
    }).toThrowError(/CERT_VAULT_KEY es obligatoria/);

    process.env.CERT_VAULT_KEY = originalKey || "contafacil-sat-aes256-gcm-vault-key-32chars!";
  });
});
