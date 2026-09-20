"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Calendar, Loader2, FileQuestion, ArrowRight } from "lucide-react";

interface PeriodoSinXmlEmptyStateProps {
  nombreMes: string;
  year?: number;
  month?: number;
  currentYear?: number;
  currentMonth?: number;
  titulo?: string;
  descripcion?: string;
}

export function PeriodoSinXmlEmptyState(props: PeriodoSinXmlEmptyStateProps) {
  const router = useRouter();
  const year = props.year ?? props.currentYear ?? 2026;
  const month = props.month ?? props.currentMonth ?? 9;
  const { nombreMes, titulo, descripcion } = props;
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "success" | "error" } | null>(null);

  // Calcular un mes alternativo con datos (ej. si está en mes actual, sugerir mes anterior o viceversa)
  const esSeptiembre2026 = year === 2026 && month === 9;
  const targetYear = esSeptiembre2026 ? 2026 : 2026;
  const targetMonth = esSeptiembre2026 ? 8 : 9;
  const targetNombre = esSeptiembre2026 ? "Agosto 2026" : "Septiembre 2026";

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
          texto: data.message || "Comprobantes de prueba cargados exitosamente.",
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

  const handleCambiarMes = () => {
    router.push(`?year=${targetYear}&month=${targetMonth}`);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-4 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
        <FileQuestion className="w-6 h-6" />
      </div>

      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className="text-base font-bold text-slate-900">
          {titulo || `Sin comprobantes XML en ${nombreMes} ${year}`}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {descripcion ||
            `Este periodo fiscal no cuenta con facturas emitidas ni gastos registrados. Puedes cargar los comprobantes de prueba (fixtures) para simular la contabilidad de este mes, o alternar a otro periodo.`}
        </p>
      </div>

      {mensaje && (
        <div
          className={`max-w-md mx-auto p-3 rounded-xl text-xs font-medium ${
            mensaje.tipo === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleCargarFixtures}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-200" />
          )}
          <span>{loading ? "Cargando XMLs..." : "Cargar XMLs de Prueba (Fixtures)"}</span>
        </button>

        <button
          type="button"
          onClick={handleCambiarMes}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer transition-colors"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>Cambiar a {targetNombre}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
