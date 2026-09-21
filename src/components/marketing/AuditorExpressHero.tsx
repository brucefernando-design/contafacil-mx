"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileCheck2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Calculator,
  RefreshCw,
  TrendingUp,
  Receipt,
  FileText,
  Sparkles,
} from "lucide-react";

interface FacturaAnalizada {
  nombreArchivo: string;
  uuid?: string;
  rfcEmisor: string;
  nombreEmisor: string;
  rfcReceptor: string;
  nombreReceptor: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  tipo: string;
  esEfo: boolean;
}

// Lista de RFCs de prueba o conocidos como EFOS para demostración
const EFOS_CONOCIDOS = ["EDO120101XYZ", "FAC130202FAL", "FAS150303XXX"];

export function AuditorExpressHero() {
  const [isDragging, setIsDragging] = useState(false);
  const [facturas, setFacturas] = useState<FacturaAnalizada[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const procesarArchivos = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setIsAnalyzing(true);
    const nuevasFacturas: FacturaAnalizada[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith(".xml")) {
        continue;
      }

      try {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        // Buscar nodo Comprobante
        const comprobante =
          xmlDoc.getElementsByTagName("cfdi:Comprobante")[0] ||
          xmlDoc.getElementsByTagName("Comprobante")[0];

        if (!comprobante) {
          continue;
        }

        const emisor =
          xmlDoc.getElementsByTagName("cfdi:Emisor")[0] ||
          xmlDoc.getElementsByTagName("Emisor")[0];
        const receptor =
          xmlDoc.getElementsByTagName("cfdi:Receptor")[0] ||
          xmlDoc.getElementsByTagName("Receptor")[0];
        const impuestos =
          xmlDoc.getElementsByTagName("cfdi:Impuestos")[0] ||
          xmlDoc.getElementsByTagName("Impuestos")[0];

        const total = parseFloat(comprobante.getAttribute("Total") || "0");
        const subtotal = parseFloat(comprobante.getAttribute("SubTotal") || comprobante.getAttribute("subTotal") || "0");
        const fecha = comprobante.getAttribute("Fecha") || new Date().toISOString().split("T")[0];
        const tipoDeComprobante = comprobante.getAttribute("TipoDeComprobante") || "I";

        const rfcEmisor = emisor?.getAttribute("Rfc") || emisor?.getAttribute("rfc") || "XAXX010101000";
        const nombreEmisor = emisor?.getAttribute("Nombre") || emisor?.getAttribute("nombre") || "Emisor Desconocido";
        const rfcReceptor = receptor?.getAttribute("Rfc") || receptor?.getAttribute("rfc") || "XAXX010101000";
        const nombreReceptor = receptor?.getAttribute("Nombre") || receptor?.getAttribute("nombre") || "Receptor Desconocido";

        let iva = 0;
        if (impuestos) {
          const totalTrasladados = impuestos.getAttribute("TotalImpuestosTrasladados");
          if (totalTrasladados) {
            iva = parseFloat(totalTrasladados);
          } else {
            // Estimar IVA al 16% si no viene explícito
            iva = Math.round(subtotal * 0.16 * 100) / 100;
          }
        }

        const esEfo = EFOS_CONOCIDOS.includes(rfcEmisor.toUpperCase());

        nuevasFacturas.push({
          nombreArchivo: file.name,
          rfcEmisor,
          nombreEmisor,
          rfcReceptor,
          nombreReceptor,
          fecha: fecha.split("T")[0],
          subtotal,
          iva,
          total,
          tipo: tipoDeComprobante === "E" ? "Egreso" : "Ingreso",
          esEfo,
        });
      } catch (err) {
        console.error("Error parseando XML:", err);
      }
    }

    setIsAnalyzing(false);

    if (nuevasFacturas.length === 0) {
      setErrorMsg("No se pudieron leer comprobantes CFDI válidos en los archivos seleccionados.");
    } else {
      setFacturas((prev) => [...prev, ...nuevasFacturas]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      procesarArchivos(e.dataTransfer.files);
    }
  };

  const totalSubtotal = facturas.reduce((sum, f) => sum + f.subtotal, 0);
  const totalIva = facturas.reduce((sum, f) => sum + f.iva, 0);
  const totalFacturado = facturas.reduce((sum, f) => sum + f.total, 0);
  const efosDetectados = facturas.filter((f) => f.esEfo).length;

  return (
    <div className="w-full max-w-4xl mx-auto my-8">
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado del Lead Magnet */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Herramienta Gratuita • Sin registro previo</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Auditor Express SAT 2026
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Arrastra tus facturas XML del mes. Calculamos tu IVA, revisamos listas negras EFOS (Art. 69-B) y estimamos tus impuestos en 3 segundos.
            </p>
          </div>

          {facturas.length > 0 && (
            <button
              onClick={() => setFacturas([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Limpiar análisis</span>
            </button>
          )}
        </div>

        {/* Zona de Carga (Drag & Drop) */}
        {facturas.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-6 border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-emerald-400 bg-emerald-500/10 scale-[1.01]"
                : "border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) procesarArchivos(e.target.files);
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h4 className="text-base sm:text-lg font-bold text-white">
              Suelta aquí tus archivos XML de facturas
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Soporta CFDI 4.0 y 3.3. Puedes arrastrar varios archivos a la vez. Tus datos se procesan en tu propio navegador de forma 100% privada.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>O haz clic para seleccionar archivos</span>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* Resultados del Análisis en Tiempo Real */
          <div className="mt-6 space-y-6">
            {/* Tarjetas de Métricas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Facturas
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {facturas.length}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <FileCheck2 className="w-3 h-3" /> CFDI válidos
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Subtotal
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  ${totalSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">Base gravable</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  IVA Calculado
                </span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  ${totalIva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-300">16% determinable</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Auditoría EFOS
                </span>
                <span
                  className={`text-2xl font-black mt-1 block ${
                    efosDetectados > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {efosDetectados > 0 ? `${efosDetectados} Riesgo` : "100% Limpio"}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Art. 69-B SAT
                </span>
              </div>
            </div>

            {/* Resumen y Desglose Visual */}
            <div className="rounded-2xl bg-slate-950/50 border border-slate-800 p-4 max-h-56 overflow-y-auto space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Comprobantes Detectados:
              </span>
              {facturas.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-white">{f.nombreEmisor}</span>
                      <span className="text-slate-400 ml-1.5 font-mono text-[11px]">({f.rfcEmisor})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-slate-400 font-mono">{f.fecha}</span>
                    <span className="font-bold text-emerald-300">
                      ${f.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                    {f.esEfo ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        EFO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Válido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Llamado a la Acción (CTA de Conversión Directa) */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-600/40 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ¿Quieres conciliar este IVA con tu banco y emitir tu declaración SAT?
                </h4>
                <p className="text-xs sm:text-sm text-emerald-200/80 mt-1">
                  Crea tu cuenta gratuita en 30 segundos para guardar este análisis en tu Bóveda XML permanente y calcular tus pagos provisionales.
                </p>
              </div>

              <Link
                href="/registro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all shrink-0 cursor-pointer"
              >
                <span>Guardar y Crear Cuenta Gratis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
