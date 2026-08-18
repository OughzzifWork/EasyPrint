"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { BankDTO } from "@/types";
import {
  Building2, Plus, Search, Edit2, CheckCircle, XCircle,
  LayoutTemplate, FileCheck2, FileSpreadsheet, AlertCircle, X, Trash2, Landmark,
} from "lucide-react";
import { clsx } from "clsx";

interface Entity { id: string; name: string; code: string; active: boolean; }

export default function BanksPage() {
  const { user } = useAuth();
  const role = user?.role || "VISITEUR";
  const isAdmin = role === "ADMIN";

  const [banks, setBanks] = useState<any[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/banks");
      setBanks(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchEntities = async () => {
    try {
      const data = await fetchApi("/api/entities");
      setEntities(data);
    } catch {}
  };

  useEffect(() => { fetchBanks(); fetchEntities(); }, []);

  const toggleEntity = (id: string) => {
    setSelectedEntityIds((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setLogoUrl(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      await fetchApi("/api/banks", {
        method: "POST",
        body: JSON.stringify({ code, name, active, entityIds: selectedEntityIds, logoUrl }),
      });
      setSuccess(`Banque "${name}" créée avec succès.`);
      setIsCreateOpen(false); setCode(""); setName(""); setActive(true); setSelectedEntityIds([]);
      fetchBanks();
    } catch (err: any) { setError(err.message); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    setError(null); setSuccess(null);
    try {
      const payload: any = {};
      if (code !== selectedBank.code) payload.code = code;
      if (name !== selectedBank.name) payload.name = name;
      if (active !== selectedBank.active) payload.active = active;
      const origEntityIds = selectedBank.bankEntities?.map((be: any) => be.entityId).sort() || [];
      const newEntityIds = [...selectedEntityIds].sort();
      if (JSON.stringify(origEntityIds) !== JSON.stringify(newEntityIds)) payload.entityIds = selectedEntityIds;
      if (logoUrl !== (selectedBank.logoUrl || null)) payload.logoUrl = logoUrl;
      if (Object.keys(payload).length === 0) { setSuccess("Aucune modification."); setIsEditOpen(false); setSelectedBank(null); return; }
      await fetchApi(`/api/banks/${selectedBank.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSuccess(`Banque "${name}" mise à jour.`);
      setIsEditOpen(false); setSelectedBank(null); fetchBanks();
    } catch (err: any) { setError(err.message); }
  };

  const handleToggleActive = async (bank: any) => {
    if (!isAdmin) return;
    try {
      await fetchApi(`/api/banks/${bank.id}`, { method: "DELETE" });
      fetchBanks();
    } catch (err: any) { setError(err.message); }
  };

  const handleHardDeleteBank = async (bank: any) => {
    if (!isAdmin) return;
    if (!confirm(`Supprimer définitivement la banque "${bank.name}" (${bank.code}) ?\nCette action est irréversible !`)) return;
    try {
      await fetchApi(`/api/banks/${bank.id}?hard=true`, { method: "DELETE" });
      setSuccess(`Banque "${bank.name}" supprimée.`);
      fetchBanks();
    } catch (err: any) { setError(err.message); }
  };

  const openEditModal = (bank: any) => {
    setSelectedBank(bank);
    setCode(bank.code);
    setName(bank.name);
    setActive(bank.active);
    setSelectedEntityIds(bank.bankEntities?.map((be: any) => be.entityId) || []);
    setLogoUrl(bank.logoUrl || null);
    setIsEditOpen(true);
  };

  const getEntityNames = (bank: any) => {
    return bank.bankEntities?.map((be: any) => be.entity?.name).filter(Boolean).join(", ") || "—";
  };

  const filteredBanks = banks.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Header title="Gestion des Banques" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        {isAdmin && (
          <button           onClick={() => { setCode(""); setName(""); setActive(true); setSelectedEntityIds([]); setLogoUrl(null); setIsCreateOpen(true); }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
            <Plus className="w-4 h-4" /><span>Ajouter une Banque</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 shrink-0" /><span>{success}</span></div>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200/80 text-center text-slate-400">Chargement...</div>
      ) : filteredBanks.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200/80 text-center text-slate-400">Aucune banque.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanks.map((bank) => (
            <div key={bank.id} className={clsx("bg-white rounded-xl border p-5 shadow-sm flex flex-col justify-between", bank.active ? "border-slate-200" : "border-red-100 opacity-75")}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {bank.logoUrl ? (
                      <img src={bank.logoUrl} alt={bank.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{bank.name}</h3>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">{bank.code}</span>
                    </div>
                  </div>
                  <button onClick={() => handleToggleActive(bank)} disabled={!isAdmin}
                    className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                      bank.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                    {bank.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{bank.active ? "Active" : "Inactive"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Landmark className="w-3 h-3" />
                  <span className="truncate">{getEntityNames(bank)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <p className="text-slate-400 font-medium">Modèles</p>
                    <p className="font-bold text-slate-700">{bank._count?.templates || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <p className="text-slate-400 font-medium">Chèques</p>
                    <p className="font-bold text-slate-700">{bank._count?.cheques || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center">
                    <p className="text-slate-400 font-medium">Effets</p>
                    <p className="font-bold text-slate-700">{bank._count?.effets || 0}</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => handleHardDeleteBank(bank)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /><span>Supprimer</span>
                  </button>
                  <button onClick={() => openEditModal(bank)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /><span>Modifier</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 font-display">Nouvelle Banque</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Code Banque</label>
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ex: BMCE"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom complet</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Bank of Africa"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Logo de la banque</label>
                <div className="flex items-center gap-3">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />}
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl cursor-pointer text-xs text-slate-500 font-semibold transition-colors">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>{logoUrl ? "Changer le logo" : "Téléverser un logo"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
              {isAdmin && entities.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Entités autorisées</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {entities.filter((e) => e.active).map((entity) => (
                      <label key={entity.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-white px-2 py-1 rounded-lg">
                        <input type="checkbox" checked={selectedEntityIds.includes(entity.id)} onChange={() => toggleEntity(entity.id)}
                          className="rounded text-blue-500 w-4 h-4" />
                        <span>{entity.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{entity.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded text-blue-500 w-4 h-4" />
                  <span>Banque active</span>
                </label>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedBank && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 font-display">Modifier : {selectedBank.code}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Code Banque</label>
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom complet</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Logo de la banque</label>
                <div className="flex items-center gap-3">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />}
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl cursor-pointer text-xs text-slate-500 font-semibold transition-colors">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>{logoUrl ? "Changer le logo" : "Téléverser un logo"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
              {isAdmin && entities.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Entités autorisées</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {entities.filter((e) => e.active).map((entity) => (
                      <label key={entity.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-white px-2 py-1 rounded-lg">
                        <input type="checkbox" checked={selectedEntityIds.includes(entity.id)} onChange={() => toggleEntity(entity.id)}
                          className="rounded text-blue-500 w-4 h-4" />
                        <span>{entity.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{entity.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded text-blue-500 w-4 h-4" />
                  <span>Banque active</span>
                </label>
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
