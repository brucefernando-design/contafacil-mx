import { prisma } from "@/lib/prisma";

export const FUENTES_OFICIALES_69B = [
  "http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv",
  "https://www.sat.gob.mx/minisitio/DatosAbiertos/contribuyentes_publicados.html",
];

export interface Sat69BRecord {
  rfc: string;
  razonSocial: string;
  situacion: "PRESUNTO" | "DEFINITIVO" | "DESVIRTUADO" | "SENTENCIA_FAVORABLE" | "OTRO";
  publicacionDof: Date;
  oficio: string;
  motivo?: string;
}

export interface Actualizar69BResult {
  ok: boolean;
  fuente: string;
  totalEnCsv: number;
  upserts: number;
  desvirtuados: number;
  alertasGeneradas?: number;
  error?: string;
}

/**
 * Normaliza la situación reportada por el SAT en el listado del DOF/Art. 69-B
 */
export function normalizarSituacion69B(val: string): "PRESUNTO" | "DEFINITIVO" | "DESVIRTUADO" | "SENTENCIA_FAVORABLE" | "OTRO" {
  const s = (val || "").toUpperCase().trim();
  if (s.includes("DEFINITIV")) return "DEFINITIVO";
  if (s.includes("DESVIRTUAD")) return "DESVIRTUADO";
  if (s.includes("PRESUNT")) return "PRESUNTO";
  if (s.includes("FAVORABLE") || s.includes("SENTENCIA")) return "SENTENCIA_FAVORABLE";
  return "OTRO";
}

/**
 * Valida si una cadena cumple con la estructura sintáctica de un RFC mexicano (12 o 13 caracteres)
 */
export function esRfcValido(rfc: string): boolean {
  if (!rfc) return false;
  const clean = rfc.trim().toUpperCase();
  // Regex oficial RFC: 3-4 letras, 6 dígitos (AAMMDD), 3 caracteres alfanuméricos homoclave
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(clean);
}

/**
 * Parsea el texto del CSV del SAT tolerando encoding latin1/win1252 o UTF-8.
 * El CSV del SAT generalmente contiene varias columnas:
 * No., RFC, Nombre del Contribuyente, Situación del contribuyente, Número y fecha de oficio global de presunción, etc.
 */
export function parsearCsv69B(csvText: string): Sat69BRecord[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/);
  const records: Sat69BRecord[] = [];
  const seenRfc = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;

    // Parser simple de CSV respetando comillas
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    cols.push(cur.trim());

    // Buscar la columna que contenga un RFC válido
    let rfcColIdx = -1;
    for (let c = 0; c < Math.min(cols.length, 5); c++) {
      const candidate = cols[c].replace(/["']/g, "").trim().toUpperCase();
      if (esRfcValido(candidate)) {
        rfcColIdx = c;
        break;
      }
    }

    if (rfcColIdx === -1) continue; // Fila de cabecera o sin RFC

    const rfc = cols[rfcColIdx].replace(/["']/g, "").trim().toUpperCase();
    if (seenRfc.has(rfc)) continue; // Evitar duplicados en el mismo archivo
    seenRfc.add(rfc);

    const razonSocial = (cols[rfcColIdx + 1] || "CONTRIBUYENTE SAT").replace(/["']/g, "").trim();
    const situacionRaw = cols[rfcColIdx + 2] || "";
    const situacion = normalizarSituacion69B(situacionRaw);

    const oficio = cols[rfcColIdx + 3] ? cols[rfcColIdx + 3].replace(/["']/g, "").trim() : "OFICIO-DOF-SAT";
    const fechaStr = cols[rfcColIdx + 4] ? cols[rfcColIdx + 4].replace(/["']/g, "").trim() : "";
    let publicacionDof = new Date();
    if (fechaStr) {
      const parsedD = new Date(fechaStr);
      if (!isNaN(parsedD.getTime())) {
        publicacionDof = parsedD;
      }
    }

    records.push({
      rfc,
      razonSocial: razonSocial || "SIN RAZON SOCIAL REGISTRADA",
      situacion,
      publicacionDof,
      oficio: oficio || "OFICIO-DOF-SAT",
      motivo: `Publicación DOF Art. 69-B situación ${situacion}`,
    });
  }

  return records;
}

/**
 * Descarga y sincroniza la lista negra oficial del Art. 69-B del SAT.
 * - Tolera fallos sin vaciar la base de datos local.
 * - Descarta archivos con menos de 100 registros (posible descarga rota).
 * - Cruza proveedores recibidos si se provee organizationId opcional.
 */
export async function actualizarLista69BOficial(params?: {
  organizationId?: string;
  csvContentOverride?: string; // Para pruebas unitarias
  minRowsThreshold?: number;
}): Promise<Actualizar69BResult> {
  const minRows = params?.minRowsThreshold ?? 100;
  let csvText = params?.csvContentOverride || "";
  let fuenteUtilizada = "PARAM_OVERRIDE";

  if (!csvText) {
    let descargado = false;
    for (const fuente of FUENTES_OFICIALES_69B) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

        const response = await fetch(fuente, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (EasyConta-MX-Auditor/2026; sat-compliance)",
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          // Decodificar con windows-1252 / latin1 para soportar acentos y caracteres oficiales del SAT
          try {
            const decoder = new TextDecoder("windows-1252");
            csvText = decoder.decode(buffer);
          } catch {
            csvText = new TextDecoder("utf-8").decode(buffer);
          }

          if (csvText && csvText.length > 500) {
            fuenteUtilizada = fuente;
            descargado = true;
            break;
          }
        }
      } catch (e: any) {
        console.warn(`[Sat69BSync] Fallo al descargar de ${fuente}:`, e?.message);
      }
    }

    if (!descargado || !csvText) {
      return {
        ok: false,
        fuente: "NINGUNA",
        totalEnCsv: 0,
        upserts: 0,
        desvirtuados: 0,
        error: "No se pudo actualizar la lista oficial. Los servidores del SAT no respondieron a tiempo.",
      };
    }
  }

  // Parsear registros
  const records = parsearCsv69B(csvText);

  // Regla de integridad: Si el CSV viene con menos de minRows filas, es una descarga truncada o corrupta
  if (records.length < minRows) {
    return {
      ok: false,
      fuente: fuenteUtilizada,
      totalEnCsv: records.length,
      upserts: 0,
      desvirtuados: 0,
      error: `Descarga incompleta o corrupta (< ${minRows} registros válidos). Se conserva la lista previa intacta.`,
    };
  }

  let upserts = 0;
  let desvirtuados = 0;

  // Insertar o actualizar registros en la base de datos
  for (const rec of records) {
    if (rec.situacion === "DESVIRTUADO" || rec.situacion === "SENTENCIA_FAVORABLE") {
      desvirtuados++;
    }

    try {
      await prisma.satBlacklist.upsert({
        where: { rfc: rec.rfc },
        update: {
          razonSocial: rec.razonSocial,
          situacion: rec.situacion,
          publicacionDof: rec.publicacionDof,
          oficio: rec.oficio,
          motivo: rec.motivo,
        },
        create: {
          rfc: rec.rfc,
          razonSocial: rec.razonSocial,
          situacion: rec.situacion,
          publicacionDof: rec.publicacionDof,
          oficio: rec.oficio,
          motivo: rec.motivo,
        },
      });
      upserts++;
    } catch {
      // Continuar con el siguiente registro si falla uno individual
    }
  }

  // Cruce preventivo con facturas RECIBIDA vigentes (máximo 200)
  let alertasGeneradas = 0;
  if (params?.organizationId) {
    try {
      const facturasRecibidas = await prisma.invoice.findMany({
        where: {
          organizationId: params.organizationId,
          tipo: "RECIBIDA",
          estatus: "VIGENTE",
        },
        take: 200,
        select: {
          id: true,
          uuid: true,
          folio: true,
          total: true,
          emisorRfc: true,
          emisorNombre: true,
        },
      });

      for (const factura of facturasRecibidas) {
        const cleanRfc = factura.emisorRfc.trim().toUpperCase();
        const efo = await prisma.satBlacklist.findUnique({
          where: { rfc: cleanRfc },
        });

        if (efo && (efo.situacion === "DEFINITIVO" || efo.situacion === "PRESUNTO")) {
          // Validar si ya existe la alerta en esta organización para este RFC
          const alertaExistente = await prisma.fiscalAlert.findFirst({
            where: {
              organizationId: params.organizationId,
              tipo: "EFOS_DETECTADO",
              titulo: { contains: cleanRfc },
            },
          });

          if (!alertaExistente) {
            await prisma.fiscalAlert.create({
              data: {
                organizationId: params.organizationId,
                tipo: "EFOS_DETECTADO",
                titulo: `¡Alerta Crítica EFOS 69-B! Proveedor: ${cleanRfc}`,
                descripcion: `El proveedor ${factura.emisorNombre || efo.razonSocial} (${cleanRfc}) figura en situación ${efo.situacion} ante el SAT. Factura por $${Number(factura.total).toFixed(2)}.`,
                severidad: "CRITICAL",
              },
            });
            alertasGeneradas++;
          }
        }
      }
    } catch (e: any) {
      console.warn("[Sat69BSync] Advertencia al generar cruces de alertas:", e?.message);
    }
  }

  return {
    ok: true,
    fuente: fuenteUtilizada,
    totalEnCsv: records.length,
    upserts,
    desvirtuados,
    alertasGeneradas,
  };
}
