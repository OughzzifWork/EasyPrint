"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useSession } from "next-auth/react";
import { BankDTO } from "@/types";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  LayoutTemplate,
  FileCheck2,
  FileSpreadsheet,
  AlertCircle,
  X,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";

export default function BanksPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VISITEUR";
  const isAdmin = role === "ADMIN";

  const [banks, setBanks] = useState<BankDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankDTO | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("Erreur de chargement des banques.");
      const data = await res.json();
      setBanks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, active }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création.");

      setSuccess(`Banque "${name}" (${code}) créée avec succès.`);
      setIsCreateOpen(false);
      setCode("");
      setName("");
      setActive(true);
      fetchBanks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/banks/${selectedBank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, active }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la modification.");

      setSuccess(`Banque "${name}" mise à jour.`);
      setIsEditOpen(false);
      setSelectedBank(null);
      fetchBanks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (bank: BankDTO) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/banks/${bank.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur de mise à jour du statut.");
      fetchBanks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleHardDeleteBank = async (bank: BankDTO) => {
    if (!isAdmin) return;
    if (
      !confirm(
        `ATTENTION ADMIN :\nVoulez-vous supprimer DÉFINITIVEMENT la banque "${bank.name}" (${bank.code}) ainsi que ses modèles et documents associés ?\nCette action est irréversible !`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/banks/${bank.id}?hard=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression définitive.");

      setSuccess(`Banque "${bank.name}" supprimée définitivement.`);
      fetchBanks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (bank: BankDTO) => {
    setSelectedBank(bank);
    setCode(bank.code);
    setName(bank.name);
    setActive(bank.active);
    setIsEditOpen(true);
  };

  const filteredBanks = banks.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Header title="Gestion des Banques" />

      {/* Bar Top */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou code de banque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setCode("");
              setName("");
              setActive(true);
              setIsCreateOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Banque</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid of Banks */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 font-medium">
          Chargement des banques...
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Aucune banque enregistrée.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanks.map((bank) => (
            <div
              key={bank.id}
              className={clsx(
                "bg-white rounded-2xl border p-5 shadow-sm transition-all duration-200 flex flex-col justify-between relative overflow-hidden",
                bank.active ? "border-slate-200 hover:border-slate-300" : "border-rose-100 bg-slate-50/50 opacity-75"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{bank.name}</h3>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block border border-blue-100">
                        {bank.code}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(bank)}
                    disabled={!isAdmin}
                    className={clsx(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                      bank.active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    )}
                  >
                    {bank.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{bank.active ? "Active" : "Inactive"}</span>
                  </button>
                </div>

                {/* Counts breakdown */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <p className="text-slate-400 font-medium">Modèles</p>
                    <p className="font-bold text-slate-700 mt-0.5">{bank._count?.templates || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <p className="text-slate-400 font-medium">Chèques</p>
                    <p className="font-bold text-slate-700 mt-0.5">{bank._count?.cheques || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <p className="text-slate-400 font-medium">Effets</p>
                    <p className="font-bold text-slate-700 mt-0.5">{bank._count?.effets || 0}</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <button
                    onClick={() => handleHardDeleteBank(bank)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                    title="Supprimer définitivement la banque (Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>

                  <button
                    onClick={() => openEditModal(bank)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Création Banque */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Ajouter une nouvelle banque</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Code Banque</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ex: BMCI, SGMB, CIH"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Raison sociale / Nom complet</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Crédit du Maroc"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Banque active</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20"
                >
                  Créer la banque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition Banque */}
      {isEditOpen && selectedBank && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Modifier la banque : {selectedBank.code}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Code Banque</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Banque active</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
