"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PacMockAdapter } from "@/lib/sat/pac-mock";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCode,
  Info,
  Key,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [tipoPersona, setTipoPersona] = useState<"PF" | "PM">("PF");
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [calle, setCalle] = useState("");
  const [colonia, setColonia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");

  const [regimenFiscal, setRegimenFiscal] = useState("626");
  const [coeficienteUtilidad, setCoeficienteUtilidad] = useState("0.0825");
  const [deduccionCiega, setDeduccionCiega] = useState(true);

  // CSD y Certificados State
  const [modoCsd, setModoCsd] = useState<"MOCK" | "REAL">("MOCK");
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [csdPassword, setCsdPassword] = useState("ClaveCSD2026!");
  const [serieDefault, setSerieDefault] = useState("F");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validación de RFC en vivo
  const rfcValido = rfc ? PacMockAdapter.validarRfc(rfc) : true;
  const longitudEsperada = tipoPersona === "PM" ? 12 : 13;

  const handleNextStep1 = () => {
    // Si cambia tipo persona, ajustar régimen por defecto
    if (tipoPersona === "PM" && regimenFiscal !== "601") {
      setRegimenFiscal("601");
      setSerieDefault("A");
    } else if (tipoPersona === "PF" && regimenFiscal === "601") {
      setRegimenFiscal("626");
      setSerieDefault("F");
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    if (!rfc || !razonSocial || !codigoPostal) {
      setError("Por favor completa los campos fiscales obligatorios.");
      return;
    }
    if (!PacMockAdapter.validarRfc(rfc)) {
      setError(
        `El RFC '${rfc}' no es válido para ${
          tipoPersona === "PM" ? "Persona Moral (12 carácteres)" : "Persona Física (13 carácteres)"
        }.`
      );
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    setStep(4);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleCompletarOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let cerBase64: string | null = null;
      let keyBase64: string | null = null;

      if (modoCsd === "REAL") {
        if (!cerFile || !keyFile) {
          throw new Error("Debes seleccionar ambos archivos (.cer y .key) de tu CSD.");
        }
        cerBase64 = await fileToBase64(cerFile);
        keyBase64 = await fileToBase64(keyFile);
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoPersona,
          rfc: rfc.trim().toUpperCase(),
          razonSocial: razonSocial.trim(),
          codigoPostal: codigoPostal.trim(),
          calle,
          colonia,
          municipio,
          estado,
          regimenFiscal,
          coeficienteUtilidad: parseFloat(coeficienteUtilidad) || 0.0825,
          deduccionCiega,
          serieDefault,
          csdPassword,
          cerBase64,
          keyBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el contribuyente.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
      {/* Aviso Legal SAT Obligatorio */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <strong className="font-semibold text-amber-950">Aviso Legal SAT:</strong> EasyConta MX no es un organismo gubernamental ni sustituye las facultades del SAT. El registro de RFC y regímenes fiscales en este asistente es para propósitos de configuración del sistema contable interno y emisión mock/PAC conforme al Anexo 20 CFDI 4.0. Asegúrate de que los datos coincidan fielmente con tu Constancia de Situación Fiscal oficial vigente.
        </div>
      </div>

      {/* Barra de Pasos */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs font-semibold text-slate-400">
        {[
          { num: 1, label: "Tipo" },
          { num: 2, label: "Datos Fiscales" },
          { num: 3, label: "Régimen 2026" },
          { num: 4, label: "CSD y Folios" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${
              step === s.num
                ? "text-emerald-700 font-bold"
                : step > s.num
                ? "text-emerald-600"
                : "text-slate-400"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === s.num
                  ? "bg-emerald-600 text-white"
                  : step > s.num
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* PASO 1: Tipo de Contribuyente */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Paso 1: Selecciona la Naturaleza del Contribuyente
            </h2>
            <p className="text-xs text-slate-500">
              Determina las reglas fiscales, estructura del RFC y obligaciones ante el SAT
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setTipoPersona("PF")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                tipoPersona === "PF"
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Persona Física (PF)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Individuos con actividad económica. RFC de 13 posiciones. Elegible para RESICO PF, Actividad Empresarial y Arrendamiento.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTipoPersona("PM")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                tipoPersona === "PM"
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Persona Moral (PM)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Empresas, sociedades anónimas (S.A., S.A.S., S.C., S. de R.L.). RFC de 12 posiciones. Régimen General Título II LISR.
              </p>
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleNextStep1}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Datos Fiscales */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Paso 2: Datos de Identificación Fiscal ({tipoPersona === "PM" ? "Persona Moral" : "Persona Física"})
            </h2>
            <p className="text-xs text-slate-500">
              Debe coincidir exactamente con la Cédula de Identificación Fiscal (CIF) del SAT
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">
                  RFC con Homoclave ({longitudEsperada} caracteres) *
                </label>
                {rfc && (
                  <span
                    className={`text-[10px] font-bold ${
                      rfcValido ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {rfcValido ? "✓ Formato SAT válido" : "✗ Formato incorrecto"}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={longitudEsperada}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder={tipoPersona === "PM" ? "ABC200101XYZ" : "ABCD900101XYZ"}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Razón Social o Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Tal como figura en la Constancia de Situación Fiscal"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código Postal (Lugar de Expedición SAT) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={codigoPostal}
                  onChange={(e) => setCodigoPostal(e.target.value)}
                  placeholder="00000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="Ciudad de México, Jalisco, N.L..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={handleNextStep2}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Régimen Fiscal SAT 2026 */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Paso 3: Régimen Fiscal SAT 2026
            </h2>
            <p className="text-xs text-slate-500">
              Configuración de cálculo de ISR e IVA para este contribuyente
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {tipoPersona === "PF" ? (
              <div className="space-y-2.5">
                {[
                  {
                    id: "626",
                    title: "626 - Régimen Simplificado de Confianza (RESICO PF)",
                    desc: "Tasa preferencial del 1% al 2.5% sobre ingresos cobrados. Retención del 1.25% de ISR cuando facturas a Personas Morales.",
                  },
                  {
                    id: "612",
                    title: "612 - Personas Físicas con Actividades Empresariales y Profesionales",
                    desc: "Tarifa progresiva Art. 96 LISR sobre utilidad (Ingresos acumulables - Gastos comprobados con CFDI).",
                  },
                  {
                    id: "606",
                    title: "606 - Régimen de Arrendamiento de Inmuebles",
                    desc: "Opción de deducción ciega del 35% sin comprobante fiscal + Impuesto Predial.",
                  },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRegimenFiscal(r.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      regimenFiscal === r.id
                        ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">{r.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{r.desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-500 bg-emerald-50/70 text-emerald-950">
                  <div className="text-xs font-bold">
                    601 - General de Ley Personas Morales (Título II LISR)
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Pagos provisionales mensuales aplicando el Coeficiente de Utilidad (CU) a los ingresos nominales, gravados a la tasa del 30%.
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Coeficiente de Utilidad (CU) del último ejercicio:
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max="1"
                    step="0.005"
                    value={coeficienteUtilidad}
                    onChange={(e) => setCoeficienteUtilidad(e.target.value)}
                    className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-[11px] text-slate-500 ml-2">
                    = {(parseFloat(coeficienteUtilidad || "0") * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={handleNextStep3}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: CSD y Configuración */}
      {step === 4 && (
        <form onSubmit={handleCompletarOnboarding} className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Paso 4: Certificado de Sello Digital (CSD) y Folios</span>
              <AyudaTermino terminoId="csd" />
            </h2>
            <p className="text-xs text-slate-500">
              Vinculación de credenciales cifradas con AES-256-GCM para timbrado digital CFDI 4.0
            </p>
          </div>

          {/* ALERTA DE DISTINCIÓN CSD VS E.FIRMA */}
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <strong className="block text-amber-900 font-semibold">
                Regla Estricta SAT (Art. 29 CFF): La e.firma NUNCA se usa para timbrar.
              </strong>
              <span>
                Para facturar debes subir un Certificado de Sello Digital (CSD). Tu <strong className="font-semibold">e.firma</strong> es tu identidad personal y podrás resguardarla de forma independiente en la Bóveda de Certificados para trámites oficiales.
              </span>
            </div>
          </div>

          {/* SELECTOR DE MODO: MOCK VS REAL */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setModoCsd("MOCK")}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                modoCsd === "MOCK"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Generar CSD Mock de Pruebas (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => setModoCsd("REAL")}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                modoCsd === "REAL"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Subir Archivos CSD Propios (.cer y .key)
            </button>
          </div>

          {/* MODO MOCK */}
          {modoCsd === "MOCK" && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Certificado CSD Mock Generado Automáticamente:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                <div>
                  <strong>No. de Certificado:</strong> 30001000000500003416
                </div>
                <div>
                  <strong>Vigencia:</strong> Hasta Diciembre 2028
                </div>
                <div>
                  <strong>Archivo .cer:</strong> {rfc || "CONTRIBUYENTE"}.cer
                </div>
                <div>
                  <strong>Archivo .key:</strong> {rfc || "CONTRIBUYENTE"}.key
                </div>
              </div>
            </div>
          )}

          {/* MODO REAL */}
          {modoCsd === "REAL" && (
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 text-xs space-y-3">
              <div className="font-semibold text-emerald-950 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>Carga tus archivos CSD del SAT:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Certificado (.cer)
                  </label>
                  <input
                    type="file"
                    accept=".cer"
                    required={modoCsd === "REAL"}
                    onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-white file:text-slate-700 file:border-slate-300 hover:file:bg-slate-50 border border-slate-200 rounded-lg p-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Llave Privada (.key)
                  </label>
                  <input
                    type="file"
                    accept=".key"
                    required={modoCsd === "REAL"}
                    onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-white file:text-slate-700 file:border-slate-300 hover:file:bg-slate-50 border border-slate-200 rounded-lg p-1.5 bg-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Los archivos se cifran mediante AES-256-GCM con la variable CERT_VAULT_KEY.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Serie Predeterminada
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={serieDefault}
                onChange={(e) => setSerieDefault(e.target.value.toUpperCase())}
                placeholder="F, A, B..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contraseña de la Llave Privada CSD
              </label>
              <input
                type="password"
                required
                value={csdPassword}
                onChange={(e) => setCsdPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Al finalizar, se activará de inmediato el RFC <strong>{rfc}</strong>, se creará el Catálogo de Cuentas Contables del SAT (Anexo 24) y podrás comenzar a timbrar facturas CFDI 4.0.
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Registrando RFC..." : "Completar y Activar RFC"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
