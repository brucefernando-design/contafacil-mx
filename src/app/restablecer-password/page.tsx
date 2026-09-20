import { Suspense } from "react";
import { RestablecerPasswordContent } from "./RestablecerPasswordContent";

export const dynamic = "force-dynamic";

export default function RestablecerPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
          Cargando formulario de recuperación...
        </div>
      }
    >
      <RestablecerPasswordContent />
    </Suspense>
  );
}
