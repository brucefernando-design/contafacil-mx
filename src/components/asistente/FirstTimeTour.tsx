"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Building2,
  Receipt,
  FolderArchive,
  Scale,
  Calculator,
  HelpCircle,
} from "lucide-react";
import { TOUR_PRIMERA_VISITA } from "@/lib/ayuda/guias";
import { useAsistente } from "./AsistenteContext";

const ICONOS_TOUR = [
  Sparkles,
  Building2,
  Receipt,
  FolderArchive,
  Scale,
  Calculator,
  HelpCircle,
];

export function FirstTimeTour() {
  const { tourActivo, setTourActivo, setIsOpen, setActiveTab } = useAsistente();
  const [pasoActual, setPasoActual] = useState(0);

  if (!tourActivo) return null;

  const paso = TOUR_PRIMERA_VISITA[pasoActual];
  const IconoActual = ICONOS_TOUR[pasoActual] || Sparkles;
  const esUltimo = pasoActual === TOUR_PRIMERA_VISITA.length - 1;

  const cerrarTour = () => {
    try {
      localStorage.setItem("cfmx_tour_visto", "1");
    } catch {
      // Ignorar fallas
    }
    setTourActivo(false);
  };

  const handleSiguiente = () => {
    if (esUltimo) {
      cerrarTour();
      setIsOpen(true);
      setActiveTab("guia");
    } else {
      setPasoActual((prev) => prev + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header con barra de progreso */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <IconoActual className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Paso {paso.paso} de {TOUR_PRIMERA_VISITA.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">Tour de Bienvenida</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {paso.titulo}
              </h3>
            </div>
          </div>
          <button
            onClick={cerrarTour}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Cerrar tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso interactiva */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-emerald-600 h-1.5 transition-all duration-300 ease-out"
            style={{
              width: `${((pasoActual + 1) / TOUR_PRIMERA_VISITA.length) * 100}%`,
            }}
          />
        </div>

        {/* Contenido principal */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {paso.descripcion}
          </p>

          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-950 font-medium flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{paso.destacado}</span>
          </div>
        </div>

        {/* Footer con navegación */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={cerrarTour}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Saltar tour
          </button>

          <div className="flex items-center gap-2">
            {pasoActual > 0 && (
              <button
                type="button"
                onClick={handleAnterior}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSiguiente}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shadow-emerald-700/20 inline-flex items-center gap-2"
            >
              <span>{esUltimo ? "Comenzar a Usar EasyConta" : "Siguiente"}</span>
              {esUltimo ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
