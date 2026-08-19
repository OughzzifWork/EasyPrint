"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import {
  Building2, Users, FileCheck2, FileSpreadsheet, LayoutTemplate,
  ShieldAlert, ArrowUpRight, Printer, UserCheck, Landmark, TrendingUp,
  Globe, BarChart3, Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "VISITEUR";
  const [banksCount, setBanksCount] = useState(0);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [cheques, setCheques] = useState<any[]>([]);
  const [effets, setEffets] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [b, c, e, , t] = await Promise.all([fetchApi("/api/banks"), fetchApi("/api/cheques"), fetchApi("/api/effets"), fetchApi("/api/users"), fetchApi("/api/templates")]);
        setBanks(Array.isArray(b) ? b : []); setBanksCount(Array.isArray(b) ? b.length : 0);
        setCheques(Array.isArray(c) ? c : []); setEffets(Array.isArray(e) ? e : []);
        setTemplatesCount(Array.isArray(t) ? t.length : 0);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const activeCheques = cheques.filter((c) => !c.deletedAt);
  const activeEffets = effets.filter((e) => !e.deletedAt);
  const chequesCount = activeCheques.length;
  const effetsCount = activeEffets.length;
  const printedCheques = activeCheques.filter((c) => c.printedAt);
  const printedEffets = activeEffets.filter((e) => e.printedAt);
  const printedCount = printedCheques.length + printedEffets.length;

  const fmt = (n: number) => new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 2 }).format(n);

  // --- Entity Analysis ---
  const entityMap = new Map<string, { code: string; name: string; chequesCount: number; effetsCount: number; chequesTotal: number; effetsTotal: number; printedCount: number }>();
  activeCheques.forEach((c) => {
    const key = c.entityId || "_none";
    const ex = entityMap.get(key) || { code: c.entity?.code || "—", name: c.entity?.name || "Non assigné", chequesCount: 0, effetsCount: 0, chequesTotal: 0, effetsTotal: 0, printedCount: 0 };
    ex.chequesCount++; ex.chequesTotal += Number(c.amountNumeric);
    if (c.printedAt) ex.printedCount++;
    entityMap.set(key, ex);
  });
  activeEffets.forEach((e) => {
    const key = e.entityId || "_none";
    const ex = entityMap.get(key) || { code: e.entity?.code || "—", name: e.entity?.name || "Non assigné", chequesCount: 0, effetsCount: 0, chequesTotal: 0, effetsTotal: 0, printedCount: 0 };
    ex.effetsCount++; ex.effetsTotal += Number(e.amountNumeric);
    if (e.printedAt) ex.printedCount++;
    entityMap.set(key, ex);
  });
  const entityAnalysis = Array.from(entityMap.values()).sort((a, b) => (b.chequesTotal + b.effetsTotal) - (a.chequesTotal + a.effetsTotal));
  const totalEntityAmount = entityAnalysis.reduce((s, e) => s + e.chequesTotal + e.effetsTotal, 0);

  // --- Client Analysis ---
  const clientMap = new Map<string, { name: string; chequesCount: number; effetsCount: number; chequesTotal: number; effetsTotal: number; grandTotal: number }>();
  activeCheques.forEach((c) => {
    const key = c.beneficiary.trim().toUpperCase();
    const ex = clientMap.get(key) || { name: c.beneficiary.trim(), chequesCount: 0, effetsCount: 0, chequesTotal: 0, effetsTotal: 0, grandTotal: 0 };
    ex.chequesCount++; ex.chequesTotal += Number(c.amountNumeric); ex.grandTotal += Number(c.amountNumeric); clientMap.set(key, ex);
  });
  activeEffets.forEach((e) => {
    const key = e.beneficiary.trim().toUpperCase();
    const ex = clientMap.get(key) || { name: e.beneficiary.trim(), chequesCount: 0, effetsCount: 0, chequesTotal: 0, effetsTotal: 0, grandTotal: 0 };
    ex.effetsCount++; ex.effetsTotal += Number(e.amountNumeric); ex.grandTotal += Number(e.amountNumeric); clientMap.set(key, ex);
  });
  const clientAnalysis = Array.from(clientMap.values()).sort((a, b) => b.grandTotal - a.grandTotal);
  const maxClientTotal = clientAnalysis[0]?.grandTotal || 1;

  // --- Bank Analysis ---
  const bankAnalysis = banks.map((b) => {
    const bc = activeCheques.filter((c) => c.bankId === b.id);
    const be = activeEffets.filter((e) => e.bankId === b.id);
    return { id: b.id, name: b.name, code: b.code, logoUrl: b.logoUrl, chequesCount: bc.length, effetsCount: be.length, chequesTotal: bc.reduce((s, c) => s + Number(c.amountNumeric), 0), effetsTotal: be.reduce((s, e) => s + Number(e.amountNumeric), 0), grandTotal: bc.reduce((s, c) => s + Number(c.amountNumeric), 0) + be.reduce((s, e) => s + Number(e.amountNumeric), 0) };
  }).sort((a, b) => b.grandTotal - a.grandTotal);
  const totalPortfolio = bankAnalysis.reduce((s, b) => s + b.grandTotal, 0);

  // --- Printed by User ---
  const userPrintMap = new Map<string, { count: number; cheques: number; effets: number }>();
  printedCheques.forEach((c) => {
    const key = c.createdByName || c.createdBy || "—";
    const ex = userPrintMap.get(key) || { count: 0, cheques: 0, effets: 0 };
    ex.count++; ex.cheques++; userPrintMap.set(key, ex);
  });
  printedEffets.forEach((e) => {
    const key = e.createdByName || e.createdBy || "—";
    const ex = userPrintMap.get(key) || { count: 0, cheques: 0, effets: 0 };
    ex.count++; ex.effets++; userPrintMap.set(key, ex);
  });
  const userPrintAnalysis = Array.from(userPrintMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
  const maxUserPrint = userPrintAnalysis[0]?.count || 1;

  // --- Printed by Entity ---
  const entityPrintMap = new Map<string, { count: number; cheques: number; effets: number }>();
  printedCheques.forEach((c) => {
    const key = c.entity?.name || "Non assigné";
    const ex = entityPrintMap.get(key) || { count: 0, cheques: 0, effets: 0 };
    ex.count++; ex.cheques++; entityPrintMap.set(key, ex);
  });
  printedEffets.forEach((e) => {
    const key = e.entity?.name || "Non assigné";
    const ex = entityPrintMap.get(key) || { count: 0, cheques: 0, effets: 0 };
    ex.count++; ex.effets++; entityPrintMap.set(key, ex);
  });
  const entityPrintAnalysis = Array.from(entityPrintMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
  const maxEntityPrint = entityPrintAnalysis[0]?.count || 1;

  if (loading) return (
    <div className="space-y-6">
      <Header title="Tableau de bord" />
      <div className="glass-card p-12 rounded-2xl text-center text-slate-400 font-medium">Chargement du tableau de bord...</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Header title="Tableau de bord" />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Banques actives", value: banksCount, icon: Building2, bg: "bg-blue-50", iconColor: "text-blue-500" },
          { label: "Modèles d'impression", value: templatesCount, icon: LayoutTemplate, bg: "bg-violet-50", iconColor: "text-violet-500" },
          { label: "Chèques émis", value: chequesCount, icon: FileCheck2, bg: "bg-emerald-50", iconColor: "text-emerald-500" },
          { label: "Effets émis (LCN)", value: effetsCount, icon: FileSpreadsheet, bg: "bg-orange-50", iconColor: "text-orange-500" },
        ].map((m) => (
          <div key={m.label} className="glass-card p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-display">{m.value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl ${m.bg} ${m.iconColor} flex items-center justify-center`}>
              <m.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Financial Analysis */}
      <div className="space-y-5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-xl"><TrendingUp className="w-4 h-4" /></div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">Analyse Financière des Montants</h2>
              <p className="text-[11px] text-slate-400">Répartition des chèques et effets par client et banque</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Portefeuille total</span>
            <span className="text-lg font-bold text-blue-500 font-display">{fmt(totalPortfolio)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Clients */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-sm text-slate-800">Par Clients</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg">{clientAnalysis.length} Clients</span>
            </div>
            {clientAnalysis.length === 0 ? (
              <div className="text-center py-8 text-slate-300 text-sm">Aucun document émis.</div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {clientAnalysis.map((c, i) => {
                  const pct = Math.round((c.grandTotal / maxClientTotal) * 100);
                  return (
                    <div key={i} className="p-3 bg-slate-50/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{c.name}</span>
                        <span className="font-bold text-slate-900">{fmt(c.grandTotal)}</span>
                      </div>
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Chèques: <strong className="text-slate-600">{c.chequesCount}</strong></span>
                        <span>Effets: <strong className="text-slate-600">{c.effetsCount}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Banks */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-violet-500" />
                <h3 className="font-semibold text-sm text-slate-800">Par Banques</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg">{bankAnalysis.length} Banques</span>
            </div>
            {bankAnalysis.length === 0 ? (
              <div className="text-center py-8 text-slate-300 text-sm">Aucune banque.</div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {bankAnalysis.map((b) => {
                  const pct = totalPortfolio > 0 ? Math.round((b.grandTotal / totalPortfolio) * 100) : 0;
                  return (
                    <div key={b.id} className="p-3 bg-slate-50/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {b.logoUrl ? <img src={b.logoUrl} alt="" className="w-5 h-5 rounded object-cover" /> : <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded-lg">{b.code}</span>}
                          <span className="font-semibold text-slate-800">{b.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">{fmt(b.grandTotal)}</span>
                          <span className="text-[10px] text-slate-400">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-400 to-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Chèques: <strong className="text-slate-600">{b.chequesCount}</strong></span>
                        <span>Effets: <strong className="text-slate-600">{b.effetsCount}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-Entity Analysis + Printed Docs */}
      <div className="space-y-5 pt-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Per Entity Financial */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-slate-800">Par Entité</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg">{entityAnalysis.length} Entité(s)</span>
            </div>
            {entityAnalysis.length === 0 ? (
              <div className="text-center py-8 text-slate-300 text-sm">Aucune donnée.</div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {entityAnalysis.map((ent, i) => {
                  const total = ent.chequesTotal + ent.effetsTotal;
                  const pct = totalEntityAmount > 0 ? Math.round((total / totalEntityAmount) * 100) : 0;
                  return (
                    <div key={i} className="p-3 bg-slate-50/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg">{ent.code}</span>
                          <span className="font-semibold text-slate-800">{ent.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{fmt(total)}</span>
                      </div>
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Chèques: <strong className="text-slate-600">{ent.chequesCount}</strong> ({fmt(ent.chequesTotal)})</span>
                        <span>Effets: <strong className="text-slate-600">{ent.effetsCount}</strong> ({fmt(ent.effetsTotal)})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Printed by User */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-rose-500" />
                <h3 className="font-semibold text-sm text-slate-800">Documents Imprimés par Utilisateur</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg">{printedCount} tirages</span>
            </div>
            {userPrintAnalysis.length === 0 ? (
              <div className="text-center py-8 text-slate-300 text-sm">Aucun document imprimé.</div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {userPrintAnalysis.map((u, i) => {
                  const pct = Math.round((u.count / maxUserPrint) * 100);
                  return (
                    <div key={i} className="p-3 bg-slate-50/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{u.name}</span>
                        <span className="font-bold text-slate-900">{u.count} tirages</span>
                      </div>
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Chèques: <strong className="text-slate-600">{u.cheques}</strong></span>
                        <span>Effets: <strong className="text-slate-600">{u.effets}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Printed by Entity */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-slate-800">Documents Imprimés par Entité</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg">{printedCount} tirages</span>
            </div>
            {entityPrintAnalysis.length === 0 ? (
              <div className="text-center py-8 text-slate-300 text-sm">Aucun document imprimé.</div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {entityPrintAnalysis.map((ent, i) => {
                  const pct = Math.round((ent.count / maxEntityPrint) * 100);
                  return (
                    <div key={i} className="p-3 bg-slate-50/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{ent.name}</span>
                        <span className="font-bold text-slate-900">{ent.count} tirages</span>
                      </div>
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Chèques: <strong className="text-slate-600">{ent.cheques}</strong></span>
                        <span>Effets: <strong className="text-slate-600">{ent.effets}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Documents */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                <h3 className="font-semibold text-sm text-slate-800">Documents Récents</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-lg">10 derniers</span>
            </div>
            {(() => {
              const recentDocs = [
                ...activeCheques.map((c: any) => ({
                  id: c.id, type: "Chèque", name: c.beneficiary, bank: c.bank?.code || "—",
                  entity: c.entity?.code || "—", amount: c.amountNumeric,
                  date: c.createdAt, printed: !!c.printedAt, href: "/dashboard/cheques",
                })),
                ...activeEffets.map((e: any) => ({
                  id: e.id, type: "Effet", name: e.beneficiary, bank: e.bank?.code || "—",
                  entity: e.entity?.code || "—", amount: e.amountNumeric,
                  date: e.createdAt, printed: !!e.printedAt, href: "/dashboard/effets",
                })),
              ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 10);

              if (recentDocs.length === 0) {
                return <div className="text-center py-8 text-slate-300 text-sm">Aucun document.</div>;
              }

              return (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {recentDocs.map((doc, i) => (
                    <Link key={i} href={doc.href} className="flex items-center gap-3 p-2.5 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${doc.type === "Chèque" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                        {doc.type === "Chèque" ? "CHQ" : "EFF"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">{doc.bank} · {doc.entity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900 font-mono">{fmt(doc.amount)}</p>
                        <p className="text-[10px] text-slate-400">{doc.date ? new Date(doc.date).toLocaleDateString("fr-FR") : "—"}</p>
                      </div>
                      {doc.printed ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Imprimé" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" title="Non imprimé" />
                      )}
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Printer className="w-5 h-5" /></span>
            <span className="text-[11px] font-medium text-slate-400">Impression</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">Saisie & Impression</h3>
          <p className="text-sm text-slate-400 mt-1">Générez chèques et effets avec montant en lettres automatique.</p>
          <div className="mt-5 flex gap-3">
            <Link href="/dashboard/cheques" className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all">
              Chèques <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/dashboard/effets" className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all">
              Effets <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {role === "ADMIN" ? (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><Users className="w-5 h-5" /></span>
              <span className="text-[11px] font-medium text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">Admin</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">Utilisateurs & Banques</h3>
            <p className="text-sm text-slate-400 mt-1">Gérez les accès, rôles et configuration bancaire.</p>
            <div className="mt-5 flex gap-3">
              <Link href="/dashboard/users" className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all">
                Utilisateurs <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/dashboard/banks" className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">
                Banques <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 bg-orange-50 text-orange-500 rounded-xl"><ShieldAlert className="w-5 h-5" /></span>
              <span className="text-[11px] font-medium text-slate-400">Accès restreint</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">Banques & Modèles</h3>
            <p className="text-sm text-slate-400 mt-1">Consultez les banques et modèles d'impression.</p>
            <div className="mt-5">
              <Link href="/dashboard/banks" className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">
                Consulter les Banques <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
