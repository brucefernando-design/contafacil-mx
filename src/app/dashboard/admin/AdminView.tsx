"use client";

import { useState } from "react";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Receipt,
  Gift,
  Plus,
  Search,
  Sparkles,
  Coins,
  CheckCircle2,
  Clock,
  Key,
  X,
  RefreshCw,
  UserPlus,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Lock,
  Unlock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isDespacho: boolean;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    periodEnd: string | null;
    timbresIncluidos: number;
    timbresUsados: number;
    mpPaymentId: string | null;
    updatedAt: string;
  } | null;
  memberships: {
    role: string;
    organization: {
      id: string;
      rfc: string;
      razonSocial: string;
      regimenFiscal: string;
    };
  }[];
}

interface Metrics {
  totalUsers: number;
  totalOrgs: number;
  totalInvoices: number;
  freeUsers: number;
  proUsers: number;
  despachoUsers: number;
  admins: number;
  contadores: number;
}

interface AdminViewProps {
  initialUsers: UserItem[];
  initialMetrics: Metrics;
  currentAdminEmail: string;
}

export function AdminView({
  initialUsers,
  initialMetrics,
  currentAdminEmail,
}: AdminViewProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("TODOS");
  const [filterRole, setFilterRole] = useState<string>("TODOS");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserItem | null>(null);

  // Estados de carga y mensajes
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Formulario Crear Usuario
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    isDespacho: false,
    plan: "PRO",
    modalidad: "CORTESIA_TIMBRES", // "CORTESIA_TIMBRES" | "GRATIS_TOTAL" | "NORMAL" | "PRUEBA_TEMPORAL"
    timbresPersonalizados: "50",
    vigenciaYears: "10",
    cortesiaDias: "15",
    status: "ACTIVE",
  });

  // Formulario Editar / Regalar a Usuario
  const [editForm, setEditForm] = useState({
    plan: "PRO",
    modalidad: "CORTESIA_TIMBRES",
    agregarTimbres: "",
    resetTimbresUsados: false,
    role: "USER",
    isDespacho: false,
    vigenciaYears: "10",
    timbresPersonalizados: "",
    status: "ACTIVE",
    cortesiaDias: "",
  });

  const handleTogglePause = async (userId: string, currentStatus: string) => {
    const newAction = currentStatus === "PAUSED" ? "RESUME" : "PAUSE";
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar estado.");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                subscription: u.subscription
                  ? { ...u.subscription, status: data.status }
                  : {
                      plan: "FREE",
                      status: data.status,
                      periodEnd: null,
                      timbresIncluidos: 10,
                      timbresUsados: 0,
                      mpPaymentId: null,
                      updatedAt: new Date().toISOString(),
                    },
              }
            : u
        )
      );
      setFeedbackMessage({
        text: data.message,
        type: "success",
      });
    } catch (err: unknown) {
      setFeedbackMessage({
        text: (err as Error).message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (user: UserItem) => {
    setSelectedUserForEdit(user);
    const sub = user.subscription;
    const isVitalicio = sub?.periodEnd && new Date(sub.periodEnd).getFullYear() > 2030;
    const isCortesialSoloTimbres = isVitalicio && (sub?.timbresIncluidos || 0) === 0;

    setEditForm({
      plan: sub?.plan || "FREE",
      modalidad: isCortesialSoloTimbres
        ? "CORTESIA_TIMBRES"
        : isVitalicio
        ? "GRATIS_TOTAL"
        : "NORMAL",
      agregarTimbres: "",
      resetTimbresUsados: false,
      role: user.role,
      isDespacho: user.isDespacho,
      vigenciaYears: "10",
      timbresPersonalizados: String(sub?.timbresIncluidos || 50),
      status: sub?.status || "ACTIVE",
      cortesiaDias: "",
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario.");

      // Refrescar lista
      const listRes = await fetch("/api/admin/users");
      const listData = await listRes.json();
      if (listData.users) {
        setUsers(listData.users);
        setMetrics(listData.metrics);
      }

      setFeedbackMessage({
        text: `Usuario ${createForm.name} creado exitosamente.`,
        type: "success",
      });
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "USER",
        isDespacho: false,
        plan: "PRO",
        modalidad: "CORTESIA_TIMBRES",
        timbresPersonalizados: "50",
        vigenciaYears: "10",
        cortesiaDias: "15",
        status: "ACTIVE",
      });
    } catch (err: unknown) {
      setFeedbackMessage({
        text: (err as Error).message || "Error al crear usuario.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setLoading(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${selectedUserForEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar usuario.");

      // Refrescar lista
      const listRes = await fetch("/api/admin/users");
      const listData = await listRes.json();
      if (listData.users) {
        setUsers(listData.users);
        setMetrics(listData.metrics);
      }

      setFeedbackMessage({
        text: `Usuario ${selectedUserForEdit.name} actualizado exitosamente.`,
        type: "success",
      });
      setSelectedUserForEdit(null);
    } catch (err: unknown) {
      setFeedbackMessage({
        text: (err as Error).message || "Error al actualizar cuenta.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    if (filterPlan !== "TODOS" && (u.subscription?.plan || "FREE") !== filterPlan) {
      return false;
    }
    if (filterRole !== "TODOS" && u.role !== filterRole) {
      return false;
    }
    if (filterStatus !== "TODOS") {
      const isPaused = u.subscription?.status === "PAUSED";
      if (filterStatus === "PAUSED" && !isPaused) return false;
      if (filterStatus === "ACTIVE" && isPaused) return false;
    }
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(term);
      const matchEmail = u.email.toLowerCase().includes(term);
      const matchRfc = u.memberships.some((m) =>
        m.organization.rfc.toLowerCase().includes(term) ||
        m.organization.razonSocial.toLowerCase().includes(term)
      );
      return matchName || matchEmail || matchRfc;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Panel Super Admin (Dueño de la Plataforma)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] tracking-wider uppercase">
              Owner Mode
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sesión activa como <strong className="text-slate-700">{currentAdminEmail}</strong>. Control maestro de usuarios, regalo de planes y cuentas cortesía.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario Directo</span>
        </button>
      </div>

      {/* Banner de Retroalimentación */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="hover:opacity-75 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Métricas Globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Usuarios
          </span>
          <div className="text-2xl font-black text-slate-900">{metrics.totalUsers}</div>
          <div className="text-[11px] text-slate-500">
            {metrics.admins} Admins · {metrics.contadores} Contadores
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Empresas (RFCs)
          </span>
          <div className="text-2xl font-black text-blue-600">{metrics.totalOrgs}</div>
          <div className="text-[11px] text-slate-500">Activas en la plataforma</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Distribución Planes
          </span>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="text-slate-500">{metrics.freeUsers} Free</span> ·{" "}
            <span className="text-emerald-600">{metrics.proUsers} PRO</span> ·{" "}
            <span className="text-indigo-600">{metrics.despachoUsers} Despacho</span>
          </div>
          <div className="text-[11px] text-slate-500">Suscripciones totales</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Comprobantes Totales
          </span>
          <div className="text-2xl font-black text-emerald-600">{metrics.totalInvoices}</div>
          <div className="text-[11px] text-slate-500">Emitidos o cargados</div>
        </div>
      </div>

      {/* Explicación de las dos modalidades de cortesía */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <Gift className="w-4 h-4 text-amber-600" />
            <span>Modalidad A: Cuenta 100% Gratuita (Personal / Socios)</span>
          </div>
          <p className="text-slate-600">
            Le asignas plan PRO o DESPACHO vitalicio con timbres incluidos. El usuario tiene acceso total y timbres sin costo. Ideal para tu uso personal o socios.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-900">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Modalidad B: Cortesía "Solo pagan sus timbres" (Cero gasto para ti)</span>
          </div>
          <p className="text-slate-600">
            El usuario tiene acceso vitalicio a todo el software (contabilidad, bóveda, multi-empresa, motor fiscal) con <strong>0 timbres incluidos</strong>. Para facturar CFDI real debe comprar sus paquetes de timbres. <strong>A ti no te cuesta nada en el PAC</strong>.
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, correo o RFC..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="TODOS">Todos los Planes</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="DESPACHO">DESPACHO</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="TODOS">Todos los Roles</option>
            <option value="USER">USER</option>
            <option value="CONTADOR">CONTADOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="PAUSED">En Pausa</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Usuario</th>
                <th className="px-6 py-3.5 font-bold">Rol</th>
                <th className="px-6 py-3.5 font-bold">Plan Actual</th>
                <th className="px-6 py-3.5 font-bold">Estado</th>
                <th className="px-6 py-3.5 font-bold">Vigencia</th>
                <th className="px-6 py-3.5 font-bold">Timbres (Usados / Inc.)</th>
                <th className="px-6 py-3.5 font-bold">RFCs Registrados</th>
                <th className="px-6 py-3.5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No se encontraron usuarios con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const sub = u.subscription;
                  const plan = sub?.plan || "FREE";
                  const isVitalicio = sub?.periodEnd && new Date(sub.periodEnd).getFullYear() > 2030;
                  const timbresRestantes = Math.max(0, (sub?.timbresIncluidos || 0) - (sub?.timbresUsados || 0));
                  const esSoloTimbres = (sub?.timbresIncluidos || 0) === 0 && plan !== "FREE";
                  const isPaused = sub?.status === "PAUSED";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === "ADMIN"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : u.role === "CONTADOR"
                              ? "bg-indigo-100 text-indigo-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.role === "ADMIN" && <ShieldCheck className="w-3 h-3 mr-1 text-amber-700" />}
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black tracking-tight ${
                            plan === "DESPACHO"
                              ? "bg-indigo-100 text-indigo-900"
                              : plan === "PRO"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {plan}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {isPaused ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                            En Pausa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Activa
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {isVitalicio ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Vitalicio
                          </span>
                        ) : sub?.periodEnd ? (
                          <span className="text-[11px] text-slate-600 font-mono">
                            {new Date(sub.periodEnd).toLocaleDateString("es-MX")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sin expiración (FREE)</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {esSoloTimbres ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <Coins className="w-3 h-3 text-amber-600" />
                            0 inc. (Pagan timbres)
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-900 font-bold">
                              {sub?.timbresUsados || 0} / {sub?.timbresIncluidos || 10}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {timbresRestantes} disponibles
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {u.memberships.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">Sin empresas</span>
                        ) : (
                          <div className="space-y-0.5 max-w-xs truncate">
                            {u.memberships.map((m) => (
                              <div key={m.organization.id} className="text-[11px]">
                                <strong className="font-mono text-slate-800">{m.organization.rfc}</strong>{" "}
                                <span className="text-slate-500 truncate">({m.organization.razonSocial})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePause(u.id, sub?.status || "ACTIVE")}
                            disabled={loading}
                            title={isPaused ? "Reanudar cuenta inmediatamente" : "Pausar cuenta temporalmente"}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                              isPaused
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {isPaused ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reanudar</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pausar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            <span>Gestionar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario Directo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Crear Usuario Directo</h3>
                  <p className="text-xs text-slate-500">Asigna plan gratuito vitalicio o cortesía solo timbres.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="juan@ejemplo.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Contraseña Inicial</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Rol en el Sistema</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                  >
                    <option value="USER">USER (Cliente / Contribuyente)</option>
                    <option value="CONTADOR">CONTADOR (Despacho)</option>
                    <option value="ADMIN">ADMIN (Super Administrador)</option>
                  </select>
                </div>
              </div>

              {/* Plan y Modalidad */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Plan Asignado:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "FREE", name: "FREE", desc: "1 RFC, 10 timbres" },
                    { id: "PRO", name: "PRO", desc: "3 RFCs, 50 timbres" },
                    { id: "DESPACHO", name: "DESPACHO", desc: "25 RFCs, multi-cliente" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, plan: p.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        createForm.plan === p.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-black text-xs">{p.name}</div>
                      <div className="text-[10px] opacity-75">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Modalidad */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Modalidad de Facturación / Cortesía:</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="modalidad"
                      value="CORTESIA_TIMBRES"
                      checked={createForm.modalidad === "CORTESIA_TIMBRES"}
                      onChange={(e) => setCreateForm({ ...createForm, modalidad: e.target.value })}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        Cortesía "Solo pagan sus timbres" (Cero gasto para ti)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Plan activo vitalicio con <strong>0 timbres incluidos</strong>. Tienen todo el software contable gratis; si quieren timbrar ante el SAT compran sus propios paquetes de timbres.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="modalidad"
                      value="GRATIS_TOTAL"
                      checked={createForm.modalidad === "GRATIS_TOTAL"}
                      onChange={(e) => setCreateForm({ ...createForm, modalidad: e.target.value })}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        Cuenta 100% Gratuita (Uso Personal / Socio)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Plan activo vitalicio con timbres incluidos por tu cuenta. Cero costos y cero restricciones.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="modalidad"
                      value="PRUEBA_TEMPORAL"
                      checked={createForm.modalidad === "PRUEBA_TEMPORAL"}
                      onChange={(e) => setCreateForm({ ...createForm, modalidad: e.target.value })}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Prueba de Cortesía Temporal (Regalo por días)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Acceso temporal (ej. 15 o 30 días) para que prueben el sistema antes de requerir pago.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="modalidad"
                      value="NORMAL"
                      checked={createForm.modalidad === "NORMAL"}
                      onChange={(e) => setCreateForm({ ...createForm, modalidad: e.target.value })}
                      className="mt-0.5 text-slate-600"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Cuenta Estándar (30 días de renovación)</div>
                      <div className="text-[11px] text-slate-500">
                        Flujo normal de suscripción mensual con corte regular.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {createForm.modalidad === "PRUEBA_TEMPORAL" && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Días de prueba de cortesía:</label>
                  <select
                    value={createForm.cortesiaDias}
                    onChange={(e) => setCreateForm({ ...createForm, cortesiaDias: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                  >
                    <option value="7">7 días</option>
                    <option value="15">15 días</option>
                    <option value="30">30 días (1 mes)</option>
                    <option value="60">60 días (2 meses)</option>
                  </select>
                </div>
              )}

              {createForm.modalidad === "GRATIS_TOTAL" && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Timbres de regalo incluidos:</label>
                  <input
                    type="number"
                    value={createForm.timbresPersonalizados}
                    onChange={(e) => setCreateForm({ ...createForm, timbresPersonalizados: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="Ej. 100 o 500"
                  />
                </div>
              )}

              {/* Estado Inicial */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Estado Inicial de la Cuenta:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, status: "ACTIVE" })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                      createForm.status === "ACTIVE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Activa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, status: "PAUSED" })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                      createForm.status === "PAUSED"
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>En Pausa</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar / Regalar a Usuario Existente */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Gestionar Cuenta / Regalo</h3>
                  <p className="text-xs text-slate-500">{selectedUserForEdit.name} ({selectedUserForEdit.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              {/* Cambiar Plan */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">Plan:</label>
                <div className="grid grid-cols-3 gap-2">
                  {["FREE", "PRO", "DESPACHO"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, plan: p })}
                      className={`py-2 rounded-xl border text-center font-black transition-all ${
                        editForm.plan === p
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado Operativo de la Cuenta */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Estado Operativo de la Cuenta:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: "ACTIVE" })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                      editForm.status === "ACTIVE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Activa (Operando)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: "PAUSED" })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                      editForm.status === "PAUSED"
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>En Pausa (Migrar a Pago)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Si se pausa, el usuario verá la pantalla informativa para contratar su plan o pagar vía MercadoPago sin perder sus datos.
                </p>
              </div>

              {/* Modalidad */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Modalidad de Acceso:</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="editModalidad"
                      value="CORTESIA_TIMBRES"
                      checked={editForm.modalidad === "CORTESIA_TIMBRES"}
                      onChange={(e) => setEditForm({ ...editForm, modalidad: e.target.value })}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-emerald-950 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        Cortesía "Solo pagan sus timbres" (0 timbres inc.)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Acceso vitalicio al software gratis. Para emitir CFDI compran sus propios timbres. Cero costo para ti.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="editModalidad"
                      value="GRATIS_TOTAL"
                      checked={editForm.modalidad === "GRATIS_TOTAL"}
                      onChange={(e) => setEditForm({ ...editForm, modalidad: e.target.value })}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        100% Gratuito (Vitalicio con timbres)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Uso personal o socios con timbres incluidos sin cobro alguno.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="editModalidad"
                      value="PRUEBA_TEMPORAL"
                      checked={editForm.modalidad === "PRUEBA_TEMPORAL"}
                      onChange={(e) => setEditForm({ ...editForm, modalidad: e.target.value })}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Prueba de Cortesía (Extender vigencia por días)
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Otorga un número específico de días de acceso antes de requerir pago.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="editModalidad"
                      value="NORMAL"
                      checked={editForm.modalidad === "NORMAL"}
                      onChange={(e) => setEditForm({ ...editForm, modalidad: e.target.value })}
                      className="mt-0.5 text-slate-600"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Plan Normal (30 días)</div>
                      <div className="text-[11px] text-slate-500">Renovación mensual regular.</div>
                    </div>
                  </label>
                </div>
              </div>

              {editForm.modalidad === "PRUEBA_TEMPORAL" && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Extender vigencia por días de cortesía:</label>
                  <select
                    value={editForm.cortesiaDias || "15"}
                    onChange={(e) => setEditForm({ ...editForm, cortesiaDias: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                  >
                    <option value="7">7 días</option>
                    <option value="15">15 días</option>
                    <option value="30">30 días (1 mes)</option>
                    <option value="60">60 días (2 meses)</option>
                  </select>
                </div>
              )}

              {/* Recarga puntual de timbres */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Regalar / Agregar Timbres Extras:</label>
                <div className="flex items-center gap-2">
                  {["25", "50", "100", "500"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, agregarTimbres: t })}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        editForm.agregarTimbres === t
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      +{t}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={editForm.agregarTimbres}
                    onChange={(e) => setEditForm({ ...editForm, agregarTimbres: e.target.value })}
                    placeholder="Otro..."
                    className="w-20 px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Reiniciar timbres usados */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.resetTimbresUsados}
                    onChange={(e) => setEditForm({ ...editForm, resetTimbresUsados: e.target.checked })}
                    className="rounded-sm text-emerald-600"
                  />
                  <span className="font-semibold text-slate-700">
                    Reiniciar contador de timbres usados a 0
                  </span>
                </label>
              </div>

              {/* Rol */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-900 block">Rol del Usuario:</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="USER">USER (Cliente)</option>
                  <option value="CONTADOR">CONTADOR (Despacho)</option>
                  <option value="ADMIN">ADMIN (Super Administrador)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
