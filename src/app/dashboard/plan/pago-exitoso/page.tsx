import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle, ArrowRight, XCircle, Clock } from "lucide-react";
import { PagoExitosoContent } from "./PagoExitosoContent";

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
      </div>
    }>
      <PagoExitosoContent />
    </Suspense>
  );
}
