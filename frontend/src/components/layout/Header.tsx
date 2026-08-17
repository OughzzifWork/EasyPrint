"use client";

import { useAuth } from "@/lib/auth-context";
import { User, CheckCircle2, AlertCircle } from "lucide-react";

export function Header({ title }: { title?: string }) {
  const { user } = useAuth();
  const role = user?.role || "VISITEUR";
  const canEdit = user?.canEdit ?? true;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title || "Plateforme IMPCE"}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {canEdit ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Droit d'édition actif</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Lecture seule</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shadow">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 leading-none">{user?.fullName}</p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5 uppercase tracking-wider">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
