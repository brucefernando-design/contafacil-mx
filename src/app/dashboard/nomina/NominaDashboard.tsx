"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  DollarSign,
  Plus,
  Play,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
  Building,
  UserCheck,
  Mail,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Employee {
  id: string;
  numeroEmpleado: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  rfc: string;
  curp: string;
  nss?: string | null;
  codigoPostal: string;
  puesto: string;
  departamento?: string | null;
  periodicidadPago: string;
  salarioDiario: number;
  salarioBaseCotApor: number;
  status: string;
}

interface PayrollReceipt {
  id: string;
  diasTrabajados: number;
  sueldoBruto: number;
  totalPercepciones: number;
  retencionIsr: number;
  imssObrero: number;
  totalDeducciones: number;
  netoPagar: number;
  status: string;
  uuid?: string | null;
  employee: Employee;
}

interface PayrollPeriod {
  id: string;
  descripcion: string;
  tipoNomina: string;
  periodicidad: string;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string;
  diasPagados: number;
  totalPercepciones: number;
  totalDeducciones: number;
  totalRetencionIsr: number;
  totalImssObrero: number;
  totalNeto: number;
  status: string;
  polizaGenerada: boolean;
  receipts: PayrollReceipt[];
}

interface NominaDashboardProps {
  activeOrg: {
    id?: string;
    rfc: string;
    razonSocial: string;
    codigoPostal: string;
  };
}

export function NominaDashboard({ activeOrg }: NominaDashboardProps) {
  const [activeTab, setActiveTab] = useState<"periodos" | "empleados">("periodos");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);

  // Modales
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario Nuevo Empleado
  const [empForm, setEmpForm] = useState({
    numeroEmpleado: "",
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    rfc: "",
    curp: "",
    nss: "",
    codigoPostal: activeOrg.codigoPostal || "",
    puesto: "Auxiliar Contable",
    departamento: "Administración",
    periodicidadPago: "QUINCENAL",
    salarioDiario: 650,
  });

  // Formulario Nuevo Periodo
  const [periodForm, setPeriodForm] = useState({
    descripcion: `1ra Quincena ${new Date().toLocaleString("es-MX", { month: "long" })} ${new Date().getFullYear()}`,
    tipoNomina: "ORDINARIA",
    periodicidad: "QUINCENAL",
    fechaInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    fechaFin: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split("T")[0],
    fechaPago: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split("T")[0],
    diasPagados: 15,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, perRes] = await Promise.all([
        fetch("/api/payroll/employees"),
        fetch("/api/payroll/periods"),
      ]);

      const empData = await empRes.json();
      const perData = await perRes.json();

      if (empData.employees) setEmployees(empData.employees);
      if (perData.periods) {
        setPeriods(perData.periods);
        if (perData.periods.length > 0 && !selectedPeriod) {
          setSelectedPeriod(perData.periods[0]);
        }
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Error de conexión al cargar datos de nómina" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/payroll/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear colaborador");

      setFeedbackMsg({ type: "success", text: "Colaborador registrado exitosamente." });
      setShowEmployeeModal(false);
      setEmpForm({
        numeroEmpleado: "",
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        rfc: "",
        curp: "",
        nss: "",
        codigoPostal: activeOrg.codigoPostal || "",
        puesto: "",
        departamento: "",
        periodicidadPago: "QUINCENAL",
        salarioDiario: 650,
      });
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(periodForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar la nómina");

      setFeedbackMsg({ type: "success", text: "Nómina calculada y generada exitosamente." });
      setShowPeriodModal(false);
      fetchData();
      if (data.period) setSelectedPeriod(data.period);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerarPoliza = async (periodId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/payroll/periods/${periodId}/poliza`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar póliza");

      setFeedbackMsg({ type: "success", text: data.message });
      fetchData();
      if (selectedPeriod && selectedPeriod.id === periodId) {
        setSelectedPeriod({ ...selectedPeriod, polizaGenerada: true });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispersarRecibos = async (periodId: string) => {
    if (!confirm("¿Deseas enviar los recibos de nómina por correo electrónico a todos los colaboradores de este periodo?")) {
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/payroll/periods/${periodId}/dispersar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al dispersar recibos");

      const { resumen } = data;
      setFeedbackMsg({
        type: "success",
        text: `Dispersión completada: ${resumen.enviados} enviados, ${resumen.omitidosSinEmail} omitidos (sin email)${resumen.fallidos > 0 ? `, ${resumen.fallidos} con error` : ""}.`,
      });
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este periodo de nómina?")) return;
    try {
      const res = await fetch(`/api/payroll/periods/${periodId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      setFeedbackMsg({ type: "success", text: "Periodo eliminado." });
      setSelectedPeriod(null);
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Métricas Globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Colaboradores Activos
            </span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {employees.filter((e) => e.status === "ACTIVO").length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Plantilla registrada</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Periodos Procesados
            </span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{periods.length}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Quincenas calculadas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ISR Salarios Retenido
            </span>
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(
              periods.reduce((acc, p) => acc + Number(p.totalRetencionIsr || 0), 0)
            )}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Por enterar al SAT</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              IMSS Obrero Retenido
            </span>
            <Building className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(
              periods.reduce((acc, p) => acc + Number(p.totalImssObrero || 0), 0)
            )}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Cuotas obreras por pagar</span>
        </div>
      </div>

      {/* Tabs y Acciones Principales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("periodos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "periodos"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Periodos y Recibos
            </button>
            <button
              onClick={() => setActiveTab("empleados")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "empleados"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Directorio de Colaboradores ({employees.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "empleados" ? (
              <button
                onClick={() => setShowEmployeeModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Alta de Colaborador
              </button>
            ) : (
              <button
                onClick={() => {
                  if (employees.filter((e) => e.status === "ACTIVO").length === 0) {
                    alert("Registra al menos un colaborador antes de calcular la nómina.");
                    setActiveTab("empleados");
                    setShowEmployeeModal(true);
                    return;
                  }
                  setShowPeriodModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
              >
                <Play className="w-4 h-4" />
                Calcular Nueva Nómina
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: PERIODOS Y RECIBOS */}
        {activeTab === "periodos" && (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-xs">Cargando nóminas...</p>
              </div>
            ) : periods.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No hay nóminas procesadas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Genera la primera nómina quincenal o semanal calculando automáticamente retenciones de ISR Art. 96 e IMSS.
                </p>
                <button
                  onClick={() => {
                    if (employees.length === 0) {
                      setActiveTab("empleados");
                      setShowEmployeeModal(true);
                    } else {
                      setShowPeriodModal(true);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {employees.length === 0 ? "Primero da de alta un colaborador" : "Calcular Quincena"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de Quincenas */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Historial de Periodos
                  </h4>
                  {periods.map((p) => {
                    const isSelected = selectedPeriod?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPeriod(p)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{p.descripcion}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === "TIMBRADA"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
                          <span>Pago: {new Date(p.fechaPago).toLocaleDateString("es-MX")}</span>
                          <span className="font-bold text-slate-900">
                            Neto: {formatCurrency(Number(p.totalNeto))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detalle y Recibos del Periodo Seleccionado */}
                <div className="lg:col-span-2 space-y-4">
                  {selectedPeriod ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                        <div>
                          <h3 className="text-base font-black text-slate-900">
                            {selectedPeriod.descripcion}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Fecha de Pago:{" "}
                            <strong>
                              {new Date(selectedPeriod.fechaPago).toLocaleDateString("es-MX")}
                            </strong>{" "}
                            ({selectedPeriod.diasPagados} días pagados)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDispersarRecibos(selectedPeriod.id)}
                            disabled={submitting || !selectedPeriod.receipts || selectedPeriod.receipts.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                            title="Enviar recibos de nómina por correo a colaboradores"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Dispersar Recibos
                          </button>

                          {!selectedPeriod.polizaGenerada ? (
                            <button
                              onClick={() => handleGenerarPoliza(selectedPeriod.id)}
                              disabled={submitting}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Generar Póliza
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              Póliza en Balanza
                            </span>
                          )}

                          <button
                            onClick={() => handleDeletePeriod(selectedPeriod.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Eliminar periodo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Resumen Financiero del Periodo */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Percepciones Brutas
                          </span>
                          <span className="text-sm font-black text-slate-900">
                            {formatCurrency(Number(selectedPeriod.totalPercepciones))}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Retención ISR Art. 96
                          </span>
                          <span className="text-sm font-black text-amber-700">
                            - {formatCurrency(Number(selectedPeriod.totalRetencionIsr))}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            IMSS Cuota Obrera
                          </span>
                          <span className="text-sm font-black text-purple-700">
                            - {formatCurrency(Number(selectedPeriod.totalImssObrero))}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Neto a Dispersar
                          </span>
                          <span className="text-sm font-black text-emerald-700">
                            {formatCurrency(Number(selectedPeriod.totalNeto))}
                          </span>
                        </div>
                      </div>

                      {/* Tabla de Recibos Individuales */}
                      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Colaborador</th>
                              <th className="p-3">Sueldo Bruto</th>
                              <th className="p-3">ISR (Art. 96)</th>
                              <th className="p-3">IMSS Obrero</th>
                              <th className="p-3">Neto a Pagar</th>
                              <th className="p-3 text-right">CFDI 4.0</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedPeriod.receipts?.map((rcpt) => (
                              <tr key={rcpt.id} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <div className="font-bold text-slate-900">
                                    {rcpt.employee.nombre} {rcpt.employee.primerApellido}{" "}
                                    {rcpt.employee.segundoApellido || ""}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500">
                                    {rcpt.employee.rfc} • {rcpt.employee.puesto}
                                  </div>
                                </td>
                                <td className="p-3 font-semibold text-slate-800">
                                  {formatCurrency(Number(rcpt.sueldoBruto))}
                                </td>
                                <td className="p-3 font-semibold text-amber-700">
                                  {formatCurrency(Number(rcpt.retencionIsr))}
                                </td>
                                <td className="p-3 font-semibold text-purple-700">
                                  {formatCurrency(Number(rcpt.imssObrero))}
                                </td>
                                <td className="p-3 font-bold text-emerald-800">
                                  {formatCurrency(Number(rcpt.netoPagar))}
                                </td>
                                <td className="p-3 text-right">
                                  {rcpt.uuid ? (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        SAT Timbrado
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                                        {rcpt.uuid.slice(0, 8)}...
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        setSubmitting(true);
                                        try {
                                          const res = await fetch(`/api/payroll/receipts/${rcpt.id}/timbrar`, {
                                            method: "POST",
                                          });
                                          const data = await res.json();
                                          if (!res.ok) throw new Error(data.error || "Error al timbrar");
                                          setFeedbackMsg({
                                            type: "success",
                                            text: `Recibo timbrado ante el SAT. UUID: ${data.uuid}`,
                                          });
                                          fetchData();
                                        } catch (err: any) {
                                          setFeedbackMsg({ type: "error", text: err.message });
                                        } finally {
                                          setSubmitting(false);
                                        }
                                      }}
                                      disabled={submitting}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                                    >
                                      Timbrar SAT
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      Selecciona un periodo para ver sus recibos y desglose fiscal.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIRECTORIO DE EMPLEADOS */}
        {activeTab === "empleados" && (
          <div className="p-6">
            {employees.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">No hay colaboradores registrados</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Registra a tus trabajadores con su RFC, CURP y Salario Diario para emitir sus recibos fiscales.
                </p>
                <button
                  onClick={() => setShowEmployeeModal(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Registrar Primer Colaborador
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">No. Emp</th>
                      <th className="p-3">Nombre Completo</th>
                      <th className="p-3">RFC / CURP</th>
                      <th className="p-3">Puesto / Depto</th>
                      <th className="p-3">Salario Diario</th>
                      <th className="p-3">Periodicidad</th>
                      <th className="p-3">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-500">
                          {emp.numeroEmpleado}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {emp.nombre} {emp.primerApellido} {emp.segundoApellido || ""}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          <div>{emp.rfc}</div>
                          <div className="text-slate-400 text-[10px]">{emp.curp}</div>
                        </td>
                        <td className="p-3 text-slate-700">
                          <div>{emp.puesto}</div>
                          <div className="text-[10px] text-slate-400">{emp.departamento}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {formatCurrency(Number(emp.salarioDiario))}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {emp.periodicidadPago}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.status === "ACTIVO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL ALTA COLABORADOR */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Alta de Colaborador (Nómina SAT)
              </h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre(s) *</label>
                  <input
                    type="text"
                    required
                    value={empForm.nombre}
                    onChange={(e) => setEmpForm({ ...empForm, nombre: e.target.value })}
                    placeholder="Ej. JUAN"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primer Apellido *</label>
                  <input
                    type="text"
                    required
                    value={empForm.primerApellido}
                    onChange={(e) => setEmpForm({ ...empForm, primerApellido: e.target.value })}
                    placeholder="Ej. PÉREZ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Segundo Apellido</label>
                  <input
                    type="text"
                    value={empForm.segundoApellido}
                    onChange={(e) => setEmpForm({ ...empForm, segundoApellido: e.target.value })}
                    placeholder="Ej. LÓPEZ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RFC (13 caracteres) *</label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={empForm.rfc}
                    onChange={(e) => setEmpForm({ ...empForm, rfc: e.target.value.toUpperCase() })}
                    placeholder="PELJ850101XYZ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CURP (18 caracteres) *</label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={empForm.curp}
                    onChange={(e) => setEmpForm({ ...empForm, curp: e.target.value.toUpperCase() })}
                    placeholder="PELJ850101HDFRNR02"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NSS (11 dígitos IMSS)</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={empForm.nss}
                    onChange={(e) => setEmpForm({ ...empForm, nss: e.target.value })}
                    placeholder="12345678901"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">C.P. Fiscal (SAT) *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={empForm.codigoPostal}
                    onChange={(e) => setEmpForm({ ...empForm, codigoPostal: e.target.value })}
                    placeholder="88240"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Puesto</label>
                  <input
                    type="text"
                    value={empForm.puesto}
                    onChange={(e) => setEmpForm({ ...empForm, puesto: e.target.value })}
                    placeholder="Ej. Auxiliar Contable"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={empForm.departamento}
                    onChange={(e) => setEmpForm({ ...empForm, departamento: e.target.value })}
                    placeholder="Ej. Contabilidad"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Salario Diario ($ MXN) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={empForm.salarioDiario}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, salarioDiario: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Quincenal aprox: {formatCurrency(empForm.salarioDiario * 15)}
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Periodicidad de Pago</label>
                  <select
                    value={empForm.periodicidadPago}
                    onChange={(e) => setEmpForm({ ...empForm, periodicidadPago: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="QUINCENAL">Quincenal (15 días)</option>
                    <option value="SEMANAL">Semanal (7 días)</option>
                    <option value="MENSUAL">Mensual (30 días)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar Colaborador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PERIODO DE NÓMINA */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-600" />
                Calcular Periodo de Nómina
              </h3>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción del Periodo *</label>
                <input
                  type="text"
                  required
                  value={periodForm.descripcion}
                  onChange={(e) => setPeriodForm({ ...periodForm, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.fechaInicio}
                    onChange={(e) => setPeriodForm({ ...periodForm, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Fin *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.fechaFin}
                    onChange={(e) => setPeriodForm({ ...periodForm, fechaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Pago *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.fechaPago}
                    onChange={(e) => setPeriodForm({ ...periodForm, fechaPago: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Días a Pagar *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={periodForm.diasPagados}
                    onChange={(e) =>
                      setPeriodForm({ ...periodForm, diasPagados: parseFloat(e.target.value) || 15 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px]">
                Se calcularán automáticamente los recibos para los{" "}
                <strong>{employees.filter((e) => e.status === "ACTIVO").length} colaboradores activos</strong> aplicando
                las tarifas vigentes de ISR (Art. 96) y cuotas obreras IMSS.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Calculando..." : "Calcular Nómina Masiva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
