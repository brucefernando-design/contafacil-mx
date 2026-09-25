import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/session";
import { importarCfdiXml } from "@/lib/sat/import-cfdi";
import JSZip from "jszip";

// Límite de seguridad
const MAX_XML_COUNT = 500;
const MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024; // 25 MB
const CHUNK_SIZE = 25;

interface ErrorLoteItem {
  archivo: string;
  error: string;
}

interface EfoLoteItem {
  rfc: string;
  razonSocial?: string;
  situacion?: string;
  uuid: string;
}

export async function POST(req: Request) {
  try {
    const sessionData = await getCurrentUserAndOrg();
    if (!sessionData?.user || !sessionData.activeOrg) {
      return NextResponse.json({ error: "No autenticado o sin RFC activo" }, { status: 401 });
    }

    const { activeOrg } = sessionData;
    const formData = await req.formData();

    // 1. Obtener archivos enviados (puede ser 'archivo' o 'archivos')
    const files: File[] = [];
    const archivoSingle = formData.get("archivo") as File | null;
    if (archivoSingle && archivoSingle instanceof File) {
      files.push(archivoSingle);
    }

    const archivosMulti = formData.getAll("archivos") as File[];
    if (archivosMulti && archivosMulti.length > 0) {
      for (const f of archivosMulti) {
        if (f instanceof File && !files.includes(f)) {
          files.push(f);
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo XML o ZIP para procesar." },
        { status: 400 }
      );
    }

    // Lista de XML a procesar: { nombre: string, contenido: string }
    const xmlEntries: Array<{ nombre: string; contenido: string }> = [];
    let totalBytesDescomprimidos = 0;

    for (const file of files) {
      const fileNameLower = file.name.toLowerCase();

      // Caso A: Es un archivo ZIP
      if (fileNameLower.endsWith(".zip") || file.type.includes("zip")) {
        const arrayBuffer = await file.arrayBuffer();
        let zip: JSZip;
        try {
          zip = await JSZip.loadAsync(arrayBuffer);
        } catch {
          return NextResponse.json(
            { error: `El archivo ${file.name} no es un ZIP válido o está dañado.` },
            { status: 400 }
          );
        }

        // Iterar entradas del ZIP
        const zipFileKeys = Object.keys(zip.files);
        for (const relativePath of zipFileKeys) {
          const zipEntry = zip.files[relativePath];

          // Filtrar directorios, carpetas ocultas y archivos irrelevantes de MacOS/Windows
          if (
            zipEntry.dir ||
            relativePath.includes("__MACOSX") ||
            relativePath.includes(".DS_Store") ||
            relativePath.startsWith(".") ||
            relativePath.endsWith("/")
          ) {
            continue;
          }

          // Solo procesar si termina en .xml (case-insensitive)
          if (!relativePath.toLowerCase().endsWith(".xml")) {
            continue;
          }

          if (xmlEntries.length >= MAX_XML_COUNT) {
            return NextResponse.json(
              {
                error: `El lote excede el límite máximo permitido de ${MAX_XML_COUNT} archivos XML. Divide tus archivos en lotes más pequeños.`,
              },
              { status: 413 }
            );
          }

          const xmlText = await zipEntry.async("text");
          const entryBytes = Buffer.byteLength(xmlText, "utf-8");
          totalBytesDescomprimidos += entryBytes;

          if (totalBytesDescomprimidos > MAX_UNCOMPRESSED_BYTES) {
            return NextResponse.json(
              {
                error: `El contenido descomprimido excede el límite de seguridad de 25 MB.`,
              },
              { status: 413 }
            );
          }

          xmlEntries.push({
            nombre: relativePath.split("/").pop() || relativePath,
            contenido: xmlText,
          });
        }
      } else if (fileNameLower.endsWith(".xml")) {
        // Caso B: Archivo XML suelto
        if (xmlEntries.length >= MAX_XML_COUNT) {
          return NextResponse.json(
            {
              error: `El lote excede el límite máximo permitido de ${MAX_XML_COUNT} archivos XML.`,
            },
            { status: 413 }
          );
        }

        const xmlText = await file.text();
        const entryBytes = Buffer.byteLength(xmlText, "utf-8");
        totalBytesDescomprimidos += entryBytes;

        if (totalBytesDescomprimidos > MAX_UNCOMPRESSED_BYTES) {
          return NextResponse.json(
            {
              error: `El contenido total excede el límite de seguridad de 25 MB.`,
            },
            { status: 413 }
          );
        }

        xmlEntries.push({
          nombre: file.name,
          contenido: xmlText,
        });
      } else {
        // Archivo no soportado
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.name}. Solo se aceptan archivos .xml o .zip.` },
          { status: 400 }
        );
      }
    }

    if (xmlEntries.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron comprobantes XML válidos dentro del archivo proporcionado." },
        { status: 400 }
      );
    }

    // 2. Procesar lote en chunks de CHUNK_SIZE (25 en 25)
    let nuevos = 0;
    let duplicados = 0;
    let invalidos = 0;
    let alertasEfos = 0;
    const errores: ErrorLoteItem[] = [];
    const efos: EfoLoteItem[] = [];

    for (let i = 0; i < xmlEntries.length; i += CHUNK_SIZE) {
      const chunk = xmlEntries.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (item) => {
          try {
            const res = await importarCfdiXml({
              organizationId: activeOrg.id,
              orgRfc: activeOrg.rfc,
              xmlContent: item.contenido,
              nombreArchivo: item.nombre,
            });

            if (res.status === "NUEVO") {
              nuevos++;
              if (res.alertaEfo) {
                alertasEfos++;
                efos.push({
                  rfc: res.invoice.emisorRfc,
                  razonSocial: res.invoice.emisorNombre,
                  situacion: "EFOS_DETECTADO",
                  uuid: res.invoice.uuid,
                });
              }
            } else if (res.status === "DUPLICADO") {
              duplicados++;
            } else {
              invalidos++;
              errores.push({
                archivo: item.nombre,
                error: res.error || "Estructura XML inválida",
              });
            }
          } catch (err: any) {
            invalidos++;
            errores.push({
              archivo: item.nombre,
              error: err?.message || "Error inesperado al procesar",
            });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      resumen: {
        totalEnZip: xmlEntries.length,
        procesados: xmlEntries.length,
        nuevos,
        duplicados,
        invalidos,
        alertasEfos,
      },
      errores,
      efos,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error general al procesar lote de archivos XML" },
      { status: 500 }
    );
  }
}
