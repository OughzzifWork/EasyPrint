"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Building, Lock, User, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const result = await login(username, password);
    if (result.error) { setError(result.error); setIsLoading(false); }
    else { window.location.href = "/dashboard"; }
  };

  const fillDemo = (u: string, p: string) => { setUsername(u); setPassword(p); setError(null); };

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-violet-100 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-orange-100 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl shadow-slate-200/60 border border-slate-100 relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="EasyPrint Logo" className="w-48 h-auto object-contain mb-4" />

          <p className="text-xs text-slate-400 mt-1">Plateforme de Gestion & Impression des Chèques et Effets</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nom d'utilisateur</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-300"><User className="w-4 h-4" /></div>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="ex: admin"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-300"><Lock className="w-4 h-4" /></div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
            </div>
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-lg shadow-blue-500/25 transition-all">
            {isLoading ? <span>Connexion en cours...</span> : <><span>Se connecter</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
