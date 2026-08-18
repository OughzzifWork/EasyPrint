"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { fetchApi } from "@/lib/api";
import { UserDTO, Role } from "@/types";
import {
  Users, UserPlus, Search, ShieldCheck, Edit2, CheckCircle, XCircle,
  KeyRound, UserX, AlertCircle, X, Check, Landmark, Trash2,
} from "lucide-react";
import { clsx } from "clsx";

interface Entity { id: string; name: string; code: string; }
interface UserWithEntity extends UserDTO { entityId?: string | null; entityName?: string | null; }

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithEntity[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithEntity | null>(null);

  const [newFullName, setNewFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("COMPTABLE");
  const [newEntityId, setNewEntityId] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [newCanEdit, setNewCanEdit] = useState(true);

  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<Role>("COMPTABLE");
  const [editEntityId, setEditEntityId] = useState<string>("");
  const [editActive, setEditActive] = useState(true);
  const [editCanEdit, setEditCanEdit] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/users");
      setUsers(data);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchEntities = async () => {
    try {
      const data = await fetchApi("/api/entities");
      setEntities(data);
    } catch {}
  };

  useEffect(() => { fetchUsers(); fetchEntities(); }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      await fetchApi("/api/users", {
        method: "POST",
        body: JSON.stringify({
          fullName: newFullName, username: newUsername, password: newPassword,
          role: newRole, entityId: newEntityId || undefined, active: newActive, canEdit: newCanEdit,
        }),
      });
      setSuccess(`Utilisateur "${newFullName}" créé avec succès.`);
      setIsCreateOpen(false); resetCreateForm(); fetchUsers();
    } catch (err: any) { setError(err.message); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError(null); setSuccess(null);
    try {
      await fetchApi(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: editFullName, username: editUsername, role: editRole, entityId: editEntityId || null,
          active: editActive, canEdit: editCanEdit, newPassword: editNewPassword.trim() || undefined,
        }),
      });
      setSuccess(`Compte de "${editFullName}" mis à jour.`);
      setIsEditOpen(false); setSelectedUser(null); fetchUsers();
    } catch (err: any) { setError(err.message); }
  };

  const handleToggleActive = async (user: UserWithEntity) => {
    try {
      await fetchApi(`/api/users/${user.id}`, { method: "PUT", body: JSON.stringify({ active: !user.active }) });
      fetchUsers();
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteUser = async (user: UserWithEntity) => {
    if (!confirm(`Supprimer définitivement l'utilisateur "${user.fullName}" ? Cette action est irréversible.`)) return;
    try {
      await fetchApi(`/api/users/${user.id}?hard=true`, { method: "DELETE" });
      setSuccess(`Utilisateur "${user.fullName}" supprimé définitivement.`);
      fetchUsers();
    } catch (err: any) { setError(err.message); }
  };

  const openEditModal = (user: UserWithEntity) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditEntityId(user.entityId || "");
    setEditActive(user.active);
    setEditCanEdit(user.canEdit);
    setEditNewPassword("");
    setIsEditOpen(true);
  };

  const resetCreateForm = () => {
    setNewFullName(""); setNewUsername(""); setNewPassword("");
    setNewRole("COMPTABLE"); setNewEntityId(""); setNewActive(true); setNewCanEdit(true);
  };

  const getEntityName = (id: string | null | undefined) => {
    if (!id) return "—";
    const e = entities.find((e) => e.id === id);
    return e ? e.name : "—";
  };

  const filteredUsers = users.filter(
    (u) => u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Header title="Gestion des Utilisateurs" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <button onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
          <UserPlus className="w-4 h-4" /><span>Nouvel Utilisateur</span>
        </button>
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

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chargement...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Aucun utilisateur trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Utilisateur</th>
                  <th className="py-3.5 px-6">Identifiant</th>
                  <th className="py-3.5 px-6">Entité</th>
                  <th className="py-3.5 px-6">Rôle</th>
                  <th className="py-3.5 px-6">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                        {u.fullName.charAt(0)}
                      </div>
                      <span>{u.fullName}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600">@{u.username}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Landmark className="w-3 h-3" /> {getEntityName(u.entityId)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={clsx("px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border",
                        u.role === "ADMIN" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        u.role === "COMPTABLE" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>{u.role}</span>
                    </td>
                    <td className="py-4 px-6">
                      <button onClick={() => handleToggleActive(u)}
                        className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                          u.active ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        )}>
                        {u.active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{u.active ? "Actif" : "Inactif"}</span>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(u)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(u)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 font-display">Nouveau compte utilisateur</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom complet</label>
                <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="ex: Ahmed Mansouri"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom d'utilisateur</label>
                <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="ex: amansouri"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Mot de passe initial</label>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Entité</label>
                <select value={newEntityId} onChange={(e) => setNewEntityId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Aucune entité</option>
                  {entities.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Rôle Système</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="ADMIN">ADMIN (Accès total & Gestion)</option>
                  <option value="COMPTABLE">COMPTABLE (Saisie & Impression)</option>
                  <option value="VISITEUR">VISITEUR (Consultation uniquement)</option>
                </select>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} className="rounded text-blue-500 w-4 h-4" />
                  <span>Compte actif</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={newCanEdit} onChange={(e) => setNewCanEdit(e.target.checked)} className="rounded text-blue-500 w-4 h-4" />
                  <span>Droit d'édition</span>
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
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 font-display">Modifier : {selectedUser.fullName}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Nom complet</label>
                <input type="text" required value={editFullName} onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Identifiant</label>
                <input type="text" required value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Entité</label>
                <select value={editEntityId} onChange={(e) => setEditEntityId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Aucune entité</option>
                  {entities.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Rôle Système</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="ADMIN">ADMIN</option>
                  <option value="COMPTABLE">COMPTABLE</option>
                  <option value="VISITEUR">VISITEUR</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Réinitialiser mot de passe (laisser vide pour ne pas changer)</label>
                <input type="password" value={editNewPassword} onChange={(e) => setEditNewPassword(e.target.value)} placeholder="Nouveau mot de passe"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded text-blue-500 w-4 h-4" />
                  <span>Actif</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={editCanEdit} onChange={(e) => setEditCanEdit(e.target.checked)} className="rounded text-blue-500 w-4 h-4" />
                  <span>Édition</span>
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
