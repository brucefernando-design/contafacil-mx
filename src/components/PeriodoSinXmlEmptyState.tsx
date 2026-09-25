"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles, Calendar, Loader2, FileQuestion, PlayCircle, ChevronDown, HelpCircle } from "lucide-react";
import { useAsistente } from "@/components/asistente/AsistenteContext";

interface PeriodoSinXmlEmptyStateProps {
  nombreMes: string;
  year?: number;
  month?: number;
  currentYear?: number;
  currentMonth?: number;
  titulo?: string;
  descripcion?: string;
}

const MESES = [
  { num: 1, nombre: "Enero" },
  { num: 2, nombre: "Febrero" },
  { num: 3, nombre: "Marzo" },
  { num: 4, nombre: "Abril" },
  { num: 5, nombre: "Mayo" },
  { num: 6, nombre: "Junio" },
  { num: 7, nombre: "Julio" },
  { num: 8, nombre: "Agosto" },
  { num: 9, nombre: "Septiembre" },
  { num: 10, nombre: "Octubre" },
  { num: 11, nombre: "Noviembre" },
  { num: 12, nombre: "Diciembre" },
];

export function PeriodoSinXmlEmptyState(props: PeriodoSinXmlEmptyStateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const year = props.year ?? props.currentYear ?? 2026;
  const month = props.month ?? props.currentMonth ?? 9;
  const { nombreMes, titulo, descripcion } = props;

  const [loading, setLoading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "success" | "error" } | null>(null);
  const { abrirAsistente } = useAsistente();

  const handleCargarFixtures = async () => {
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/fixtures/load?year=${year}&month=${month}`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje({
          texto: data.message || `Comprobantes de prueba para ${nombreMes} ${year} cargados exitosamente.`,
          tipo: "success",
        });
        router.refresh();
      } else {
        setMensaje({
          texto: data.error || "No se pudieron cargar los fixtures.",
          tipo: "error",
        });
      }
    } catch {
      setMensaje({
        texto: "Error de red al intentar cargar fixtures.",
        tipo: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIrASep2026 = () => {
    router.push(`${pathname}?year=2026&month=9`);
  };

  const handleSelectMonth = (m: number) => {
    setShowMonthPicker(false);
    router.push(`${pathname}?year=${year}&month=${m}`);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-amber-200 p-8 text-center space-y-5 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
        <FileQuestion className="w-7 h-7" />
      </div>

      <div className="max-w-lg mx-auto space-y-2">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          {titulo || "Este mes no tiene comprobantes"}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {descripcion ||
            `No se registran facturas emitidas ni gastos XML en ${nombreMes} ${year}. Sube tus archivos XML a la Bóveda o emite facturas para calcular automáticamente los impuestos del periodo.`}
        </p>
      </div>

      {mensaje && (
        <div
          className={`max-w-md mx-auto p-3 rounded-xl text-xs font-semibold ${
            mensaje.tipo === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Botones de acción requeridos */}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        {/* Botón 1: Ir a Bóveda XML */}
        <button
          type="button"
          onClick={() => router.push("/dashboard/boveda")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-all"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>Subir XMLs a Bóveda</span>
        </button>

        {/* Botón 2: Nueva Factura CFDI */}
        <button
          type="button"
          onClick={() => router.push("/dashboard/facturacion")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-all"
        >
          <PlayCircle className="w-4 h-4 text-indigo-200" />
          <span>Emitir Factura CFDI</span>
        </button>

        {/* Botón 3: Cambiar periodo */}
        <button
          type="button"
          onClick={() => setShowMonthPicker(!showMonthPicker)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer transition-colors"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Cambiar periodo</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showMonthPicker ? "rotate-180" : ""}`} />
        </button>

        {/* Botón 4: Ayuda en Asistente SAT */}
        <button
          type="button"
          onClick={() => abrirAsistente("pantalla")}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs border border-slate-700 cursor-pointer transition-colors shadow-xs"
        >
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Ayuda en Asistente SAT</span>
        </button>
      </div>

      {/* Selector de meses interactivo cuando se presiona Cambiar periodo */}
      {showMonthPicker && (
        <div className="max-w-md mx-auto pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Seleccionar mes para el ejercicio {year}:
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MESES.map((m) => {
              const isSelected = m.num === month;
              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => handleSelectMonth(m.num)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {m.nombre.slice(0, 3)}
                  {m.num === 8 || m.num === 9 ? (
                    <span className="block text-[9px] text-emerald-600 font-bold">Datos</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
