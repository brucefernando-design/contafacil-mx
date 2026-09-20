"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type AsistenteTab = "guia" | "recorrido" | "glosario" | "pantalla";

interface AsistenteContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  activeTab: AsistenteTab;
  setActiveTab: (tab: AsistenteTab) => void;
  selectedTermId: string | null;
  abrirGlosarioTermino: (termId: string) => void;
  abrirAsistente: (tab?: AsistenteTab) => void;
  tourActivo: boolean;
  setTourActivo: (activo: boolean) => void;
  iniciarTour: () => void;
}

const AsistenteContext = createContext<AsistenteContextType | undefined>(undefined);

export function AsistenteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AsistenteTab>("guia");
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [tourActivo, setTourActivo] = useState(false);

  // Cargar estado inicial de localStorage y parámetros en cliente
  useEffect(() => {
    try {
      const tourVisto = localStorage.getItem("cfmx_tour_visto");
      if (tourVisto !== "1") {
        setTourActivo(true);
      }

      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const asistenteParam = urlParams?.get("asistente");
      const guardadoTab = localStorage.getItem("cfmx_asistente_tab");
      const guardadoAbierto = localStorage.getItem("cfmx_asistente_abierto");

      if (asistenteParam === "recorrido" || guardadoTab === "recorrido") {
        setActiveTab("recorrido");
        setIsOpen(true);
        // Limpiar para no forzar en futuras navegaciones no relacionadas
        localStorage.removeItem("cfmx_asistente_tab");
      } else if (guardadoAbierto === "1") {
        setIsOpen(true);
      }
    } catch {
      // Ignorar fallas de localStorage
    }
  }, []);

  const handleSetIsOpen = (open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem("cfmx_asistente_abierto", open ? "1" : "0");
    } catch {
      // Ignorar fallas
    }
  };

  const toggleOpen = () => {
    handleSetIsOpen(!isOpen);
  };

  const abrirGlosarioTermino = (termId: string) => {
    setSelectedTermId(termId);
    setActiveTab("glosario");
    handleSetIsOpen(true);
  };

  const abrirAsistente = (tab: AsistenteTab = "guia") => {
    setActiveTab(tab === "pantalla" ? "guia" : tab);
    handleSetIsOpen(true);
  };

  const iniciarTour = () => {
    setTourActivo(true);
  };

  return (
    <AsistenteContext.Provider
      value={{
        isOpen,
        setIsOpen: handleSetIsOpen,
        toggleOpen,
        activeTab,
        setActiveTab,
        selectedTermId,
        abrirGlosarioTermino,
        abrirAsistente,
        tourActivo,
        setTourActivo,
        iniciarTour,
      }}
    >
      {children}
    </AsistenteContext.Provider>
  );
}

export function useAsistente() {
  const context = useContext(AsistenteContext);
  if (!context) {
    throw new Error("useAsistente debe utilizarse dentro de un AsistenteProvider");
  }
  return context;
}
