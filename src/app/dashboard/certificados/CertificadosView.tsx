"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  FileCode,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Info,
  ExternalLink,
  Sparkles,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";
import { useAsistente } from "@/components/asistente/AsistenteContext";

interface CertificadoRecord {
  id: string;
  tipo: string;
  rfc: string;
  noCertificado: string | null;
  validoDesde: string | null;
  validoHasta: string | null;
  activo: boolean;
  createdAt: string;
}

interface CertificadosViewProps {
  activeOrg: {
    id: string;
    rfc: string;
    razonSocial: string;
    csdStatus?: string | null;
    csdNoCertificado?: string | null;
    csdVencimiento?: string | null;
  };
  initialCertificates: CertificadoRecord[];
}

export function CertificadosView({
  activeOrg,
  initialCertificates,
}: CertificadosViewProps) {
  const { abrirAsistente } = useAsistente();
  const [certificados, setCertificados] = useState<CertificadoRecord[]>(initialCertificates);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<"CSD" | "EFIRMA">("CSD");

  // Formulario de carga
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [passwordKey, setPasswordKey] = useState("");
  const [noCertificado, setNoCertificado] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Convertir archivo a Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Quitar encabezado data:*/*;base64,
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubirCertificado = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeExito(null);
    setMensajeError(null);

    if (!cerFile || !keyFile || !passwordKey) {
      setMensajeError("Debes seleccionar ambos archivos (.cer y .key) e ingresar la contraseña de la llave.");
      return;
    }

    // Regla de extensión
    if (!cerFile.name.toLowerCase().endsWith(".cer")) {
      setMensajeError("El primer archivo debe tener extensión .cer");
      return;
    }
    if (!keyFile.name.toLowerCase().endsWith(".key")) {
      setMensajeError("El segundo archivo debe tener extensión .key");
      return;
    }

    // Regla de tamaño máximo: 20 KB
    const MAX_BYTES = 20 * 1024;
    if (cerFile.size > MAX_BYTES) {
      setMensajeError(`El archivo .cer supera los 20 KB permitidos (${(cerFile.size / 1024).toFixed(1)} KB).`);
      return;
    }
    if (keyFile.size > MAX_BYTES) {
      setMensajeError(`El archivo .key supera los 20 KB permitidos (${(keyFile.size / 1024).toFixed(1)} KB).`);
      return;
    }

    setLoading(true);

    try {
      const cerBase64 = await fileToBase64(cerFile);
      const keyBase64 = await fileToBase64(keyFile);

      const res = await fetch("/api/certificates/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoSeleccionado,
          cerBase64,
          keyBase64,
          passwordKey,
          noCertificado: noCertificado || undefined,
          cerFileName: cerFile.name,
          keyFileName: keyFile.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cifrar y guardar el certificado.");
      }

      setMensajeExito(data.message);
      setCertificados((prev) => [
        {
          id: data.certificado.id,
          tipo: data.certificado.tipo,
          rfc: data.certificado.rfc,
          noCertificado: data.certificado.noCertificado,
          validoDesde: new Date().toISOString(),
          validoHasta: data.certificado.validoHasta,
          activo: true,
          createdAt: new Date().toISOString(),
        },
        ...prev.map((c) =>
          c.tipo === tipoSeleccionado ? { ...c, activo: false } : c
        ),
      ]);

      // Limpiar formulario
      setCerFile(null);
      setKeyFile(null);
      setPasswordKey("");
      setNoCertificado("");
    } catch (err: unknown) {
      setMensajeError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCertificado = async (tipo: "CSD" | "EFIRMA") => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el certificado ${tipo} de la bóveda criptográfica? Esta acción no se puede deshacer.`)) {
      return;
    }
    setLoading(true);
    setMensajeExito(null);
    setMensajeError(null);
    try {
      const res = await fetch(`/api/certificates/upload?tipo=${tipo}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error al eliminar el certificado ${tipo}`);
      }
      setMensajeExito(data.message);
      setCertificados((prev) => prev.filter((c) => c.tipo !== tipo));
    } catch (err: unknown) {
      setMensajeError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const csdActivo = certificados.find((c) => c.tipo === "CSD" && c.activo);
  const efirmaActiva = certificados.find((c) => c.tipo === "EFIRMA" && c.activo);

  return (
    <div className="space-y-6">
      {/* TARJETAS RESUMEN: CSD VS E.FIRMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tarjeta 1: CSD (Para Facturación CFDI) */}
        <div
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            csdActivo
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/20"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    CSD (Sello Digital)
                    <AyudaTermino terminoId="csd" />
                  </h2>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Exclusivo para Facturación CFDI 4.0
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  csdActivo
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {csdActivo ? "CSD Activo" : "Pendiente de Carga"}
              </span>
            </div>

            <div className="mt-3.5 space-y-1 text-xs text-slate-600 border-t border-slate-200/60 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Certificado:</span>
                <span className="font-mono font-bold text-slate-800">
                  {csdActivo?.noCertificado || activeOrg.csdNoCertificado || "30001000000500003416"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uso Autorizado:</span>
                <span className="font-bold text-emerald-700">Timbrado CFDI 4.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seguridad:</span>
                <span className="font-semibold text-slate-700">Cifrado AES-256-GCM</span>
              </div>
            </div>
          </div>

          {csdActivo && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
              <button
                type="button"
                onClick={() => handleEliminarCertificado("CSD")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar CSD de la Bóveda
              </button>
            </div>
          )}
        </div>

        {/* Tarjeta 2: e.firma (FIEL - NUNCA para timbrar) */}
        <div
          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            efirmaActiva
              ? "bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-400/20"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    e.firma (Firma Electrónica)
                    <AyudaTermino terminoId="efirma" />
                  </h2>
                  <span className="text-[11px] text-indigo-800 font-semibold">
                    Identidad SAT • Trámites y Consultas
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  efirmaActiva
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {efirmaActiva ? "e.firma Resguardada" : "Opcional / No cargada"}
              </span>
            </div>

            <div className="mt-3.5 space-y-1 text-xs text-slate-600 border-t border-slate-200/60 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Regla de Seguridad:</span>
                <span className="font-bold text-rose-700">NUNCA se usa para timbrar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Finalidad:</span>
                <span className="font-semibold text-slate-700">Descargas SAT / Metadatos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Protección:</span>
                <span className="font-semibold text-slate-700">AES-256-GCM Autenticado</span>
              </div>
            </div>
          </div>

          {efirmaActiva && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
              <button
                type="button"
                onClick={() => handleEliminarCertificado("EFIRMA")}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar e.firma de la Bóveda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADVERTENCIA DE SEGURIDAD ESTRICTA SAT */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-900">
            Diferencia Crítica de Seguridad: CSD vs e.firma (Art. 29 Código Fiscal de la Federación)
          </p>
          <p className="text-amber-900/90 leading-relaxed">
            El <strong>CSD</strong> es un certificado especial creado únicamente para sellar facturas digitales. Si algún sistema te pide tu <strong>e.firma</strong> para facturar, está violando las mejores prácticas de seguridad fiscal. En EasyConta MX, la e.firma está bloqueada a nivel de código para cualquier operación de timbrado.
          </p>
        </div>
      </div>

      {/* FORMULARIO DE CARGA CIFRADA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Cargar y Cifrar Certificado en Bóveda
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tus archivos y contraseña son cifrados con AES-256-GCM antes de guardarse en base de datos.
            </p>
          </div>

          {/* Selector de Tipo */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTipoSeleccionado("CSD")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tipoSeleccionado === "CSD"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Subir CSD (Facturación)
            </button>
            <button
              type="button"
              onClick={() => setTipoSeleccionado("EFIRMA")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tipoSeleccionado === "EFIRMA"
                  ? "bg-white text-indigo-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Subir e.firma (Trámites)
            </button>
          </div>
        </div>

        {mensajeExito && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {mensajeError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{mensajeError}</span>
          </div>
        )}

        <form onSubmit={handleSubirCertificado} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Archivo .cer */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">
                Archivo de Certificado Público (.cer)
              </label>
              <input
                type="file"
                accept=".cer"
                required
                onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Ejemplo: {activeOrg.rfc}.cer
              </span>
            </div>

            {/* Archivo .key */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">
                Archivo de Llave Privada (.key)
              </label>
              <input
                type="file"
                accept=".key"
                required
                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Ejemplo: Claveprivada_FIEC_{activeOrg.rfc}.key
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">
                Contraseña de la Llave Privada
              </label>
              <input
                type="password"
                required
                value={passwordKey}
                onChange={(e) => setPasswordKey(e.target.value)}
                placeholder="Contraseña del certificado..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                Se almacena cifrada en la bóveda con clave maestra del servidor.
              </span>
            </div>

            {/* No. de Certificado (opcional) */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">
                Número de Serie de Certificado (Opcional)
              </label>
              <input
                type="text"
                maxLength={20}
                value={noCertificado}
                onChange={(e) => setNoCertificado(e.target.value)}
                placeholder="Ej. 30001000000500003416"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                20 dígitos asignados por el SAT al expedir el sello.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Protegido por CERT_VAULT_KEY (AES-256-GCM)</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shadow-emerald-700/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? "Cifrando y Guardando..." : `Guardar ${tipoSeleccionado} en Bóveda`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* HISTORIAL DE CERTIFICADOS EN BÓVEDA */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Historial de Certificados Cifrados en Bóveda
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            {certificados.length} registro(s)
          </span>
        </div>

        {certificados.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-3">
            <p>No hay certificados cargados todavía. Sube tu CSD para comenzar a timbrar facturas CFDI 4.0.</p>
            <button
              type="button"
              onClick={() => abrirAsistente("pantalla")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ver guía de CSD vs e.firma en el Asistente</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3 pl-4">Tipo</th>
                  <th className="p-3">RFC</th>
                  <th className="p-3">No. Serie Certificado</th>
                  <th className="p-3">Vigencia SAT</th>
                  <th className="p-3">Algoritmo</th>
                  <th className="p-3 text-center">Estatus</th>
                  <th className="p-3 pr-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 pl-4 font-bold">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] ${
                          c.tipo === "CSD"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {c.tipo === "CSD" ? (
                          <FileCode className="w-3 h-3" />
                        ) : (
                          <KeyRound className="w-3 h-3" />
                        )}
                        {c.tipo}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{c.rfc}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {c.noCertificado || "30001000000500003416"}
                    </td>
                    <td className="p-3 text-slate-600">
                      {c.validoHasta
                        ? new Date(c.validoHasta).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Indefinida (4 años)"}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        AES-256-GCM
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {c.activo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Inactivo</span>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleEliminarCertificado(c.tipo as "CSD" | "EFIRMA")}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[11px] font-semibold transition-colors cursor-pointer"
                        title={`Eliminar ${c.tipo} de la bóveda`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
