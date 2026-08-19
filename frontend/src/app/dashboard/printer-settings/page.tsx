"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/layout/Header";
import {
  Printer,
  Save,
  RotateCcw,
  CheckCircle,
  FileText,
  Zap,
  ShieldAlert,
  SlidersHorizontal,
  Sliders,
  RefreshCw,
  Hash,
  DollarSign,
} from "lucide-react";

export default function PrinterSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role || "VISITEUR";

  const [orientation, setOrientation] = useState("LANDSCAPE");
  const [chequeWidth, setChequeWidth] = useState(175);
  const [chequeHeight, setChequeHeight] = useState(80);
  const [effetWidth, setEffetWidth] = useState(210);
  const [effetHeight, setEffetHeight] = useState(100);
  const [decimals, setDecimals] = useState(2);
  const [thousandSep, setThousandSep] = useState(" ");
  const [currency, setCurrency] = useState("MAD");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [amountPrefix, setAmountPrefix] = useState("#");
  const [amountSuffix, setAmountSuffix] = useState("#");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("impce_printer_config");
      if (stored) {
        const config = JSON.parse(stored);
        if (config.orientation) setOrientation(config.orientation);
        if (config.chequeWidth) setChequeWidth(config.chequeWidth);
        if (config.chequeHeight) setChequeHeight(config.chequeHeight);
        if (config.effetWidth) setEffetWidth(config.effetWidth);
        if (config.effetHeight) setEffetHeight(config.effetHeight);
        if (config.decimals !== undefined) setDecimals(config.decimals);
        if (config.thousandSep) setThousandSep(config.thousandSep);
        if (config.currency) setCurrency(config.currency);
        if (config.dateFormat) setDateFormat(config.dateFormat);
        if (config.amountPrefix !== undefined) setAmountPrefix(config.amountPrefix);
        if (config.amountSuffix !== undefined) setAmountSuffix(config.amountSuffix);
      }
    } catch (e) {}
  }, []);

  const handleSave = () => {
    const config = { orientation, chequeWidth, chequeHeight, effetWidth, effetHeight, decimals, thousandSep, currency, dateFormat, amountPrefix, amountSuffix };
    localStorage.setItem("impce_printer_config", JSON.stringify(config));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setOrientation("LANDSCAPE");
    setChequeWidth(175);
    setChequeHeight(80);
    setEffetWidth(210);
    setEffetHeight(100);
    setDecimals(2);
    setThousandSep(" ");
    setCurrency("MAD");
    setDateFormat("DD/MM/YYYY");
    setAmountPrefix("#");
    setAmountSuffix("#");
    localStorage.removeItem("impce_printer_config");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (authLoading) {
    return <div className="p-8 text-slate-500 font-medium">Chargement des autorisations...</div>;
  }

  if (role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <Header title="Paramètres" />
        <div className="p-8 max-w-lg mx-auto bg-white rounded-xl border border-slate-200/80 shadow-sm text-center space-y-4 my-12">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Accès Réservé aux Administrateurs</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Seuls les utilisateurs ayant le rôle <strong>ADMINISTRATEUR</strong> ont l'autorisation de modifier la configuration d'impression.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Paramétrage de l'Impression" />

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center font-bold shrink-0">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Configuration de l'Impression</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Orientation, dimensions papier et gestion de la base de données.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button onClick={handleResetDefaults} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-2 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all">
            <Save className="w-4 h-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Paramètres sauvegardés avec succès !</span>
        </div>
      )}

      {/* Row 1: Orientation + Format de la Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orientation */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">Orientation de l'Impression</h3>
          </div>
          <div className="flex-1 flex items-center">
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <button type="button" onClick={() => setOrientation("LANDSCAPE")} className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${orientation === "LANDSCAPE" ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                <SlidersHorizontal className="w-5 h-5" />
                <span>Paysage</span>
              </button>
              <button type="button" onClick={() => setOrientation("PORTRAIT")} className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${orientation === "PORTRAIT" ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                <FileText className="w-5 h-5" />
                <span>Portrait</span>
              </button>
            </div>
          </div>
        </div>

        {/* Format de la Date */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Hash className="w-5 h-5 text-violet-600" />
            <h3 className="font-bold text-slate-800">Format de la Date</h3>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-full mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"].map((fmt) => (
                  <button key={fmt} type="button" onClick={() => setDateFormat(fmt)} className={`py-2.5 px-3 rounded-xl border text-sm font-bold font-mono transition-all ${dateFormat === fmt ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                    {fmt}
                  </button>
                ))}
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <strong>Aperçu :</strong> {(() => {
                  const now = new Date();
                  const dd = String(now.getDate()).padStart(2, "0");
                  const mm = String(now.getMonth() + 1).padStart(2, "0");
                  const yyyy = now.getFullYear();
                  switch (dateFormat) {
                    case "MM/DD/YYYY": return `${mm}/${dd}/${yyyy}`;
                    case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
                    case "DD-MM-YYYY": return `${dd}-${mm}-${yyyy}`;
                    default: return `${dd}/${mm}/${yyyy}`;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Format des Montants + Dimensions Chèque / Effet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format des Montants */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800">Format des Montants</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Devise</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30">
                <option value="MAD">MAD — Dirham Marocain</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dollar Américain</option>
                <option value="TND">TND — Dinar Tunisien</option>
                <option value="DZD">DZD — Dinar Algérien</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nombre de Décimales</label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((d) => (
                  <button key={d} type="button" onClick={() => setDecimals(d)} className={`py-2 rounded-xl border text-sm font-bold transition-all ${decimals === d ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Séparateur de Milliers</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setThousandSep(" ")} className={`py-2 rounded-xl border text-sm font-bold transition-all ${thousandSep === " " ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  Espace
                </button>
                <button type="button" onClick={() => setThousandSep(".")} className={`py-2 rounded-xl border text-sm font-bold transition-all ${thousandSep === "." ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  Point (.)
                </button>
                <button type="button" onClick={() => setThousandSep(",")} className={`py-2 rounded-xl border text-sm font-bold transition-all ${thousandSep === "," ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                  Virgule (,)
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <strong>Aperçu :</strong> {amountPrefix} {Number(1234567.89).toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace(/[\s\u00a0]/g, thousandSep)} {currency} {amountSuffix}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Préfixe Montant</label>
                <input type="text" value={amountPrefix} onChange={(e) => setAmountPrefix(e.target.value)} placeholder="ex: #" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30" />
                <p className="text-[11px] text-slate-400 mt-1">Texte avant le montant</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Suffixe Montant</label>
                <input type="text" value={amountSuffix} onChange={(e) => setAmountSuffix(e.target.value)} placeholder="ex: #" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30" />
                <p className="text-[11px] text-slate-400 mt-1">Texte après le montant</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Chèque + Effet stacked */}
        <div className="flex flex-col gap-6">
          {/* Dimensions Papier Chèque */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 flex-1">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800">Dimensions Chèque (mm)</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Préréglages :</span>
                <button type="button" onClick={() => { setChequeWidth(175); setChequeHeight(80); }} className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors">
                  Standard (175 x 80)
                </button>
                <button type="button" onClick={() => { setChequeWidth(210); setChequeHeight(100); }} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors">
                  Souche (210 x 100)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Largeur (mm)</label>
                  <input type="number" value={chequeWidth} onChange={(e) => setChequeWidth(parseFloat(e.target.value) || 175)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Hauteur (mm)</label>
                  <input type="number" value={chequeHeight} onChange={(e) => setChequeHeight(parseFloat(e.target.value) || 80)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" />
                </div>
              </div>
            </div>
          </div>

          {/* Dimensions Papier Effet */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 flex-1">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800">Dimensions Effet / LCN (mm)</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Préréglages :</span>
                <button type="button" onClick={() => { setEffetWidth(210); setEffetHeight(100); }} className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 transition-colors">
                  Standard (210 x 100)
                </button>
                <button type="button" onClick={() => { setEffetWidth(210); setEffetHeight(148); }} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors">
                  A5 (210 x 148)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Largeur (mm)</label>
                  <input type="number" value={effetWidth} onChange={(e) => setEffetWidth(parseFloat(e.target.value) || 210)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Hauteur (mm)</label>
                  <input type="number" value={effetHeight} onChange={(e) => setEffetHeight(parseFloat(e.target.value) || 100)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone Danger */}
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-red-100">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-red-800">Zone Danger — Réinitialisation</h3>
        </div>

        <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-800 leading-relaxed">
          <strong>Attention :</strong> Cette action est <strong>irréversible</strong>. Elle supprimera toutes les données de la base (chèques, effets, bénéficiaires, modèles, entités, utilisateurs non-admin, journaux d'audit). Les <strong>banques</strong> et les comptes <strong>Administrateur Système</strong> seront conservés.
        </div>

        {resetMessage && (
          <div className={`p-3 rounded-xl text-sm font-medium ${resetSuccess ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {resetSuccess ? "✓ " : "✕ "}{resetMessage}
          </div>
        )}

        <button
          disabled={resetLoading}
          onClick={async () => {
            if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser la base de données ? Cette action est irréversible.")) return;
            setResetLoading(true);
            setResetMessage(null);
            setResetSuccess(false);
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/admin/reset-db`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Erreur lors de la réinitialisation.");
              setResetMessage(data.message);
              setResetSuccess(true);
            } catch (err: any) {
              setResetMessage(err.message || "Erreur réseau.");
              setResetSuccess(false);
            } finally {
              setResetLoading(false);
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow transition-all disabled:opacity-50"
        >
          {resetLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          <span>Réinitialiser la base de données</span>
        </button>
      </div>

      {/* Save bar bottom */}
      <div className="bg-[#0F172A] text-white rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <div>
            <p className="font-bold text-sm">Prêt pour l'impression</p>
            <p className="text-xs text-slate-400">Les paramètres sont appliqués lors de la génération du PDF.</p>
          </div>
        </div>
        <button onClick={handleSave} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold text-sm rounded-xl shadow-md transition-all">
          <Save className="w-4 h-4" />
          <span>Sauvegarder</span>
        </button>
      </div>
    </div>
  );
}
