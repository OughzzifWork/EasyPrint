"use client";

import { useAuth } from "@/lib/auth-context";
import { User, CheckCircle2, AlertCircle } from "lucide-react";

export function Header({ title }: { title?: string }) {
  const { user } = useAuth();
  const role = user?.role || "VISITEUR";
  const canEdit = user?.canEdit ?? true;

  return (
    <header className="h-14 glass px-6 flex items-center justify-between sticky top-0 z-10 rounded-b-xl">
      <h2 className="text-lg font-semibold text-slate-900 tracking-tight font-display">{title || "EasyPrint"}</h2>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-100">
          {canEdit ? (
            <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span>Édition</span></>
          ) : (
            <><AlertCircle className="w-3 h-3 text-orange-400" /><span>Lecture seule</span></>
          )}
        </div>
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white flex items-center justify-center font-semibold text-[10px]">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-800 leading-none">{user?.fullName}</p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
