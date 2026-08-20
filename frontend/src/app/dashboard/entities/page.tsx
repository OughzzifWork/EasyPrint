"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import {
  Building2, Plus, Pencil, Trash2, Database, Wifi, WifiOff,
  Settings, X, Save, AlertCircle, CheckCircle2, Server, Key, FileText,
} from "lucide-react";

interface Bank { id: string; name: string; code: string; active: boolean; }

interface Entity {
  id: string;
  name: string;
  code: string;
  dataMode: string;
  defaultCreationPlace: string;
  sapServerUrl: string | null;
  sapCompanyDB: string | null;
  sapUser: string | null;
  sapPassword: string | null;
  sapQuery: string | null;
  active: boolean;
  createdAt: string;
  _count: { users: number; bankEntities: number; cheques: number; effets: number };
  bankEntities?: { bankId: string; bank: Bank }[];
}

export default function EntitiesPage() {
  const { user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState<Entity | null>(null);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", dataMode: "NORMAL", defaultCreationPlace: "Casablanca", bankIds: [] as string[] });
  const [sapForm, setSapForm] = useState({ sapServerUrl: "", sapCompanyDB: "", sapUser: "", sapPassword: "", sapQuery: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    fetchEntities();
    fetchBanks();
  }, [user]);

  const fetchBanks = async () => {
    try {
      const data = await fetchApi("/api/banks");
      setBanks(data);
    } catch {}
  };

  const fetchEntities = async () => {
    try {
      const data = await fetchApi("/api/entities");
      setEntities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      if (!formData.name || !formData.code) {
        setError("Le nom et le code sont obligatoires.");
        return;
      }
      await fetchApi("/api/entities", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setSuccess("Entité créée avec succès.");
      setShowModal(false);
      setFormData({ name: "", code: "", dataMode: "NORMAL", defaultCreationPlace: "Casablanca", bankIds: [] });
      fetchEntities();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingEntity) return;
    try {
      setError(null);
      await fetchApi(`/api/entities/${editingEntity.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setSuccess("Entité mise à jour.");
      setShowModal(false);
      setEditingEntity(null);
      setFormData({ name: "", code: "", dataMode: "NORMAL", defaultCreationPlace: "Casablanca", bankIds: [] });
      fetchEntities();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement l'entité "${name}" ?\nCette action est irréversible !`)) return;
    try {
      await fetchApi(`/api/entities/${id}`, { method: "DELETE" });
      setSuccess("Entité supprimée définitivement.");
      fetchEntities();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSap = async () => {
    if (!showSettings) return;
    try {
      setError(null);
      await fetchApi(`/api/entities/${showSettings.id}`, {
        method: "PUT",
        body: JSON.stringify(sapForm),
      });
      setSuccess("Configuration SAP sauvegardée.");
      setShowSettings(null);
      fetchEntities();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTestSap = async (id: string) => {
    setTesting(true);
    try {
      const result = await fetchApi(`/api/entities/${id}/test-sap`, { method: "POST" });
      setSuccess(result.message || "Connexion SAP réussie !");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const openEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name, code: entity.code, dataMode: entity.dataMode,
      defaultCreationPlace: entity.defaultCreationPlace || "Casablanca",
      bankIds: entity.bankEntities?.map((be) => be.bankId) || [],
    });
    setShowModal(true);
  };

  const openSettings = (entity: Entity) => {
    setShowSettings(entity);
    setSapForm({
      sapServerUrl: entity.sapServerUrl || "",
      sapCompanyDB: entity.sapCompanyDB || "",
      sapUser: entity.sapUser || "",
      sapPassword: entity.sapPassword || "",
      sapQuery: entity.sapQuery || "",
    });
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <Header title="Entités" />
        <div className="glass-card p-12 rounded-2xl text-center text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
          Accès refusé. Rôle Administrateur requis.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Gestion des Entités" />
        <div className="glass-card p-12 rounded-2xl text-center text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Gestion des Entités" />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{entities.length} entité(s)</p>
        <button
          onClick={() => { setEditingEntity(null); setFormData({ name: "", code: "", dataMode: "NORMAL", defaultCreationPlace: "Casablanca", bankIds: [] }); setShowModal(true); }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Nouvelle Entité
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((entity) => (
          <div key={entity.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entity.dataMode === "SAP" ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"}`}>
                  {entity.dataMode === "SAP" ? <Database className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{entity.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{entity.code}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${entity.dataMode === "SAP" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                {entity.dataMode === "SAP" ? "SAP B1" : "Normal"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] text-slate-400">
              <span>Lieu: <strong className="text-slate-600">{entity.defaultCreationPlace || "—"}</strong></span>
              <span>Utilisateurs: <strong className="text-slate-600">{entity._count.users}</strong></span>
              <span>Banques: <strong className="text-slate-600">{entity._count.bankEntities}</strong></span>
              <span>Chèques: <strong className="text-slate-600">{entity._count.cheques}</strong></span>
              <span>Effets: <strong className="text-slate-600">{entity._count.effets}</strong></span>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => openEdit(entity)} className="flex-1 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-1 transition-colors">
                <Pencil className="w-3 h-3" /> Modifier
              </button>
              <button onClick={() => openSettings(entity)} className="flex-1 py-1.5 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center gap-1 transition-colors">
                <Settings className="w-3 h-3" /> Paramètres
              </button>
              <button onClick={() => handleDelete(entity.id, entity.name)} className="py-1.5 px-2 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Supprimer définitivement">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 font-display">{editingEntity ? "Modifier l'entité" : "Nouvelle Entité"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Nom</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="ex: Société A" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Code</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="ex: SOCA" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Lieu de création des documents</label>
                <input type="text" value={formData.defaultCreationPlace} onChange={(e) => setFormData({ ...formData, defaultCreationPlace: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="ex: FES, Casablanca, Tanger..." />
                <p className="text-[10px] text-slate-400 mt-1">Ville utilisée comme lieu de création pour les documents</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Banques assignées</label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                  {banks.filter(b => b.active).map((bank) => (
                    <label key={bank.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.bankIds.includes(bank.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, bankIds: [...formData.bankIds, bank.id] });
                          } else {
                            setFormData({ ...formData, bankIds: formData.bankIds.filter((id) => id !== bank.id) });
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500/20"
                      />
                      <span className="text-sm text-slate-700">{bank.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">{bank.code}</span>
                    </label>
                  ))}
                  {banks.filter(b => b.active).length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-2">Aucune banque disponible</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Sélectionnez les banques utilisables par cette entité</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Mode de saisie</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, dataMode: "NORMAL" })}
                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${formData.dataMode === "NORMAL" ? "bg-blue-50 border-blue-300 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    <Building2 className="w-4 h-4" /> Normal
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, dataMode: "SAP" })}
                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${formData.dataMode === "SAP" ? "bg-orange-50 border-orange-300 text-orange-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    <Database className="w-4 h-4" /> SAP B1
                  </button>
                </div>
              </div>
              <button onClick={editingEntity ? handleUpdate : handleCreate}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                <Save className="w-4 h-4" /> {editingEntity ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAP Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-slate-900 font-display">SAP B1 — {showSettings.name}</h3>
              </div>
              <button onClick={() => setShowSettings(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1"><Server className="w-3 h-3" /> URL du serveur SAP</label>
                <input type="text" value={sapForm.sapServerUrl} onChange={(e) => setSapForm({ ...sapForm, sapServerUrl: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" placeholder="ex: 192.168.1.100:30015" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1"><Database className="w-3 h-3" /> Base de données</label>
                <input type="text" value={sapForm.sapCompanyDB} onChange={(e) => setSapForm({ ...sapForm, sapCompanyDB: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" placeholder="ex: SBODemoUS" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1"><Key className="w-3 h-3" /> Utilisateur SAP</label>
                  <input type="text" value={sapForm.sapUser} onChange={(e) => setSapForm({ ...sapForm, sapUser: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1"><Key className="w-3 h-3" /> Mot de passe SAP</label>
                  <input type="password" value={sapForm.sapPassword} onChange={(e) => setSapForm({ ...sapForm, sapPassword: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" /> Requête SQL pour l'import</label>
                <textarea value={sapForm.sapQuery} onChange={(e) => setSapForm({ ...sapForm, sapQuery: e.target.value })} rows={5}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none" placeholder="SELECT CardCode, CardName, DocTotal FROM OINV WHERE ..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleTestSap(showSettings.id)} disabled={testing}
                  className="flex-1 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  {testing ? <span>Test en cours...</span> : <><Wifi className="w-4 h-4" /> Tester la connexion</>}
                </button>
                <button onClick={handleSaveSap}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                  <Save className="w-4 h-4" /> Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
