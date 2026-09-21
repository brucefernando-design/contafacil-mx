"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  const mensaje = encodeURIComponent(
    "¡Hola! Me interesa conocer más sobre EasyConta MX y cómo automatizar mi contabilidad y facturación SAT."
  );
  // Enlace a WhatsApp Web o App
  const waUrl = `https://wa.me/?text=${mensaje}`;

  return (
    <aside
      aria-label="Contacto por WhatsApp"
      className="fixed bottom-6 left-6 z-40 flex items-center group"
    >
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all cursor-pointer border border-emerald-300/40"
        title="Contáctanos por WhatsApp"
      >
        <MessageCircle className="w-4 h-4 fill-slate-950 text-slate-950" />
        <span className="hidden sm:inline">¿Dudas? Chat por WhatsApp</span>
        <span className="sm:hidden">WhatsApp</span>
      </a>
    </aside>
  );
}
