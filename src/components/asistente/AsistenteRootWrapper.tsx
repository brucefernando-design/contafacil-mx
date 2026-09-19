"use client";

import React from "react";
import { AsistenteProvider } from "./AsistenteContext";
import { AsistenteDrawer } from "./AsistenteDrawer";
import { FirstTimeTour } from "./FirstTimeTour";

export function AsistenteRootWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AsistenteProvider>
      {children}
      <FirstTimeTour />
      <AsistenteDrawer />
    </AsistenteProvider>
  );
}
