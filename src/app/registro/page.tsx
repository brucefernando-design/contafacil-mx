"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
  Info,
  ArrowRight,
  Hash,
  MapPin,
  CheckSquare,
} from "lucide-react";
import {
  validarEmail,
  validarPassword,
  validarRfcEstructura,
  validarRegimenFiscal,
} from "@/lib/validation/auth";

export default function RegistroPage() {
  const router = useRouter();

  // Paso actual: 1 = Cuenta de Usuario, 2 = Wizard Contribuyente SAT 2026
  const [step, setStep] = useState<1 | 2>(1);

  // Paso 1: Datos de Usuario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false); // Inicia obligatoriamente en FALSE

  // Estado del usuario creado
  const [createdUser, setCreatedUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // Paso 2: Wizard Contribuyente Obligatorio
  const [tipoPersona, setTipoPersona] = useState<"PF" | "PM">("PF");
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("626");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manejar cambio de tipo de persona en el Wizard
  const handleTipoPersonaChange = (tipo: "PF" | "PM") => {
    setTipoPersona(tipo);
    if (tipo === "PM") {
      setRegimenFiscal("601");
    } else {
      setRegimenFiscal("626");
    }
  };

  // Envío de Paso 1: Crear Usuario
  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Por favor ingresa tu nombre completo.");
      return;
    }

    const emailVal = validarEmail(email);
    if (!emailVal.valido) {
      setError(emailVal.error || "Correo electrónico inválido.");
      return;
    }

    const passVal = validarPassword(password);
    if (!passVal.valido) {
      setError(passVal.error || "La contraseña no cumple con los requisitos.");
      return;
    }

    if (!acceptedTerms) {
      setError("Debes aceptar los Términos de Servicio y el Aviso de Privacidad para continuar.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          acceptedTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar la cuenta.");
      }

      setCreatedUser(data.user);

      // Iniciar sesión en segundo plano con las credenciales creadas
      await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      // Avanzar al Wizard Contribuyente obligatorio
      setStep(2);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Envío de Paso 2: Wizard Contribuyente
  const handleSubmitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRfc = rfc.trim().toUpperCase();
    const rfcVal = validarRfcEstructura(cleanRfc, tipoPersona);
    if (!rfcVal.valido) {
      setError(rfcVal.error || "El RFC ingresado no es válido.");
      return;
    }

    if (!razonSocial.trim()) {
      setError("Ingresa el Nombre Fiscal o Razón Social.");
      return;
    }

    const cleanCp = codigoPostal.trim();
    if (!/^\d{5}$/.test(cleanCp)) {
      setError("El Código Postal fiscal debe contener exactamente 5 dígitos numéricos.");
      return;
    }

    const regVal = validarRegimenFiscal(regimenFiscal, tipoPersona);
    if (!regVal.valido) {
      setError(regVal.error || "Régimen fiscal no válido.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: createdUser?.id,
          tipoPersona,
          rfc: cleanRfc,
          razonSocial: razonSocial.trim(),
          codigoPostal: cleanCp,
          regimenFiscal,
          coeficienteUtilidad: tipoPersona === "PM" ? 0.0825 : null,
          deduccionCiega: regimenFiscal === "606",
          serieDefault: tipoPersona === "PM" ? "A" : "F",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo configurar el contribuyente.");
      }

      // Re-autenticar sesión si es necesario para actualizar activeCompanyId
      await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      // Configurar apertura automática del Asistente en la pestaña "Recorrido"
      try {
        localStorage.setItem("cfmx_asistente_abierto", "1");
        localStorage.setItem("cfmx_asistente_tab", "recorrido");
      } catch {
        // Ignorar fallas de localStorage
      }

      // Redirigir al dashboard con parámetro de asistente
      router.push("/dashboard?asistente=recorrido");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Glow ambiental de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera de Marca */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/login" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-4 hover:scale-105 transition-transform">
          <span className="font-extrabold text-2xl tracking-tight">EC</span>
        </Link>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          EasyConta<span className="text-emerald-400">.MX</span>
        </h2>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Registro de Contribuyentes SAT 2026
        </div>
      </div>

      {/* Indicador de Pasos */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="flex items-center justify-between bg-slate-800/70 backdrop-blur-md px-5 py-2.5 rounded-xl border border-slate-700/80 text-xs">
          <div className={`flex items-center gap-2 font-bold ${step === 1 ? "text-emerald-400" : "text-emerald-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? "bg-emerald-500 text-slate-900 font-black" : "bg-emerald-500/20 text-emerald-400"}`}>
              1
            </span>
            <span>Cuenta</span>
          </div>

          <div className="h-0.5 w-12 bg-slate-700" />

          <div className={`flex items-center gap-2 font-bold ${step === 2 ? "text-emerald-400" : "text-slate-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? "bg-emerald-500 text-slate-900 font-black" : "bg-slate-700 text-slate-400"}`}>
              2
            </span>
            <span>Wizard SAT 2026</span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Formulario */}
      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700/80">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* PASO 1: CUENTA DE USUARIO                                    */}
          {/* ============================================================ */}
          {step === 1 && (
            <form className="space-y-4" onSubmit={handleSubmitStep1}>
              <div className="border-b border-slate-700/80 pb-3 mb-4">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Crear tu Cuenta de Usuario
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingresa tus datos personales de acceso al portal contable.
                </p>
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Lic. Mariana López"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Contraseña
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Mín. 8 caracteres y 1 número
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Texto Stub Verificación de Correo */}
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Verificación:</strong> La verificación de correo se conecta después. Puedes ingresar y configurar tu contribuyente de inmediato.
                </span>
              </div>

              {/* Checkbox Términos y Privacidad (INICIA EN FALSE) */}
              <div className="flex items-start gap-2 pt-1 pb-1">
                <input
                  type="checkbox"
                  id="reg-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="reg-terms" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                  Acepto los{" "}
                  <Link href="/terminos" target="_blank" className="text-emerald-400 hover:underline font-semibold">
                    Términos de Servicio
                  </Link>{" "}
                  y el{" "}
                  <Link href="/privacidad" target="_blank" className="text-emerald-400 hover:underline font-semibold">
                    Aviso de Privacidad
                  </Link>{" "}
                  de EasyConta MX.
                </label>
              </div>

              {/* Botón Siguiente */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <span>{loading ? "Creando usuario..." : "Continuar a Datos Fiscales"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">¿Ya tienes una cuenta registrada? </span>
                <Link href="/login" className="text-xs font-semibold text-emerald-400 hover:underline">
                  Iniciar sesión
                </Link>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* PASO 2: WIZARD CONTRIBUYENTE SAT OBLIGATORIO                 */}
          {/* ============================================================ */}
          {step === 2 && (
            <form className="space-y-4" onSubmit={handleSubmitStep2}>
              <div className="border-b border-slate-700/80 pb-3 mb-4">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Usuario registrado: {createdUser?.name || name}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mt-1">
                  Wizard de Alta Fiscal SAT 2026
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configuración inicial obligatoria para timbrado, catálogo de cuentas Anexo 24 y motor de impuestos.
                </p>
              </div>

              {/* Selector PF / PM */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo de Contribuyente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTipoPersonaChange("PF")}
                    className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all flex items-center gap-2.5 ${
                      tipoPersona === "PF"
                        ? "bg-emerald-950/60 border-emerald-500/80 text-white shadow-sm"
                        : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <UserCheck className={`w-4 h-4 ${tipoPersona === "PF" ? "text-emerald-400" : "text-slate-500"}`} />
                    <div>
                      <div className="text-xs font-bold">Persona Física</div>
                      <div className="text-[10px] opacity-75">RFC de 13 caracteres</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoPersonaChange("PM")}
                    className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all flex items-center gap-2.5 ${
                      tipoPersona === "PM"
                        ? "bg-emerald-950/60 border-emerald-500/80 text-white shadow-sm"
                        : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${tipoPersona === "PM" ? "text-emerald-400" : "text-slate-500"}`} />
                    <div>
                      <div className="text-xs font-bold">Persona Moral</div>
                      <div className="text-[10px] opacity-75">RFC de 12 caracteres</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* RFC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    RFC ({tipoPersona === "PF" ? "13 caracteres" : "12 caracteres"})
                  </label>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {rfc.length} / {tipoPersona === "PF" ? 13 : 12}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={tipoPersona === "PF" ? 13 : 12}
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    placeholder={tipoPersona === "PF" ? "GAMA850512XYZ" : "SFI200115AA1"}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all tracking-wider"
                  />
                </div>
              </div>

              {/* Razón Social */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {tipoPersona === "PF" ? "Nombre Completo Fiscal" : "Razón Social (sin régimen de capital)"}
                </label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder={tipoPersona === "PF" ? "Arturo Garza Morales" : "Soluciones Fiscales Integrales"}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Código Postal */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Código Postal Fiscal (5 dígitos)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, ""))}
                    placeholder="06700"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Régimen Fiscal SAT */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Régimen Fiscal SAT 2026
                </label>
                <select
                  value={regimenFiscal}
                  onChange={(e) => setRegimenFiscal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  {tipoPersona === "PF" ? (
                    <>
                      <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                      <option value="606">606 - Régimen de Arrendamiento</option>
                    </>
                  ) : (
                    <option value="601">601 - General de Ley Personas Morales</option>
                  )}
                </select>
              </div>

              {/* Resumen automático */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1 text-slate-300 font-semibold">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Configuración automatizada incluida:</span>
                </div>
                <p>• Catálogo Anexo 24 preconfigurado para tu régimen fiscal.</p>
                <p>• CSD de prueba para timbrado mock de facturación CFDI 4.0.</p>
                <p>• Asignación automática de rol OWNER a tu usuario.</p>
              </div>

              {/* Botón Finalizar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <span>{loading ? "Configurando contribuyente..." : "Finalizar y Abrir EasyConta"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          EasyConta MX © 2026. Conexión segura con esquema SAT CFDI 4.0
        </div>
      </div>
    </div>
  );
}
