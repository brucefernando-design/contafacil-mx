"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, FORMAS_PAGO, REGIMENES_SAT, USOS_CFDI } from "@/lib/utils";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Building2,
  BookmarkPlus,
  Search,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { AyudaTermino } from "@/components/asistente/AyudaTermino";

export interface ClienteGuardado {
  rfc: string;
  nombre: string;
  codigoPostal: string;
  regimenFiscal: string;
  usoCfdi: string;
  formaPago?: string;
  metodoPago?: "PUE" | "PPD";
}

interface ConceptoState {
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  descuento: number;
  aplicaIva: boolean;
  tasaIva?: number; // 0.16 | 0.08 | 0
  aplicaRetIsr: boolean;
  aplicaRetIva: boolean;
}

interface FacturacionFormProps {
  activeOrg: {
    id: string;
    rfc: string;
    razonSocial: string;
    tipoPersona: string;
    regimenFiscal: string;
    codigoPostal: string;
    serieDefault: string;
    folioActual: number;
  };
  pacBanner: {
    text: string;
    variant: "amber" | "green" | "slate";
  };
}

export function FacturacionForm({ activeOrg, pacBanner }: FacturacionFormProps) {
  const router = useRouter();

  // Es emisor RESICO o PF?
  const esResico = activeOrg.regimenFiscal === "626";
  const esPf = activeOrg.tipoPersona === "PF";

  // Datos del Receptor (limpio por defecto para nuevos usuarios/contadores)
  const isBruceOrg = activeOrg.rfc === "SAAB750615GG7";
  const [receptorRfc, setReceptorRfc] = useState(isBruceOrg ? "GPC9506157T0" : "");
  const [receptorNombre, setReceptorNombre] = useState(isBruceOrg ? "GLOBAL PCNET" : "");
  const [receptorCp, setReceptorCp] = useState(isBruceOrg ? "88240" : "");
  const [receptorRegimen, setReceptorRegimen] = useState(isBruceOrg ? "601" : "616");
  const [receptorUsoCfdi, setReceptorUsoCfdi] = useState(isBruceOrg ? "G03" : "S01");

  // Directorio y Autocompletado de Clientes
  const [clientesGuardados, setClientesGuardados] = useState<ClienteGuardado[]>([]);
  const [sugerencias, setSugerencias] = useState<ClienteGuardado[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [campoActivo, setCampoActivo] = useState<"nombre" | "rfc" | null>(null);
  const [clienteAutocompletado, setClienteAutocompletado] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Método y Forma de Pago
  const [metodoPago, setMetodoPago] = useState<"PUE" | "PPD">("PUE");
  const [formaPago, setFormaPago] = useState("03");

  // Conceptos
  const [conceptos, setConceptos] = useState<ConceptoState[]>([
    {
      claveProdServ: "80141600",
      claveUnidad: "E48",
      unidad: "Servicio",
      descripcion: "",
      cantidad: 1,
      valorUnitario: 0,
      descuento: 0,
      aplicaIva: true,
      tasaIva: 0.16,
      aplicaRetIsr: false,
      aplicaRetIva: false,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timbresAgotados, setTimbresAgotados] = useState(false);
  const [timbradoResult, setTimbradoResult] = useState<{
    invoiceId: string;
    uuid: string;
    fechaTimbrado: string;
    total: number;
    rawXml: string;
  } | null>(null);

  // Cargar clientes frecuentes (localStorage + API)
  useEffect(() => {
    const defaultClients: ClienteGuardado[] = [
      {
        rfc: "XAXX010101000",
        nombre: "PÚBLICO EN GENERAL",
        codigoPostal: activeOrg.codigoPostal,
        regimenFiscal: "616",
        usoCfdi: "S01",
        formaPago: "01",
        metodoPago: "PUE",
      },
    ];

    if (activeOrg.rfc === "SAAB750615GG7") {
      defaultClients.unshift({
        rfc: "GPC9506157T0",
        nombre: "GLOBAL PCNET",
        codigoPostal: "88240",
        regimenFiscal: "601",
        usoCfdi: "G03",
        formaPago: "03",
        metodoPago: "PUE",
      });
    }

    try {
      const stored = localStorage.getItem(`easyconta_clientes_${activeOrg.id}`);
      let list = stored ? JSON.parse(stored) : defaultClients;
      // Filtrar clientes ficticios
      list = list.filter(
        (c: ClienteGuardado) =>
          c.rfc !== "KCM8403217U4" &&
          c.rfc !== "GAMA850512XYZ" &&
          (activeOrg.rfc === "SAAB750615GG7" || c.rfc !== "GPC9506157T0")
      );
      localStorage.setItem(`easyconta_clientes_${activeOrg.id}`, JSON.stringify(list));
      setClientesGuardados(list);
    } catch {
      setClientesGuardados(defaultClients);
    }

    // Traer clientes únicos de facturas previas
    fetch("/api/cfdi/clients")
      .then((res) => res.json())
      .then((data) => {
        if (data.clients && Array.isArray(data.clients)) {
          setClientesGuardados((prev) => {
            const map = new Map<string, ClienteGuardado>();
            [...prev, ...data.clients].forEach((c) => {
              if (c.rfc) map.set(c.rfc.toUpperCase(), c);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [activeOrg.id, activeOrg.codigoPostal]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Seleccionar cliente y autocompletar TODO
  const seleccionarCliente = (cliente: ClienteGuardado) => {
    setReceptorRfc(cliente.rfc.toUpperCase());
    setReceptorNombre(cliente.nombre.toUpperCase());
    setReceptorCp(cliente.codigoPostal);
    setReceptorRegimen(cliente.regimenFiscal);
    setReceptorUsoCfdi(cliente.usoCfdi || "G03");
    if (cliente.formaPago) setFormaPago(cliente.formaPago);
    if (cliente.metodoPago) setMetodoPago(cliente.metodoPago);

    // Ajustar retenciones sugeridas automáticamente
    const isPm = cliente.rfc.trim().length === 12;
    setConceptos((prev) =>
      prev.map((c) => ({
        ...c,
        aplicaRetIsr: esResico && isPm,
        aplicaRetIva: esPf && isPm,
      }))
    );

    setMostrarSugerencias(false);
    setClienteAutocompletado(`✓ Datos de ${cliente.nombre} autocompletados (RFC, C.P., Régimen, Uso y Retenciones)`);
    setTimeout(() => setClienteAutocompletado(null), 5000);
  };

  // Filtrar sugerencias al escribir Nombre
  const handleNombreChange = (val: string) => {
    setReceptorNombre(val);
    const query = val.trim().toLowerCase();
    if (query.length >= 1) {
      const matches = clientesGuardados.filter(
        (c) =>
          c.nombre.toLowerCase().includes(query) ||
          c.rfc.toLowerCase().includes(query)
      );
      setSugerencias(matches);
      setMostrarSugerencias(matches.length > 0);
      setCampoActivo("nombre");
    } else {
      setMostrarSugerencias(false);
    }
  };

  // Filtrar sugerencias al escribir RFC
  const handleRfcChange = (val: string) => {
    const upper = val.toUpperCase();
    setReceptorRfc(upper);
    const query = upper.trim().toLowerCase();
    if (query.length >= 1) {
      const matches = clientesGuardados.filter(
        (c) =>
          c.rfc.toLowerCase().includes(query) ||
          c.nombre.toLowerCase().includes(query)
      );
      setSugerencias(matches);
      setMostrarSugerencias(matches.length > 0);
      setCampoActivo("rfc");
    } else {
      setMostrarSugerencias(false);
    }
  };

  // Guardar cliente actual en directorio
  const guardarClienteEnDirectorio = () => {
    if (!receptorRfc || !receptorNombre) return;
    const nuevo: ClienteGuardado = {
      rfc: receptorRfc.trim().toUpperCase(),
      nombre: receptorNombre.trim().toUpperCase(),
      codigoPostal: receptorCp.trim(),
      regimenFiscal: receptorRegimen,
      usoCfdi: receptorUsoCfdi,
      formaPago,
      metodoPago,
    };
    const actualizados = [
      nuevo,
      ...clientesGuardados.filter((c) => c.rfc.toUpperCase() !== nuevo.rfc.toUpperCase()),
    ];
    setClientesGuardados(actualizados);
    try {
      localStorage.setItem(`easyconta_clientes_${activeOrg.id}`, JSON.stringify(actualizados));
    } catch {}
    setClienteAutocompletado(`✓ ¡${nuevo.nombre} guardado en tu directorio de clientes frecuentes!`);
    setTimeout(() => setClienteAutocompletado(null), 4000);
  };

  // Precargar clientes frecuentes
  const cargarClienteEjemplo = (tipo: "PM" | "PF" | "PUBLICO") => {
    if (tipo === "PM") {
      setReceptorRfc("KCM8403217U4");
      setReceptorNombre("KIMBERLY CLARK DE MEXICO SAB DE CV");
      setReceptorCp("11560");
      setReceptorRegimen("601");
      setReceptorUsoCfdi("G03");
      // Ajustar retenciones sugeridas
      setConceptos((prev) =>
        prev.map((c) => ({
          ...c,
          aplicaRetIsr: esResico,
          aplicaRetIva: esPf,
        }))
      );
    } else if (tipo === "PF") {
      setReceptorRfc("GAMA850512XYZ");
      setReceptorNombre("Arturo Garza Mercado");
      setReceptorCp("64000");
      setReceptorRegimen("612");
      setReceptorUsoCfdi("G03");
      // Entre PF no hay retención de PM
      setConceptos((prev) =>
        prev.map((c) => ({
          ...c,
          aplicaRetIsr: false,
          aplicaRetIva: false,
        }))
      );
    } else {
      setReceptorRfc("XAXX010101000");
      setReceptorNombre("PÚBLICO EN GENERAL");
      setReceptorCp(activeOrg.codigoPostal);
      setReceptorRegimen("616"); // Sin obligaciones fiscales
      setReceptorUsoCfdi("S01");
      setConceptos((prev) =>
        prev.map((c) => ({
          ...c,
          aplicaRetIsr: false,
          aplicaRetIva: false,
        }))
      );
    }
  };

  const agregarConcepto = () => {
    setConceptos([
      ...conceptos,
      {
        claveProdServ: "80141600",
        claveUnidad: "E48",
        unidad: "Servicio",
        descripcion: "",
        cantidad: 1,
        valorUnitario: 1000,
        descuento: 0,
        aplicaIva: true,
        tasaIva: 0.16,
        aplicaRetIsr: esResico && receptorRfc.length === 12,
        aplicaRetIva: esPf && receptorRfc.length === 12,
      },
    ]);
  };

  const eliminarConcepto = (index: number) => {
    if (conceptos.length === 1) return;
    setConceptos(conceptos.filter((_, i) => i !== index));
  };

  const actualizarConcepto = (index: number, field: keyof ConceptoState, value: unknown) => {
    const updated = [...conceptos];
    updated[index] = { ...updated[index], [field]: value };
    setConceptos(updated);
  };

  // Cálculos de totales
  let subtotal = 0;
  let descuentoTotal = 0;
  let totalIva = 0;
  let totalRetIsr = 0;
  let totalRetIva = 0;

  for (const c of conceptos) {
    const imp = c.cantidad * c.valorUnitario;
    const base = Math.max(0, imp - c.descuento);
    subtotal += imp;
    descuentoTotal += c.descuento;

    if (c.aplicaIva) {
      const tasa = c.tasaIva !== undefined ? c.tasaIva : 0.16;
      totalIva += base * tasa;
    }
    if (c.aplicaRetIsr) {
      // 1.25% para RESICO PF o 10% para AE
      const tasaRetIsr = esResico ? 0.0125 : 0.1;
      totalRetIsr += base * tasaRetIsr;
    }
    if (c.aplicaRetIva) {
      // Retención 2/3 de IVA: si tasa es 8% -> 5.3333%, si tasa es 16% -> 10.6667%
      const tasa = c.aplicaIva && c.tasaIva === 0.08 ? 0.053333 : 0.106667;
      totalRetIva += base * tasa;
    }
  }

  const total = subtotal - descuentoTotal + totalIva - totalRetIsr - totalRetIva;

  // Enviar a Timbrar
  const handleTimbrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        metodoPago,
        formaPago: metodoPago === "PPD" ? "99" : formaPago,
        receptorRfc,
        receptorNombre,
        receptorCp,
        receptorRegimen,
        receptorUsoCfdi,
        conceptos: conceptos.map((c) => ({
          claveProdServ: c.claveProdServ,
          claveUnidad: c.claveUnidad,
          unidad: c.unidad,
          descripcion: c.descripcion,
          cantidad: c.cantidad,
          valorUnitario: c.valorUnitario,
          descuento: c.descuento,
          objetoImp: "02",
          ivaTasa: c.aplicaIva ? (c.tasaIva !== undefined ? c.tasaIva : 0.16) : 0,
          retIsrTasa: c.aplicaRetIsr ? (esResico ? 0.0125 : 0.1) : 0,
          retIvaTasa: c.aplicaRetIva ? (c.aplicaIva && c.tasaIva === 0.08 ? 0.053333 : 0.106667) : 0,
        })),
      };

      const res = await fetch("/api/cfdi/timbrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "TIMBRES_AGOTADOS") {
          setTimbresAgotados(true);
        }
        throw new Error(data.error || "Error al timbrar el CFDI.");
      }

      setTimbradoResult({
        invoiceId: data.invoice.id,
        uuid: data.timbrado.uuid,
        fechaTimbrado: data.timbrado.fechaTimbrado,
        total: data.timbrado.total,
        rawXml: data.timbrado.xmlTimbrado,
      });

      // Auto-guardar cliente en directorio local para próximas facturas
      guardarClienteEnDirectorio();
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const descargarXml = () => {
    if (!timbradoResult) return;
    const blob = new Blob([timbradoResult.rawXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CFDI40_${timbradoResult.uuid}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Modal de Éxito al Timbrar */}
      {timbradoResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ¡CFDI 4.0 Generado Exitosamente!
                </h3>
                <p className="text-xs text-slate-500">
                  {pacBanner.variant === "green"
                    ? "Timbrado y certificado por Facturama PAC ante el SAT."
                    : "Emitido — revisa el banner del modo activo."}
                </p>
              </div>
            </div>

            {/* Sello de Timbrado */}
            <div
              className={`p-2.5 rounded-xl text-xs font-bold text-center uppercase tracking-wide border ${
                pacBanner.variant === "green"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-amber-50 border-amber-300 text-amber-900"
              }`}
            >
              {pacBanner.variant === "green"
                ? "✓ CFDI 4.0 Timbrado y Certificado ante el SAT por Facturama PAC"
                : `⚠️ ${pacBanner.text}`}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Folio Fiscal (UUID):</span>
                <p className="font-bold text-slate-900 break-all">{timbradoResult.uuid}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha de Timbrado:</span>
                <span className="text-slate-700 font-bold">{timbradoResult.fechaTimbrado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Timbrado:</span>
                <span className="text-emerald-700 font-bold">
                  {formatCurrency(timbradoResult.total)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Se generó automáticamente la <strong>Póliza Contable de Ingreso / Diario</strong> y se actualizó el acumulado para la declaración provisional SAT 2026.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={`/dashboard/facturas/${timbradoResult.invoiceId}/pdf`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
              >
                <FileText className="w-4 h-4" /> Ver Expediente PDF
              </Link>
              <button
                onClick={descargarXml}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200"
              >
                <Download className="w-4 h-4" /> XML
              </button>
              <Link
                href="/dashboard/polizas"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200"
              >
                <FileSpreadsheet className="w-4 h-4" /> Póliza
              </Link>
              <button
                onClick={() => setTimbradoResult(null)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-1"
              >
                Emitir otra factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner PAC — dinámico según PAC_MODE */}
      <div
        className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs border ${
          pacBanner.variant === "green"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : pacBanner.variant === "slate"
            ? "bg-slate-50 border-slate-200 text-slate-700"
            : "bg-amber-50 border-amber-300 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider ${
              pacBanner.variant === "green"
                ? "bg-emerald-200 text-emerald-950"
                : pacBanner.variant === "slate"
                ? "bg-slate-200 text-slate-800"
                : "bg-amber-200 text-amber-950"
            }`}
          >
            {pacBanner.variant === "green" ? "PAC Facturama" : "Modo Demo"}
          </span>
          <span className="font-semibold">{pacBanner.text}</span>
        </div>
      </div>

      <form onSubmit={handleTimbrar} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div>
              <strong className="block font-bold mb-0.5 text-rose-900">Aviso de Emisión:</strong>
              <span>{error}</span>
            </div>
            {timbresAgotados && (
              <Link
                href="/precios"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
              >
                Actualizar Plan en /precios →
              </Link>
            )}
          </div>
        )}

        {/* Sección Receptor con Autocompletado de Clientes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  1. Datos del Receptor (Cliente)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ⚡ Autocompletado Activo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Escribe las primeras letras del nombre o RFC para autollenar todos los campos del cliente.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={guardarClienteEnDirectorio}
                title="Guardar este cliente para autocompletar en el futuro"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Guardar Cliente</span>
              </button>
              <span className="text-[11px] text-slate-400 font-medium">Ejemplos:</span>
              <button
                type="button"
                onClick={() => cargarClienteEjemplo("PM")}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Empresa (PM)
              </button>
              <button
                type="button"
                onClick={() => cargarClienteEjemplo("PUBLICO")}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Público Gral.
              </button>
            </div>
          </div>

          {/* Notificación de Autocompletado Exitoso */}
          {clienteAutocompletado && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2 animate-in fade-in">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{clienteAutocompletado}</span>
            </div>
          )}

          <div ref={suggestionsRef} className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* RFC Receptor con Autocompletado */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RFC Receptor *
              </label>
              <input
                type="text"
                required
                value={receptorRfc}
                onChange={(e) => handleRfcChange(e.target.value)}
                onFocus={() => {
                  if (receptorRfc.trim().length >= 1) {
                    handleRfcChange(receptorRfc);
                  }
                }}
                placeholder="Ej. XAXX010101000 o RFC del cliente"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Nombre o Razón Social con Autocompletado */}
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre o Razón Social (según Constancia SAT) *
              </label>
              <input
                type="text"
                required
                value={receptorNombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                onFocus={() => {
                  if (receptorNombre.trim().length >= 1) {
                    handleNombreChange(receptorNombre);
                  }
                }}
                placeholder="Empieza a escribir o ingresa el nombre..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              {/* Menú flotante de sugerencias predictivas */}
              {mostrarSugerencias && sugerencias.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Clientes sugeridos ({sugerencias.length})</span>
                    <span className="text-emerald-700 font-normal">Haz clic para autollenar todos los campos</span>
                  </div>
                  {sugerencias.map((c) => (
                    <button
                      key={c.rfc}
                      type="button"
                      onClick={() => seleccionarCliente(c)}
                      className="w-full text-left p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{c.nombre}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                          <span className="font-bold text-slate-700">{c.rfc}</span>
                          <span>•</span>
                          <span>C.P. {c.codigoPostal}</span>
                          <span>•</span>
                          <span>Régimen {c.regimenFiscal}</span>
                          <span>•</span>
                          <span>Uso {c.usoCfdi}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-100 px-2 py-0.5 rounded-md">
                        Seleccionar ↵
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Postal Receptor *
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={receptorCp}
                onChange={(e) => setReceptorCp(e.target.value)}
                placeholder="00000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Régimen Fiscal Receptor *
              </label>
              <select
                value={receptorRegimen}
                onChange={(e) => setReceptorRegimen(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(REGIMENES_SAT).map(([code, name]) => (
                  <option key={code} value={code} className="text-slate-900">
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Uso de CFDI *
              </label>
              <select
                value={receptorUsoCfdi}
                onChange={(e) => setReceptorUsoCfdi(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(USOS_CFDI).map(([code, name]) => (
                  <option key={code} value={code} className="text-slate-900">
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sección Método y Forma de Pago */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              2. Método y Forma de Pago (Conciliación PUE vs PPD)
            </h2>
            <p className="text-xs text-slate-500">
              Define el momento de acumulación fiscal para ISR e IVA SAT 2026
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Método de Pago *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMetodoPago("PUE");
                    if (formaPago === "99") setFormaPago("03");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    metodoPago === "PUE"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-bold inline-flex items-center gap-1">
                    PUE
                    <AyudaTermino terminoId="pue" />
                  </div>
                  <div className="text-[11px] opacity-80">Pago en una sola exhibición (Contado)</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMetodoPago("PPD");
                    setFormaPago("99");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    metodoPago === "PPD"
                      ? "border-amber-500 bg-amber-50 text-amber-950 font-bold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-bold inline-flex items-center gap-1">
                    PPD
                    <AyudaTermino terminoId="ppd" />
                  </div>
                  <div className="text-[11px] opacity-80">Parcialidades o Diferido (Crédito)</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Pago *
              </label>
              <select
                disabled={metodoPago === "PPD"}
                value={metodoPago === "PPD" ? "99" : formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              >
                {Object.entries(FORMAS_PAGO).map(([code, name]) => (
                  <option key={code} value={code} className="text-slate-900">
                    {code} - {name}
                  </option>
                ))}
              </select>
              {metodoPago === "PPD" && (
                <span className="text-[11px] text-amber-700 mt-1 block">
                  En CFDI con método PPD, la forma de pago por regla SAT debe ser &ldquo;99 Por definir&rdquo;.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sección Conceptos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                3. Conceptos de la Factura
              </h2>
              <p className="text-xs text-slate-500">
                Desglose de servicios, productos, cantidades e impuestos aplicables
              </p>
            </div>
            <button
              type="button"
              onClick={agregarConcepto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Concepto
            </button>
          </div>

          <div className="space-y-4">
            {conceptos.map((concepto, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
              >
                {conceptos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarConcepto(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Eliminar este concepto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Clave SAT Prod/Serv
                    </label>
                    <input
                      type="text"
                      required
                      value={concepto.claveProdServ}
                      onChange={(e) =>
                        actualizarConcepto(idx, "claveProdServ", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Clave Unidad (E48, etc)
                    </label>
                    <input
                      type="text"
                      required
                      value={concepto.claveUnidad}
                      onChange={(e) =>
                        actualizarConcepto(idx, "claveUnidad", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={concepto.cantidad}
                      onChange={(e) =>
                        actualizarConcepto(idx, "cantidad", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Precio Unitario (MXN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={concepto.valorUnitario}
                      onChange={(e) =>
                        actualizarConcepto(
                          idx,
                          "valorUnitario",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Descripción del Bien o Servicio *
                  </label>
                  <input
                    type="text"
                    required
                    value={concepto.descripcion}
                    onChange={(e) =>
                      actualizarConcepto(idx, "descripcion", e.target.value)
                    }
                    placeholder="Descripción detallada de la operación"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Toggles de Impuestos del Concepto con soporte IVA 8% Frontera */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">
                    Impuestos aplicables:
                  </span>

                  {/* Selector de Tasa de IVA */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={concepto.aplicaIva}
                        onChange={(e) =>
                          actualizarConcepto(idx, "aplicaIva", e.target.checked)
                        }
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 font-medium">IVA Trasladado:</span>
                    </label>

                    {concepto.aplicaIva && (
                      <select
                        value={concepto.tasaIva !== undefined ? concepto.tasaIva : 0.16}
                        onChange={(e) =>
                          actualizarConcepto(idx, "tasaIva", Number(e.target.value))
                        }
                        className="px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-950 font-bold rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value={0.16}>16% (General)</option>
                        <option value={0.08}>⚡ 8% (Estímulo Frontera Norte)</option>
                        <option value={0}>0% (Tasa Cero)</option>
                      </select>
                    )}
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={concepto.aplicaRetIsr}
                      onChange={(e) =>
                        actualizarConcepto(idx, "aplicaRetIsr", e.target.checked)
                      }
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700">
                      Retención ISR ({esResico ? "1.25% RESICO" : "10% Honorarios"})
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={concepto.aplicaRetIva}
                      onChange={(e) =>
                        actualizarConcepto(idx, "aplicaRetIva", e.target.checked)
                      }
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-slate-700">
                      Retención IVA (
                      {concepto.aplicaIva && concepto.tasaIva === 0.08
                        ? "5.3333% Frontera"
                        : "10.6667%"}
                      )
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de Importes y Botón de Timbrado */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="max-w-md text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1 text-slate-700 font-semibold">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              Validación SAT 2026:
            </div>
            <p>
              El CFDI 4.0 será firmado con la llave privada del CSD del emisor y certificado por el PAC con timbre fiscal digital oficial UUID v4 y código QR.
            </p>
          </div>

          <div className="w-full md:w-80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {descuentoTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Descuento:</span>
                <span className="font-mono font-bold text-rose-600">
                  -{formatCurrency(descuentoTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>IVA Trasladado:</span>
              <span className="font-mono font-bold text-slate-900">
                +{formatCurrency(totalIva)}
              </span>
            </div>
            {totalRetIsr > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Retención ISR:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(totalRetIsr)}
                </span>
              </div>
            )}
            {totalRetIva > 0 && (
              <div className="flex justify-between text-rose-800">
                <span>Retención IVA:</span>
                <span className="font-mono font-bold">
                  -{formatCurrency(totalRetIva)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
              <span>Total CFDI:</span>
              <span className="font-mono text-emerald-700">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-700/20 disabled:opacity-50 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              {loading ? "Timbrando con PAC..." : "Timbrar Factura CFDI 4.0"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
