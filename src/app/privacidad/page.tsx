import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";

export const metadata = {
  title: "Aviso de Privacidad Integral | EasyConta MX",
  description: "Aviso de Privacidad Integral de EasyConta MX conforme a la LFPDPPP de los Estados Unidos Mexicanos.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-8">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-600 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Aviso de Privacidad Integral
              </h1>
              <p className="text-xs text-slate-500">
                Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) • México 2026
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
          <Lock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            En <strong>EasyConta MX</strong> nos comprometemos a garantizar la confidencialidad, integridad y seguridad de tus datos fiscales y personales mediante estrictos protocolos de cifrado y buenas prácticas de privacidad digital.
          </p>
        </div>

        <div className="prose prose-slate prose-xs max-w-none text-slate-700 space-y-6 text-xs leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              1. Identidad y Domicilio del Responsable
            </h2>
            <p>
              EasyConta MX (en adelante, el &quot;Responsable&quot;), con domicilio para oír y recibir notificaciones en territorio de los Estados Unidos Mexicanos, es el responsable del tratamiento y resguardo de sus datos personales.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              2. Datos Personales Recabados
            </h2>
            <p>Para la operación del sistema contable y de facturación se recaban los siguientes datos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Datos de Identificación y Contacto:</strong> Nombre completo o razón social, correo electrónico, teléfono.</li>
              <li><strong>Datos Fiscales y Tributarios:</strong> Registro Federal de Contribuyentes (RFC), régimen fiscal, domicilio fiscal (código postal), comprobantes digitales (CFDI XML), sellos digitales y certificados CSD.</li>
              <li><strong>Datos Financieros Operativos:</strong> Movimientos de estados de cuenta bancarios en formato CSV para conciliación interna.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              3. Finalidades Primarias del Tratamiento
            </h2>
            <p>Sus datos personales serán utilizados para las siguientes finalidades esenciales:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Configuración y autenticación de su cuenta de usuario en la plataforma.</li>
              <li>Generación, parseo y resguardo de comprobantes fiscales digitales por internet (CFDI 4.0).</li>
              <li>Determinación demostrativa de pagos provisionales de impuestos (ISR e IVA) y elaboración de pólizas contables.</li>
              <li>Validación preventiva de RFCs contra bases de datos de prueba (Simulación 69-B).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              4. Medidas de Seguridad y Bóveda Criptográfica
            </h2>
            <p>
              Toda la información sensible relativa a certificados digitales (.cer y .key) y contraseñas de sellos se almacena cifrada bajo el estándar <strong>AES-256-GCM</strong> con vectores de inicialización (IV) aleatorios. Las comunicaciones se encuentran protegidas mediante túneles seguros HTTPS/TLS con cifrado en tránsito.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
              5. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
            </h2>
            <p>
              Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información (Rectificación), que la eliminemos de nuestros registros cuando considere que no está siendo utilizada adecuadamente (Cancelación), así como oponerse al uso de sus datos para fines específicos (Oposición). Para ejercer cualquiera de sus derechos ARCO, puede gestionar la eliminación directa de sus certificados desde el módulo de Bóveda o contactar al área de soporte técnico.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>EasyConta MX © 2026 • Protección de Datos en México</span>
          <Link href="/terminos" className="text-emerald-700 hover:underline font-semibold">
            Consultar Términos y Condiciones →
          </Link>
        </div>
      </div>
    </div>
  );
}
