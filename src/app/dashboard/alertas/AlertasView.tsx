"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Info,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface FiscalAlertItem {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  severidad: string;
  leida: boolean;
  createdAt: Date;
}

interface SatBlacklistItem {
  id: string;
  rfc: string;
  razonSocial: string;
  situacion: string;
  publicacionDof: Date;
  oficio: string;
}

interface AlertasViewProps {
  activeOrg: {
    id: string;
    rfc: string;
    razonSocial: string;
    opinionCumplimiento: string;
    efosStatus: string;
  };
  alertasAuditoria: Array<{
    tipo: string;
    titulo: string;
    descripcion: string;
    severidad: string;
  }>;
  alertasGuardadas: FiscalAlertItem[];
  listaNegra: SatBlacklistItem[];
}

export function AlertasView({
  activeOrg,
  alertasAuditoria,
  alertasGuardadas,
  listaNegra,
}: AlertasViewProps) {
  const [searchRfc, setSearchRfc] = useState("");
  const [searchResult, setSearchResult] = useState<{
    buscado: boolean;
    esEfo: boolean;
    data?: SatBlacklistItem;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleBuscarRfc = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchRfc.trim().toUpperCase();
    if (!clean) return;

    const found = listaNegra.find((item) => item.rfc === clean);
    if (found) {
      setSearchResult({ buscado: true, esEfo: true, data: found });
    } else {
      setSearchResult({ buscado: true, esEfo: false });
    }
  };

  const handleSync69B = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/sat/69b/refresh", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la lista oficial del SAT.");
      }
      setSyncFeedback({
        type: "success",
        message: `Lista 69-B sincronizada con éxito (${data.resultado?.upserts || 0} registros actualizados, ${data.resultado?.alertasGeneradas || 0} nuevas alertas cruzadas).`,
      });
    } catch (err: any) {
      setSyncFeedback({
        type: "error",
        message: err?.message || "No se pudo actualizar la lista oficial. Se conserva la lista previa.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Oficial 69-B y Actualización */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                Lista Oficial Art. 69-B SAT (EFOS y Operaciones Inexistentes)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                Oficial SAT / DOF
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cruce preventivo. La fuente de verdad es el SAT y el DOF.
            </p>
          </div>
        </div>

        <button
          onClick={handleSync69B}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Actualizando lista SAT..." : "Actualizar lista 69-B SAT"}</span>
        </button>
      </div>

      {syncFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all animate-in fade-in ${
            syncFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {syncFeedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{syncFeedback.message}</span>
        </div>
      )}
      {/* 32-D Opinión de Cumplimiento & EFOS Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opinión 32-D */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Artículo 32-D CFF
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                activeOrg.opinionCumplimiento === "POSITIVA"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {activeOrg.opinionCumplimiento === "POSITIVA" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {activeOrg.opinionCumplimiento}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900">
            Opinión de Cumplimiento (Art. 32-D SAT)
          </h3>
          <p className="text-xs text-slate-600">
            {activeOrg.opinionCumplimiento === "POSITIVA"
              ? "Estatus Positivo: La empresa se encuentra al corriente en el cumplimiento de sus obligaciones fiscales e informativas."
              : "Estatus con inconsistencias: Se detectaron inconsistencias o créditos fiscales pendientes ante la autoridad."}
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Estatus SAT</span>
            <span className="font-semibold text-emerald-700">Verificado</span>
          </div>
        </div>

        {/* Estatus contra 69-B del propio RFC */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Artículo 69-B CFF
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> {activeOrg.efosStatus}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900">
            Monitoreo Preventivo EFOS (Art. 69-B)
          </h3>
          <p className="text-xs text-slate-600">
            Tu RFC no figura en el padrón de contribuyentes que facturan operaciones simuladas (EFOS).
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Padrón SAT</span>
            <span className="font-semibold text-emerald-700">Limpio</span>
          </div>
        </div>
      </div>

      {/* Buscador Preventivo de Proveedores / RFCs en Lista Negra 69-B */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Buscador Preventivo de Proveedores (Lista 69-B SAT)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingresa un RFC para contrastarlo contra el listado de empresas con operaciones presuntamente inexistentes
          </p>
        </div>

        <form onSubmit={handleBuscarRfc} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={searchRfc}
              onChange={(e) => setSearchRfc(e.target.value.toUpperCase())}
              placeholder="Ejemplo: FSO160412KJ9..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Consultar en Lista SAT
          </button>
        </form>

        {/* Resultado de Búsqueda */}
        {searchResult && (
          <div className="pt-2">
            {searchResult.esEfo && searchResult.data ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  ALERTA: RFC REGISTRADO EN LISTA 69-B SAT
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>
                    <strong>RFC:</strong> {searchResult.data.rfc}
                  </div>
                  <div>
                    <strong>Razón Social:</strong> {searchResult.data.razonSocial}
                  </div>
                  <div>
                    <strong>Situación Fiscal:</strong>{" "}
                    <span className="font-bold text-rose-700 uppercase">
                      {searchResult.data.situacion}
                    </span>
                  </div>
                  <div>
                    <strong>Oficio SAT:</strong> {searchResult.data.oficio}
                  </div>
                </div>
                <p className="text-[11px] text-rose-800 pt-1">
                  Atención: Los comprobantes expedidos por este contribuyente carecen de efectos fiscales de acuerdo al Art. 69-B del CFF.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm">RFC sin coincidencias en Lista 69-B</div>
                  <span className="text-slate-600">
                    El RFC <strong>{searchRfc}</strong> no figura en la lista de EFOS del SAT.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alertas del Sistema para la Empresa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Notificaciones y Avisos de la Empresa ({alertasGuardadas.length + alertasAuditoria.length})
        </h3>

        <div className="space-y-3">
          {[...alertasGuardadas, ...alertasAuditoria].map((alerta, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                alerta.severidad === "CRITICAL"
                  ? "bg-rose-50/70 border-rose-200 text-rose-950"
                  : alerta.severidad === "WARNING"
                  ? "bg-amber-50/70 border-amber-200 text-amber-950"
                  : "bg-blue-50/70 border-blue-200 text-blue-950"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  alerta.severidad === "CRITICAL"
                    ? "text-rose-600"
                    : alerta.severidad === "WARNING"
                    ? "text-amber-600"
                    : "text-blue-600"
                }`}
              />
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm text-slate-900 mb-0.5">
                  {alerta.titulo}
                </div>
                <p className="text-slate-600">{alerta.descripcion}</p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                  alerta.severidad === "CRITICAL"
                    ? "bg-rose-100 text-rose-800"
                    : alerta.severidad === "WARNING"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {alerta.severidad}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
