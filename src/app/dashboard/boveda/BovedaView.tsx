"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Code,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";

interface InvoiceData {
  id: string;
  tipo: string;
  serie: string | null;
  folio: string | null;
  uuid: string;
  fecha: Date;
  metodoPago: string;
  formaPago: string;
  subtotal: number;
  total: number;
  totalIvaTrasladado: number;
  totalIsrRetenido: number;
  totalIvaRetenido: number;
  emisorRfc: string;
  emisorNombre: string;
  receptorRfc: string;
  receptorNombre: string;
  estatus: string;
  rawXml: string | null;
}

interface BovedaViewProps {
  initialInvoices: InvoiceData[];
  activeRfc: string;
}

export function BovedaView({ initialInvoices, activeRfc }: BovedaViewProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceData[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<"TODOS" | "EMITIDA" | "RECIBIDA">("TODOS");
  const [filterMetodo, setFilterMetodo] = useState<"TODOS" | "PUE" | "PPD">("TODOS");

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{
    text: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  const [selectedXml, setSelectedXml] = useState<{
    uuid: string;
    xml: string;
  } | null>(null);

  // Subir XML
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadMessage(null);

    let successCount = 0;
    let errors: string[] = [];
    let efosWarning: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith(".xml")) {
        errors.push(`${file.name}: No es un archivo XML.`);
        continue;
      }

      try {
        const text = await file.text();
        const res = await fetch("/api/cfdi/upload-xml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xmlContent: text }),
        });

        const data = await res.json();
        if (res.ok) {
          successCount++;
          if (data.alertaEfo) {
            efosWarning = `¡Alerta! La factura de ${data.invoice.emisorRfc} está en Lista Negra SAT 69-B.`;
          }
        } else {
          errors.push(`${file.name}: ${data.error}`);
        }
      } catch {
        errors.push(`${file.name}: Error de red al procesar.`);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      if (efosWarning) {
        setUploadMessage({
          type: "warning",
          text: `Se importaron ${successCount} factura(s). ${efosWarning}`,
        });
      } else {
        setUploadMessage({
          type: "success",
          text: `Se importaron ${successCount} factura(s) a la bóveda y se generaron sus pólizas contables.`,
        });
      }
      router.refresh();
    } else if (errors.length > 0) {
      setUploadMessage({
        type: "error",
        text: errors.join(" | "),
      });
    }

    // Reset input
    e.target.value = "";
  };

  // Filtrar facturas
  const filtered = invoices.filter((inv) => {
    if (filterTipo !== "TODOS" && inv.tipo !== filterTipo) return false;
    if (filterMetodo !== "TODOS" && inv.metodoPago !== filterMetodo) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchUuid = inv.uuid.toLowerCase().includes(term);
      const matchEmisor = inv.emisorNombre.toLowerCase().includes(term) || inv.emisorRfc.toLowerCase().includes(term);
      const matchReceptor = inv.receptorNombre.toLowerCase().includes(term) || inv.receptorRfc.toLowerCase().includes(term);
      const matchFolio = (inv.folio || "").toLowerCase().includes(term);
      return matchUuid || matchEmisor || matchReceptor || matchFolio;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/20 p-6 text-center transition-colors">
        <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">
          Cargar archivos CFDI 4.0 XML a la Bóveda
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Arrastra o selecciona tus archivos XML. El sistema parseará los impuestos SAT, validará contra la lista negra EFOS 69-B y creará las pólizas contables.
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors">
          <Plus className="w-4 h-4" />
          <span>{uploading ? "Procesando XMLs..." : "Seleccionar Archivos XML"}</span>
          <input
            type="file"
            multiple
            accept=".xml"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {uploadMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            uploadMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : uploadMessage.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{uploadMessage.text}</span>
          <button onClick={() => setUploadMessage(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por RFC, nombre o UUID..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-[11px] font-semibold text-slate-500 px-2">Tipo:</span>
            {(["TODOS", "EMITIDA", "RECIBIDA"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTipo(t)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  filterTipo === t
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "TODOS" ? "Todos" : t === "EMITIDA" ? "Emitidas" : "Recibidas"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-[11px] font-semibold text-slate-500 px-2">Método:</span>
            {(["TODOS", "PUE", "PPD"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMetodo(m)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  filterMetodo === m
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Facturas en Bóveda */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3 font-semibold">Folio / UUID</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Fecha</th>
                <th className="px-6 py-3 font-semibold">Emisor / Receptor</th>
                <th className="px-6 py-3 font-semibold">Método</th>
                <th className="px-6 py-3 font-semibold text-right">Subtotal</th>
                <th className="px-6 py-3 font-semibold text-right">IVA</th>
                <th className="px-6 py-3 font-semibold text-right">Total</th>
                <th className="px-6 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No se encontraron comprobantes fiscales que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const esEmitida = inv.tipo === "EMITIDA";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-mono font-bold text-slate-900">
                          {inv.serie ? `${inv.serie}-` : ""}{inv.folio || "S/F"}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={inv.uuid}>
                          {inv.uuid}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            esEmitida
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {esEmitida ? "Emitida" : "Recibida"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                        {formatDate(inv.fecha)}
                      </td>
                      <td className="px-6 py-3.5 max-w-xs">
                        {esEmitida ? (
                          <div>
                            <div className="font-medium text-slate-900 truncate" title={inv.receptorNombre}>
                              {inv.receptorNombre}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">{inv.receptorRfc}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-900 truncate" title={inv.emisorNombre}>
                              {inv.emisorNombre}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">{inv.emisorRfc}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            inv.metodoPago === "PUE"
                              ? "bg-slate-100 text-slate-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {inv.metodoPago}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-700">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-700">
                        {formatCurrency(inv.totalIvaTrasladado)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.rawXml && (
                            <button
                              onClick={() => setSelectedXml({ uuid: inv.uuid, xml: inv.rawXml! })}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Ver código XML"
                            >
                              <Code className="w-4 h-4" />
                            </button>
                          )}
                          <Link
                            href={`/dashboard/facturas/${inv.id}/pdf`}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Ver Representación Impresa (PDF)"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          {inv.rawXml && (
                            <a
                              href={`data:text/xml;charset=utf-8,${encodeURIComponent(inv.rawXml)}`}
                              download={`CFDI40_${inv.uuid}.xml`}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                              title="Descargar archivo XML"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visor de XML Modal */}
      {selectedXml && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Visor de XML CFDI 4.0
                </h3>
                <span className="font-mono text-[10px] text-slate-400">
                  UUID: {selectedXml.uuid}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedXml.xml);
                    alert("XML copiado al portapapeles");
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Copiar XML"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`data:text/xml;charset=utf-8,${encodeURIComponent(selectedXml.xml)}`}
                  download={`CFDI40_${selectedXml.uuid}.xml`}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedXml(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 font-mono text-xs text-emerald-300 bg-slate-900/90 whitespace-pre leading-relaxed">
              {selectedXml.xml}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
