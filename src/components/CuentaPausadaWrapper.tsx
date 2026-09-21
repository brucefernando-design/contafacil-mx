"use client";

import { usePathname } from "next/navigation";
import { CuentaPausadaNotice } from "./CuentaPausadaNotice";

interface CuentaPausadaWrapperProps {
  isPaused: boolean;
  user: {
    name: string;
    email: string;
  };
  children: React.ReactNode;
}

export function CuentaPausadaWrapper({
  isPaused,
  user,
  children,
}: CuentaPausadaWrapperProps) {
  const pathname = usePathname();

  // Si no está pausada, o si está navegando en la página de planes para pagar, mostrar el contenido normal
  if (!isPaused || pathname.startsWith("/dashboard/plan")) {
    return <>{children}</>;
  }

  // Si está pausada y navega en cualquier otra sección del dashboard, mostrar pantalla de bloqueo
  return <CuentaPausadaNotice userName={user.name} userEmail={user.email} />;
}
