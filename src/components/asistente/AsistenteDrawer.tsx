"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  HelpCircle,
  X,
  BookOpen,
  CheckSquare,
  FileQuestion,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { useAsistente } from "./AsistenteContext";
import {
  GUIAS_PANTALLAS,
  GLOSARIO_SAT,
  CHECKLIST_INICIO,
  FAQ_ASISTENTE,
  PantallaGuia,
} from "@/lib/ayuda/guias";

export function AsistenteDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    selectedTermId,
    iniciarTour,
  } = useAsistente();

  const [busquedaGlosario, setBusquedaGlosario] = useState("");
  const [seccionGlosario, setSeccionGlosario] = useState<"terminos" | "faq">("terminos");
  const [checklistCompletados, setChecklistCompletados] = useState<Record<string, boolean>>({});
  const [faqAbiertas, setFaqAbiertas] = useState<Record<string, boolean>>({});

  // Cargar checklist de localStorage
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("cfmx_checklist_estado");
      if (guardado) {
        setChecklistCompletados(JSON.parse(guardado));
      }
    } catch {
      // Ignorar fallas
    }
  }, []);

  // Manejar cierre con tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Desplazar automáticamente al término seleccionado en Glosario
  useEffect(() => {
    if (selectedTermId && activeTab === "glosario" && isOpen) {
      setTimeout(() => {
        const el = document.getElementById(`glosario-${selectedTermId.toLowerCase()}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [selectedTermId, activeTab, isOpen]);

  // Obtener guía de la pantalla actual
  const guiaActual: PantallaGuia = useMemo(() => {
    if (!pathname) return GUIAS_PANTALLAS["/dashboard"];

    // Buscar coincidencia exacta
    if (GUIAS_PANTALLAS[pathname]) {
      return GUIAS_PANTALLAS[pathname];
    }

    // Buscar por prefijo
    const rutaEncontrada = Object.keys(GUIAS_PANTALLAS).find(
      (r) => r !== "/dashboard" && pathname.startsWith(r)
    );

    if (rutaEncontrada) {
      return GUIAS_PANTALLAS[rutaEncontrada];
    }

    return GUIAS_PANTALLAS["/dashboard"];
  }, [pathname]);

  // Filtrar glosario por búsqueda
  const terminosFiltrados = useMemo(() => {
    if (!busquedaGlosario.trim()) return GLOSARIO_SAT;
    const q = busquedaGlosario.toLowerCase();
    return GLOSARIO_SAT.filter(
      (t) =>
        t.termino.toLowerCase().includes(q) ||
        t.queEs.toLowerCase().includes(q) ||
        t.paraQue.toLowerCase().includes(q) ||
        t.ejemplo.toLowerCase().includes(q)
    );
  }, [busquedaGlosario]);

  // Filtrar FAQ por búsqueda
  const faqsFiltradas = useMemo(() => {
    if (!busquedaGlosario.trim()) return FAQ_ASISTENTE;
    const q = busquedaGlosario.toLowerCase();
    return FAQ_ASISTENTE.filter(
      (f) => f.pregunta.toLowerCase().includes(q) || f.respuesta.toLowerCase().includes(q)
    );
  }, [busquedaGlosario]);

  const toggleChecklistItem = (id: string) => {
    const nuevo = { ...checklistCompletados, [id]: !checklistCompletados[id] };
    setChecklistCompletados(nuevo);
    try {
      localStorage.setItem("cfmx_checklist_estado", JSON.stringify(nuevo));
    } catch {
      // Ignorar fallas
    }
  };

  const reiniciarChecklist = () => {
    setChecklistCompletados({});
    try {
      localStorage.removeItem("cfmx_checklist_estado");
    } catch {
      // Ignorar
    }
  };

  const progresoChecklist = useMemo(() => {
    const total = CHECKLIST_INICIO.length;
    const completados = CHECKLIST_INICIO.filter((c) => checklistCompletados[c.id]).length;
    return { completados, total, porcentaje: Math.round((completados / total) * 100) };
  }, [checklistCompletados]);

  const toggleFaq = (id: string) => {
    setFaqAbiertas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {/* BOTÓN FLOTANTE PERMANENTE (ESQUINA INFERIOR DERECHA) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 group animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-700/30 hover:shadow-emerald-700/50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Abrir Asistente ContaFácil"
          >
            <HelpCircle className="w-4 h-4 text-emerald-100" />
            <span>Asistente ContaFácil</span>
            <span className="bg-emerald-700 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
              ¿Cómo uso esto?
            </span>
          </button>
        </div>
      )}

      {/* BACKDROP PARA DISPOSITIVOS MÓVILES */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-40 sm:hidden animate-in fade-in"
        />
      )}

      {/* DRAWER LATERAL DERECHO (~420px) */}
      {isOpen && (
        <aside
          className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-250"
          aria-label="Panel Asistente ContaFácil"
        >
          {/* HEADER DEL ASISTENTE */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Asistente ContaFácil
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono font-normal border border-emerald-800">
                    es-MX
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">Guía práctica sin complicaciones fiscales</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar asistente (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SELECTOR DE PESTAÑAS (3 Pestañas obligatorias) */}
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("guia")}
              className={`py-3 px-2 text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 ${
                activeTab === "guia"
                  ? "border-emerald-600 text-emerald-800 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guía Pantalla</span>
            </button>

            <button
              onClick={() => setActiveTab("recorrido")}
              className={`py-3 px-2 text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 ${
                activeTab === "recorrido"
                  ? "border-emerald-600 text-emerald-800 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Recorrido</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                {progresoChecklist.completados}/{progresoChecklist.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("glosario")}
              className={`py-3 px-2 text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 ${
                activeTab === "glosario"
                  ? "border-emerald-600 text-emerald-800 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Glosario SAT</span>
            </button>
          </div>

          {/* CONTENIDO SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">
            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 1: GUÍA DE ESTA PANTALLA                              */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "guia" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* TÍTULO Y RUTA */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Pantalla actual: {pathname}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                    {guiaActual.titulo}
                  </h3>
                </div>

                {/* PARA QUÉ SIRVE ESTA PÁGINA */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] text-emerald-800">
                    Para qué sirve esta página
                  </h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    {guiaActual.paraQue}
                  </p>
                </div>

                {/* QUÉ SIGNIFICA CADA BLOQUE / BOTÓN */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] text-emerald-800">
                    Qué significa cada bloque o botón
                  </h4>
                  <div className="space-y-2">
                    {guiaActual.bloques.map((b, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="font-bold text-slate-800">{b.nombre}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                          {b.descripcion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* QUÉ HACER AHORA (3 A 5 PASOS) */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] text-emerald-800">
                    Qué hacer ahora
                  </h4>
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/60 space-y-1.5">
                    {guiaActual.queHacerAhora.map((paso, idx) => (
                      <div key={idx} className="text-slate-700 leading-normal">
                        {paso}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ERRORES FRECUENTES */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Errores frecuentes a evitar</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 bg-amber-50/50 p-3 rounded-lg border border-amber-200/70 text-amber-950">
                    {guiaActual.erroresFrecuentes.map((err, idx) => (
                      <li key={idx} className="leading-normal">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CUÁNDO SÍ NECESITAS UN CONTADOR */}
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300/70 space-y-1">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cuándo SÍ necesitas a un contador:</span>
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {guiaActual.cuandoSiContador}
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 2: RECORRIDO PASO A PASO                              */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "recorrido" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Usa el sistema por primera vez
                    </h3>
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {progresoChecklist.porcentaje}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Completa este checklist interactivo para dominar las funciones esenciales de ContaFácil MX.
                  </p>

                  {/* Barra de progreso */}
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="bg-emerald-600 h-1.5 transition-all duration-300"
                      style={{ width: `${progresoChecklist.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* LISTA DEL CHECKLIST */}
                <div className="space-y-2">
                  {CHECKLIST_INICIO.map((item) => {
                    const completado = !!checklistCompletados[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          completado
                            ? "bg-emerald-50/60 border-emerald-300 text-slate-500"
                            : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={completado}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <div className="flex-1">
                            <div
                              className={`font-semibold text-xs ${
                                completado ? "line-through text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {item.texto}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                              {item.descripcion}
                            </div>
                            {item.rutaSugerida && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(item.rutaSugerida!);
                                  setIsOpen(false);
                                }}
                                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                              >
                                <span>Ir a la pantalla</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ACCIONES DEL CHECKLIST */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={reiniciarChecklist}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reiniciar checklist</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      iniciarTour();
                    }}
                    className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Repetir Tour de 7 Pasos</span>
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 3: GLOSARIO SAT Y FAQ                                 */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "glosario" && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* BUSCADOR */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busquedaGlosario}
                    onChange={(e) => setBusquedaGlosario(e.target.value)}
                    placeholder="Buscar término SAT o pregunta..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                  {busquedaGlosario && (
                    <button
                      onClick={() => setBusquedaGlosario("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* SUB-PESTAÑAS: FICHAS VS FAQ */}
                <div className="flex rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
                  <button
                    onClick={() => setSeccionGlosario("terminos")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      seccionGlosario === "terminos"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Fichas SAT ({terminosFiltrados.length})
                  </button>
                  <button
                    onClick={() => setSeccionGlosario("faq")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      seccionGlosario === "faq"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Preguntas Frecuentes ({faqsFiltradas.length})
                  </button>
                </div>

                {/* LISTA DE TÉRMINOS */}
                {seccionGlosario === "terminos" && (
                  <div className="space-y-2.5">
                    {terminosFiltrados.map((item) => {
                      const isHighlighted =
                        selectedTermId?.toLowerCase() === item.id.toLowerCase();

                      return (
                        <div
                          key={item.id}
                          id={`glosario-${item.id}`}
                          className={`p-3 rounded-xl border transition-all ${
                            isHighlighted
                              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/30"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900">
                              {item.termino}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                              SAT
                            </span>
                          </div>

                          <div className="space-y-1.5 text-[11px] text-slate-600 mt-2">
                            <div>
                              <strong className="text-slate-800">Qué es: </strong>
                              {item.queEs}
                            </div>
                            <div>
                              <strong className="text-slate-800">Para qué sirve: </strong>
                              {item.paraQue}
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-100 text-slate-700">
                              <strong className="text-emerald-700">Ejemplo: </strong>
                              {item.ejemplo}
                            </div>
                            <div className="text-amber-900 bg-amber-50/60 p-2 rounded border border-amber-200/60">
                              <strong>Error común: </strong>
                              {item.errorComun}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {terminosFiltrados.length === 0 && (
                      <div className="p-6 text-center text-slate-400">
                        No encontramos ese término. Recuerda que no inventamos criterios; si tienes dudas fiscales particulares, consúltalo con tu contador.
                      </div>
                    )}
                  </div>
                )}

                {/* LISTA DE FAQ */}
                {seccionGlosario === "faq" && (
                  <div className="space-y-2">
                    {faqsFiltradas.map((faq) => {
                      const abierta = !!faqAbiertas[faq.id];
                      return (
                        <div
                          key={faq.id}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(faq.id)}
                            className="w-full p-3 text-left font-bold text-xs text-slate-900 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <span>{faq.pregunta}</span>
                            {abierta ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                            )}
                          </button>
                          {abierta && (
                            <div className="p-3 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                              {faq.respuesta}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {faqsFiltradas.length === 0 && (
                      <div className="p-6 text-center text-slate-400">
                        No se encontraron preguntas que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER DEL DRAWER */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 text-center shrink-0">
            ContaFácil MX • Cumplimiento SAT 2026 • Contenido informativo local
          </div>
        </aside>
      )}
    </>
  );
}
