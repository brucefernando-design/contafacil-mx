/**
 * Utilidades de validación para Registro de Usuarios y Wizard Contribuyente SAT 2026
 */

export const REGIMENES_VALIDOS = ["626", "612", "606", "601", "616", "605", "603"] as const;
export type RegimenValido = (typeof REGIMENES_VALIDOS)[number];

export const REGIMENES_PF = ["626", "612", "606", "616", "605"] as const;
export const REGIMENES_PM = ["601", "603"] as const;

/**
 * Valida la contraseña: mínimo 8 caracteres y al menos un número.
 */
export function validarPassword(password: string): { valido: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valido: false, error: "La contraseña es obligatoria." };
  }
  if (password.length < 8) {
    return { valido: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!/\d/.test(password)) {
    return { valido: false, error: "La contraseña debe contener al menos un número." };
  }
  return { valido: true };
}

/**
 * Valida el formato básico de un correo electrónico.
 */
export function validarEmail(email: string): { valido: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valido: false, error: "El correo electrónico es obligatorio." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valido: false, error: "Formato de correo electrónico inválido." };
  }
  return { valido: true };
}

/**
 * Valida estructura y longitud del RFC según el tipo de persona.
 * PF: 13 caracteres (4 letras, 6 números de fecha, 3 de homoclave)
 * PM: 12 caracteres (3 letras, 6 números de fecha, 3 de homoclave)
 */
export function validarRfcEstructura(
  rfc: string,
  tipoPersona: "PF" | "PM"
): { valido: boolean; rfcFormateado: string; error?: string } {
  if (!rfc || typeof rfc !== "string") {
    return { valido: false, rfcFormateado: "", error: "El RFC es obligatorio." };
  }

  const cleanRfc = rfc.trim().toUpperCase();

  if (tipoPersona === "PF") {
    if (cleanRfc.length !== 13) {
      return {
        valido: false,
        rfcFormateado: cleanRfc,
        error: `El RFC de Persona Física debe tener exactamente 13 caracteres (tiene ${cleanRfc.length}).`,
      };
    }
    const rfcPfRegex = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
    if (!rfcPfRegex.test(cleanRfc)) {
      return {
        valido: false,
        rfcFormateado: cleanRfc,
        error: "El RFC no cumple con el formato oficial del SAT para Persona Física (ej. GAMA850512XYZ).",
      };
    }
  } else {
    // PM
    if (cleanRfc.length !== 12) {
      return {
        valido: false,
        rfcFormateado: cleanRfc,
        error: `El RFC de Persona Moral debe tener exactamente 12 caracteres (tiene ${cleanRfc.length}).`,
      };
    }
    const rfcPmRegex = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;
    if (!rfcPmRegex.test(cleanRfc)) {
      return {
        valido: false,
        rfcFormateado: cleanRfc,
        error: "El RFC no cumple con el formato oficial del SAT para Persona Moral (ej. SFI200115AA1).",
      };
    }
  }

  return { valido: true, rfcFormateado: cleanRfc };
}

/**
 * Valida el régimen fiscal acorde a si es PF o PM (626, 612, 606, 601).
 */
export function validarRegimenFiscal(
  regimen: string,
  tipoPersona: "PF" | "PM"
): { valido: boolean; error?: string } {
  if (!regimen) {
    return { valido: false, error: "El régimen fiscal es obligatorio." };
  }

  if (tipoPersona === "PF") {
    if (!REGIMENES_PF.includes(regimen as (typeof REGIMENES_PF)[number])) {
      return {
        valido: false,
        error: "Para Persona Física los regímenes soportados son: 626 (RESICO), 612 (Act. Empresarial) o 606 (Arrendamiento).",
      };
    }
  } else {
    if (!REGIMENES_PM.includes(regimen as (typeof REGIMENES_PM)[number])) {
      return {
        valido: false,
        error: "Para Persona Moral el régimen soportado es: 601 (General de Ley PM).",
      };
    }
  }

  return { valido: true };
}
