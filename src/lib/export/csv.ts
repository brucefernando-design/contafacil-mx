/**
 * Utilidades de exportación CSV compatibles con Microsoft Excel en español (México).
 * Incluye BOM UTF-8 (\uFEFF) para visualización correcta de acentos, tildes y caracteres especiales.
 */

function escaparCampo(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '""';
  const str = String(valor);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Genera la cadena de texto CSV a partir de encabezados y filas.
 */
export function generarCsvString(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lineas: string[] = [];

  // Encabezados
  lineas.push(headers.map(escaparCampo).join(","));

  // Filas
  for (const row of rows) {
    lineas.push(row.map(escaparCampo).join(","));
  }

  // BOM UTF-8 al inicio para que Excel en Windows y Mac reconozca la codificación
  return "\uFEFF" + lineas.join("\r\n");
}

/**
 * Dispara la descarga del archivo CSV en el navegador del usuario.
 */
export function descargarCsvEnNavegador(
  nombreArchivo: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const contenido = generarCsvString(headers, rows);
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.setAttribute("href", url);
  enlace.setAttribute("download", nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`);
  enlace.style.visibility = "hidden";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
