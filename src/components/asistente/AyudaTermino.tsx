"use client";

import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useAsistente } from "./AsistenteContext";
import { GLOSARIO_SAT } from "@/lib/ayuda/guias";

interface AyudaTerminoProps {
  terminoId: string;
  children?: React.ReactNode;
  className?: string;
}

const ALIAS_MAP: Record<string, string> = {
  rfc: "rfc",
  cfdi: "cfdi-4-0",
  "cfdi-4.0": "cfdi-4-0",
  "cfdi-4-0": "cfdi-4-0",
  pue: "pue",
  ppd: "ppd",
  csd: "csd",
  efirma: "efirma",
  "e.firma": "efirma",
  isr: "isr",
  iva: "iva",
  resico: "resico",
  complemento: "complemento-pago",
  "complemento-pago": "complemento-pago",
  poliza: "poliza",
  "póliza": "poliza",
  balanza: "balanza",
};

export function AyudaTermino({ terminoId, children, className = "" }: AyudaTerminoProps) {
  const { abrirGlosarioTermino } = useAsistente();
  const [showTooltip, setShowTooltip] = useState(false);

  const idNormalizado = ALIAS_MAP[terminoId.toLowerCase()] || terminoId.toLowerCase();
  const ficha = GLOSARIO_SAT.find((g) => g.id.toLowerCase() === idNormalizado);
  const tituloTermino = ficha?.termino || terminoId;
  const descripcionCorta = ficha?.queEs || "Consulta la definición oficial en el Glosario SAT.";

  return (
    <span className={`inline-flex items-center gap-1 group relative ${className}`}>
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          abrirGlosarioTermino(idNormalizado);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Ayuda sobre ${tituloTermino}`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors focus:outline-none cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip flotante al pasar el cursor */}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 pointer-events-none animate-in fade-in duration-150 leading-tight text-center">
          <strong className="block text-emerald-400 font-bold mb-0.5">{tituloTermino}</strong>
          <span className="text-slate-200 line-clamp-2">{descripcionCorta}</span>
          <span className="block mt-1 text-[9px] text-slate-400 italic">Clic para ver en Glosario SAT</span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}
