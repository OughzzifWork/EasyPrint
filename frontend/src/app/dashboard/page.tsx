"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import {
  Building2,
  Users,
  FileCheck2,
  FileSpreadsheet,
  LayoutTemplate,
  ShieldAlert,
  ArrowUpRight,
  Printer,
  PieChart,
  UserCheck,
  Landmark,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "VISITEUR";

  const [banksCount, setBanksCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [cheques, setCheques] = useState<any[]>([]);
  const [effets, setEffets] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [banksData, chequesData, effetsData, usersData, templatesData] = await Promise.all([
          fetchApi("/api/banks"),
          fetchApi("/api/cheques"),
          fetchApi("/api/effets"),
          fetchApi("/api/users"),
          fetchApi("/api/templates"),
        ]);
        setBanks(Array.isArray(banksData) ? banksData : []);
        setBanksCount(Array.isArray(banksData) ? banksData.length : 0);
        setCheques(Array.isArray(chequesData) ? chequesData : []);
        setEffets(Array.isArray(effetsData) ? effetsData : []);
        setUsersCount(Array.isArray(usersData) ? usersData.length : 0);
        setTemplatesCount(Array.isArray(templatesData) ? templatesData.length : 0);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const chequesCount = cheques.filter((c) => !c.deletedAt).length;
  const effetsCount = effets.filter((e) => !e.deletedAt).length;

  // --- ANALYSE PAR CLIENT (BÉNÉFICIAIRE) ---
  const clientMap = new Map<
    string,
    { name: string; chequesCount: number; effetsCount: number; chequesTotal: number; effetsTotal: number; grandTotal: number }
  >();

  cheques.forEach((c) => {
    if (c.deletedAt) return;
    const key = c.beneficiary.trim().toUpperCase();
    const existing = clientMap.get(key) || {
      name: c.beneficiary.trim(),
      chequesCount: 0,
      effetsCount: 0,
      chequesTotal: 0,
      effetsTotal: 0,
      grandTotal: 0,
    };
    existing.chequesCount += 1;
    existing.chequesTotal += c.amountNumeric;
    existing.grandTotal += c.amountNumeric;
    clientMap.set(key, existing);
  });

  effets.forEach((e) => {
    if (e.deletedAt) return;
    const key = e.beneficiary.trim().toUpperCase();
    const existing = clientMap.get(key) || {
      name: e.beneficiary.trim(),
      chequesCount: 0,
      effetsCount: 0,
      chequesTotal: 0,
      effetsTotal: 0,
      grandTotal: 0,
    };
    existing.effetsCount += 1;
    existing.effetsTotal += e.amountNumeric;
    existing.grandTotal += e.amountNumeric;
    clientMap.set(key, existing);
  });

  const clientAnalysis = Array.from(clientMap.values()).sort((a, b) => b.grandTotal - a.grandTotal);
  const maxClientTotal = clientAnalysis.length > 0 ? clientAnalysis[0].grandTotal : 1;

  // --- ANALYSE PAR BANQUE ---
  const bankAnalysis = banks.map((b) => {
    const bCheques = cheques.filter((c) => c.bankId === b.id && !c.deletedAt);
    const bEffets = effets.filter((e) => e.bankId === b.id && !e.deletedAt);

    const chequesTotal = bCheques.reduce((sum, c) => sum + c.amountNumeric, 0);
    const effetsTotal = bEffets.reduce((sum, e) => sum + e.amountNumeric, 0);
    const grandTotal = chequesTotal + effetsTotal;

    return {
      id: b.id,
      name: b.name,
      code: b.code,
      chequesCount: bCheques.length,
      effetsCount: bEffets.length,
      chequesTotal,
      effetsTotal,
      grandTotal,
    };
  }).sort((a, b) => b.grandTotal - a.grandTotal);

  const totalPortfolioAmount = bankAnalysis.reduce((sum, b) => sum + b.grandTotal, 0);

  const formatMAD = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Tableau de bord" />
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 font-medium">
          Chargement du tableau de bord...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Tableau de bord" />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Banques actives</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{banksCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modèles d'impression</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{templatesCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <LayoutTemplate className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chèques émis</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{chequesCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Effets émis (LCN)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{effetsCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- SECTION D'ANALYSE DES MONTANTS (PAR CLIENTS ET PAR BANQUES) --- */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Analyse Financière des Montants</h2>
              <p className="text-xs text-slate-500">Répartition globale des chèques et effets par client et par établissement bancaire</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 block uppercase">Portefeuille total</span>
            <span className="text-lg font-extrabold text-blue-600">{formatMAD(totalPortfolioAmount)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analyse par Client / Bénéficiaire */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Montants par Clients / Bénéficiaires</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                  {clientAnalysis.length} Clients
                </span>
              </div>

              {clientAnalysis.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Aucun document émis pour le moment.</div>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {clientAnalysis.map((client, idx) => {
                    const pct = Math.round((client.grandTotal / (maxClientTotal || 1)) * 100);
                    return (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 truncate max-w-[200px]" title={client.name}>
                            {client.name}
                          </span>
                          <span className="font-extrabold text-slate-900">{formatMAD(client.grandTotal)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
                          <span>
                            Chèques: <strong className="text-slate-700">{client.chequesCount}</strong> ({formatMAD(client.chequesTotal)})
                          </span>
                          <span>
                            Effets: <strong className="text-slate-700">{client.effetsCount}</strong> ({formatMAD(client.effetsTotal)})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Analyse par Banque */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800">Montants par Établissements Bancaires</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {bankAnalysis.length} Banques
                </span>
              </div>

              {bankAnalysis.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Aucune banque configurée.</div>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {bankAnalysis.map((b) => {
                    const pctPortfolio = totalPortfolioAmount > 0 ? Math.round((b.grandTotal / totalPortfolioAmount) * 100) : 0;
                    return (
                      <div key={b.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                              {b.code}
                            </span>
                            <span className="font-bold text-slate-900">{b.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-900 block">{formatMAD(b.grandTotal)}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{pctPortfolio}% du total</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pctPortfolio}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
                          <span>
                            Chèques ({b.chequesCount}): <strong className="text-slate-700">{formatMAD(b.chequesTotal)}</strong>
                          </span>
                          <span>
                            Effets ({b.effetsCount}): <strong className="text-slate-700">{formatMAD(b.effetsTotal)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Module Chèques & Effets */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Printer className="w-6 h-6" />
              </span>
              <span className="text-xs font-medium text-slate-400">Impression Haute Précision</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Saisie & Impression de Chèques & Effets</h3>
            <p className="text-sm text-slate-500 mt-1">
              Saisissez les montants, le bénéficiaire et générez automatiquement le montant en lettres en français.
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              href="/dashboard/cheques"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              <span>Accéder aux Chèques</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/effets"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              <span>Accéder aux Effets</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Module Administration */}
        {role === "ADMIN" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Administration Active
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Gestion des Utilisateurs & Banques</h3>
              <p className="text-sm text-slate-500 mt-1">
                Gérez les accès utilisateurs, attribuez les rôles (Admin, Comptable, Visiteur) et configurez les banques.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Link
                href="/dashboard/users"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                <span>Utilisateurs</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/banks"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
              >
                <span>Banques</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </span>
                <span className="text-xs font-medium text-slate-500">Accès restreint</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Gestion des Banques & Modèles</h3>
              <p className="text-sm text-slate-500 mt-1">
                Consultez les banques actives et les modèles d'impression validés par l'administration.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/dashboard/banks"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
              >
                <span>Consulter les Banques</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
