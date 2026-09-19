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

  return (
    <div className="space-y-6">
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
            Opinión de Cumplimiento de Obligaciones Fiscales
          </h3>
          <p className="text-xs text-slate-600">
            {activeOrg.opinionCumplimiento === "POSITIVA"
              ? "Tu RFC se encuentra al corriente en la presentación de pagos provisionales y declaraciones informativas (DIOT). Apto para licitaciones públicas y contratos corporativos."
              : "El SAT ha detectado inconsistencias o declaraciones omitidas. Existe riesgo inminente de restricción temporal del Certificado de Sello Digital (CSD)."}
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Última verificación SAT: Hoy</span>
            <span className="font-semibold text-emerald-700">Verificado vía CIEC Mock</span>
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
            Monitoreo de No Inclusión en Listas Negras (EFOS)
          </h3>
          <p className="text-xs text-slate-600">
            Tu RFC no figura en ningún listado del Diario Oficial de la Federación (DOF) como empresa que factura operaciones simuladas (EFOS). Todas tus facturas conservan plenos efectos fiscales.
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Listado DOF actualizado a: Septiembre 2026</span>
            <span className="font-semibold text-slate-700">100% Conforme</span>
          </div>
        </div>
      </div>

      {/* Buscador Preventivo de Proveedores / RFCs en Lista Negra 69-B */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Buscador Preventivo de Proveedores (Lista Negra 69-B SAT / DOF)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingresa el RFC de cualquier cliente o proveedor antes de pagarle o contratarlo para evitar sanciones fiscales
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
              placeholder="Ejemplo: FSO160412KJ9 o KCM8403217U4..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Auditar RFC en DOF
          </button>
        </form>

        {/* Resultado de Búsqueda */}
        {searchResult && (
          <div className="pt-2">
            {searchResult.esEfo && searchResult.data ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  ¡ALERTA MÁXIMA! RFC LISTADO EN ARTÍCULO 69-B (EFOS)
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
                  Consecuencia: Los comprobantes fiscales expedidos por este contribuyente no producen ni produjeron efecto fiscal alguno. Cualquier deducción o acreditamiento de IVA será rechazada por el SAT.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm">RFC Limpio de Listas Negras</div>
                  <span className="text-slate-600">
                    El RFC <strong>{searchRfc}</strong> no figura en los listados de EFOS definitivos ni presuntos del DOF. Es seguro operar comercialmente.
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
