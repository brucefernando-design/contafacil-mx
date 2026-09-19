"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Plus, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";

interface OrganizationBasic {
  id: string;
  rfc: string;
  razonSocial: string;
  tipoPersona: "PF" | "PM" | string;
  regimenFiscal: string;
  opinionCumplimiento: string;
}

interface CompanySwitcherProps {
  activeOrg: OrganizationBasic;
  allOrgs: OrganizationBasic[];
  isDespacho?: boolean;
}

export function CompanySwitcher({ activeOrg, allOrgs, isDespacho }: CompanySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrg.id) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert("No se pudo cambiar de empresa.");
      }
    } catch {
      alert("Error de conexión al cambiar de RFC.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all text-left group"
      >
        <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
          {activeOrg.tipoPersona === "PM" ? (
            <Building2 className="w-4 h-4" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-xs text-emerald-950 tracking-wide">
              {activeOrg.rfc}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                activeOrg.opinionCumplimiento === "POSITIVA"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              32-D {activeOrg.opinionCumplimiento === "POSITIVA" ? "✓" : "!"}
            </span>
          </div>
          <span className="text-xs text-slate-600 truncate max-w-[170px] font-medium">
            {activeOrg.razonSocial}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-emerald-700 transition-transform ml-1 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isDespacho ? "Cartera de Clientes / RFCs" : "Mis RFCs Vinculados"}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {allOrgs.length} {allOrgs.length === 1 ? "RFC" : "RFCs"}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {allOrgs.map((org) => {
                const isSelected = org.id === activeOrg.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSwitch(org.id)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      isSelected ? "bg-emerald-50/70" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {org.tipoPersona === "PM" ? (
                          <Building2 className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {org.rfc}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {org.tipoPersona} • {org.regimenFiscal}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {org.razonSocial}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-slate-100 mt-1">
              <Link
                href="/dashboard/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Dar de alta nuevo RFC (PF o PM)
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
