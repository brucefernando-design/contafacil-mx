import Link from "next/link";
import { auth } from "@/auth";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calculator,
  Receipt,
  FolderArchive,
  ArrowRight,
  Zap,
  Building2,
  UserCheck,
  ShieldAlert,
  Info,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* Glows ambientales de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-96 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Watermark Superior Global: Timbrado Demo */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-semibold text-amber-300 flex items-center justify-center gap-2 relative z-20">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Aviso de Demostración: Timbrado de demostración. Este CFDI NO fue enviado al SAT. Plataforma para simulación y control contable interno.
        </span>
      </div>

      {/* 2. Navbar Pública */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-extrabold text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                EC
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-white tracking-tight leading-tight">
                  EasyConta<span className="text-emerald-400">.MX</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium leading-none">
                  Contabilidad SAT 2026
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <Link href="/precios" className="hover:text-emerald-400 transition-colors">
              Planes y Precios
            </Link>
            <Link href="/terminos" className="hover:text-emerald-400 transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-emerald-400 transition-colors">
              Privacidad
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <span>Ir a mi Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                >
                  <span>Crear cuenta</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Section */}
      <main className="flex-1">
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistema Contable y Fiscal SAT México • Ejercicio 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Contabilidad inteligente y cálculo fiscal{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              en un solo lugar
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
            Plataforma para personas físicas y morales en México. Simula timbrado CFDI 4.0 con PAC Mock,
            calcula pagos provisionales de ISR e IVA (RESICO, Actividad Empresarial, Arrendamiento, PM) y genera pólizas contables Anexo 24.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/registro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span>Crear cuenta gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Probar cuentas demo</span>
            </Link>

            <Link
              href="/precios"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver planes y precios →</span>
            </Link>
          </div>

          {/* Tarjeta Visual con Watermark Demo en Hero */}
          <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl relative text-left max-w-3xl mx-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-slate-400">CFDI 4.0 • Vista Previa</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                PAC Mock Activo
              </span>
            </div>

            <div className="relative">
              {/* Marca de agua diagonal en la previsualización */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <span className="text-xl sm:text-2xl font-black text-rose-500/20 border-2 border-rose-500/20 px-4 py-2 rounded-xl rotate-[-15deg] uppercase tracking-wider text-center">
                  Timbrado de demostración.<br />Este CFDI NO fue enviado al SAT.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Régimen Fiscal</div>
                  <div className="font-bold text-white mt-0.5">626 - RESICO PF</div>
                  <div className="text-[10px] text-emerald-400 mt-1">Tasa mensual: 1.00%</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Ingresos Cobrados</div>
                  <div className="font-bold text-white mt-0.5">$25,000.00 MXN</div>
                  <div className="text-[10px] text-slate-400 mt-1">Comprobantes PUE y complementos</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Determinación Estimada</div>
                  <div className="font-bold text-emerald-400 mt-0.5">ISR: $250.00 | IVA: $4,000.00</div>
                  <div className="text-[10px] text-slate-400 mt-1">Cálculo en base a flujo de efectivo</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Sección de Claridad y Transparencia Fiscal: Qué HACE y Qué NO HACE */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Claridad Fiscal: ¿Qué hace y qué NO hace EasyConta MX?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Diseñado bajo el principio de total transparencia con los contribuyentes y la normativa mexicana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Lo que Sí Hace */}
            <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Lo que SÍ hace EasyConta MX</h3>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cálculo estimado de pagos provisionales:</strong> Determina ISR e IVA mensual según tu régimen (RESICO, Act. Empresarial, Arrendamiento o PM General).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Simulación de Timbrado CFDI 4.0:</strong> Genera XML y PDF idénticos al anexo 20 del SAT mediante PAC Mock seguro sin repercusión legal.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Pólizas Contables Anexo 24:</strong> Genera automáticamente asientos de diario, ingresos y egresos cuadrados listos para revisión.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bóveda Criptográfica AES-256-GCM:</strong> Almacena CSD y e.firma con cifrado autenticado de grado militar.
                  </span>
                </li>
              </ul>
            </div>

            {/* Columna Lo que NO Hace */}
            <div className="rounded-2xl border border-rose-800/50 bg-rose-950/20 p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Lo que NO hace (No es el SAT)</h3>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>NO es el portal oficial del SAT (sat.gob.mx):</strong> EasyConta es una herramienta privada e independiente de software contable.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>NO envía comprobantes reales al SAT:</strong> En este entorno, los CFDI tienen carácter de demostración y NO son reportados al fisco.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>NO sustituye a tu Contador Público:</strong> La asesoría contable y el criterio tributario profesional son indispensables.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>NO genera líneas de captura bancarias:</strong> La presentación definitiva y pago de impuestos se realiza en el portal del SAT.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Sección de 3 Planes con Link a /precios */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Planes Diseñados para tu Operación
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Comienza gratis hoy mismo en fase beta. Todos los planes incluyen timbrado mock demostrativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan 1: FREE */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Inicial</div>
                <h3 className="text-xl font-bold text-white">FREE</h3>
                <div className="text-3xl font-black text-white">$0 <span className="text-xs text-slate-400 font-normal">/mes</span></div>
                <p className="text-xs text-slate-400">Para personas físicas que inician y quieren verificar sus cálculos.</p>
                <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span><strong>1 RFC</strong> activo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span><strong>10 timbres</strong> mock/mes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Motor Fiscal RESICO/AE/Arrendamiento</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/registro"
                  className="w-full block py-2.5 px-4 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  Registrarme Gratis
                </Link>
              </div>
            </div>

            {/* Plan 2: PRO (Destacado) */}
            <div className="rounded-2xl border-2 border-emerald-500 bg-slate-900/90 p-6 flex flex-col justify-between relative shadow-xl shadow-emerald-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                Recomendado
              </div>
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Profesional</div>
                <h3 className="text-xl font-bold text-white">PRO</h3>
                <div className="text-3xl font-black text-white">$199 <span className="text-xs text-slate-400 font-normal">MXN/mes</span></div>
                <p className="text-xs text-slate-400">Para contribuyentes y pequeños negocios con mayor volumen.</p>
                <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Hasta <strong>3 RFCs</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span><strong>50 timbres</strong> mock/mes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Conciliación PUE/PPD y Bancaria CSV</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/precios"
                  className="w-full block py-2.5 px-4 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-colors"
                >
                  Ver detalles de PRO
                </Link>
              </div>
            </div>

            {/* Plan 3: DESPACHO */}
            <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/60 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">Despachos</div>
                <h3 className="text-xl font-bold text-white">DESPACHO</h3>
                <div className="text-3xl font-black text-white">$599 <span className="text-xs text-slate-400 font-normal">MXN/mes</span></div>
                <p className="text-xs text-slate-400">Para contadores independientes y firmas que gestionan múltiples clientes.</p>
                <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Hasta <strong>25 RFCs</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span><strong>200 timbres</strong> mock/mes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span>Modo Despacho y Multi-Cliente</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/precios"
                  className="w-full block py-2.5 px-4 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  Ver detalles de Despacho
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/precios"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              <span>Consulta la tabla comparativa completa y preguntas frecuentes en /precios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      {/* 6. Footer con Watermark */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              EC
            </div>
            <span>EasyConta MX © 2026. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-5 text-slate-400">
            <Link href="/precios" className="hover:text-white">Precios</Link>
            <Link href="/terminos" className="hover:text-white">Términos de Servicio</Link>
            <Link href="/privacidad" className="hover:text-white">Aviso de Privacidad</Link>
            <Link href="/login" className="hover:text-white">Acceso al Sistema</Link>
          </div>

          <div className="text-[11px] text-amber-400/90 font-mono">
            Timbrado de demostración. Este CFDI NO fue enviado al SAT.
          </div>
        </div>
      </footer>
    </div>
  );
}
