"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Tag,
  UserCheck,
  Building2,
} from "lucide-react";

interface Beneficiary {
  id: String;
  name: string;
  code?: string | null;
  category?: string | null;
  active: boolean;
  entityId?: string | null;
  entity?: { name: string; code: string } | null;
  createdAt: string;
}

export default function BeneficiariesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("FOURNISSEUR");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBeneficiaries = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/beneficiaries");
      setBeneficiaries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
    const fetchEntities = async () => {
      try {
        const data = await fetchApi("/api/entities");
        setEntities(Array.isArray(data) ? data.filter((e: any) => e.active) : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEntities();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Le nom du bénéficiaire est requis.");
      return;
    }

    try {
      await fetchApi("/api/beneficiaries", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), code: code.trim() || null, category }),
      });

      setSuccess("Bénéficiaire enregistré dans le répertoire.");
      setName("");
      setCode("");
      setIsModalOpen(false);
      fetchBeneficiaries();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, beneName: string) => {
    if (!confirm(`Supprimer ${beneName} du répertoire des bénéficiaires ?`)) return;

    try {
      await fetchApi(`/api/beneficiaries?id=${id}`, { method: "DELETE" });
      fetchBeneficiaries();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = beneficiaries.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.code && b.code.toLowerCase().includes(search.toLowerCase())) ||
      (b.category && b.category.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedEntityId && b.entityId !== selectedEntityId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Header title="Répertoire des Bénéficiaires" />

      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#A16207]/10 text-[#A16207] flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bénéficiaires & Fournisseurs Enregistrés</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Stockage automatique et réutilisable pour la saisie rapide des Chèques et Effets LCN.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#A16207] hover:bg-[#925506] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Bénéficiaire</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search & Stats bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher par nom, code ou catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30"
            />
          </div>

          {isAdmin && entities.length > 0 && (
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 font-medium"
            >
              <option value="">Toutes les entités</option>
              {entities.map((ent: any) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name} ({ent.code})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 w-full md:w-auto justify-end">
          <span>Total : <strong>{filtered.length}</strong> bénéficiaire(s)</span>
          <button
            onClick={fetchBeneficiaries}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Raison Sociale / Nom du Bénéficiaire</th>
                <th className="py-3.5 px-5">Code Interne / Réf</th>
                <th className="py-3.5 px-5">Catégorie</th>
                {isAdmin && <th className="py-3.5 px-5">Entité</th>}
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-slate-400">
                    Chargement du répertoire...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-slate-400">
                    Aucun bénéficiaire trouvé dans le système.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id as string} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                        {b.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 font-mono text-xs">
                      {b.code || "—"}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#A16207]/10 text-[#A16207] text-xs font-semibold border border-[#A16207]/10">
                        <Tag className="w-3 h-3" />
                        {b.category || "FOURNISSEUR"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-100">
                          <Building2 className="w-3 h-3" />
                          {b.entity?.name || "—"}
                        </span>
                      </td>
                    )}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleDelete(b.id as string, b.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Supprimer du répertoire"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Beneficiary */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Ajouter un nouveau Bénéficiaire</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Nom ou Raison Sociale *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: SOMACA SARL, OCP S.A..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A16207]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Code / Réf (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: FOU-001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A16207]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#A16207]/30"
                  >
                    <option value="FOURNISSEUR">Fournisseur</option>
                    <option value="CLIENT">Client</option>
                    <option value="SALARIE">Salarié / Personnel</option>
                    <option value="AUTRE">Autre Partenaire</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#A16207] hover:bg-[#925506] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
