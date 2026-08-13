"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useSession } from "next-auth/react";
import {
  History,
  Search,
  Clock,
  FileCheck2,
  FileSpreadsheet,
  Building2,
  LayoutTemplate,
  Users,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
} from "lucide-react";
import { clsx } from "clsx";

export default function AuditPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/audit", window.location.origin);
      if (selectedEntity) url.searchParams.set("entityType", selectedEntity);
      if (selectedAction) url.searchParams.set("action", selectedAction);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur de chargement des journaux d'audit.");
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedEntity, selectedAction]);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "CHEQUE":
        return <FileCheck2 className="w-4 h-4 text-emerald-600" />;
      case "EFFET":
        return <FileSpreadsheet className="w-4 h-4 text-amber-600" />;
      case "BANK":
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case "TEMPLATE":
        return <LayoutTemplate className="w-4 h-4 text-indigo-600" />;
      case "USER":
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <History className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            CRÉATION
          </span>
        );
      case "UPDATE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            MODIFICATION
          </span>
        );
      case "SOFT_DELETE":
      case "DELETE":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            SUPPRESSION
          </span>
        );
      case "PRINT":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            IMPRESSION PDF
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  const parseJson = (val: string | null) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6">
      <Header title="Journal d'Audit & Historique des Actions" />

      {/* Filter & Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher utilisateur, ID, contenu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAuditLogs()}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entity Type Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Toutes les entités</option>
            <option value="CHEQUE">Chèques</option>
            <option value="EFFET">Effets (LCN)</option>
            <option value="BANK">Banques</option>
            <option value="TEMPLATE">Modèles d'impression</option>
            <option value="USER">Utilisateurs</option>
          </select>

          {/* Action Type Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Toutes les actions</option>
            <option value="CREATE">Création</option>
            <option value="UPDATE">Modification</option>
            <option value="PRINT">Impression PDF</option>
            <option value="SOFT_DELETE">Suppression</option>
          </select>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors shrink-0"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          <span>Actualiser</span>
        </button>
      </div>

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

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chargement du journal d'audit...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Aucun événement d'audit enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Horodatage</th>
                  <th className="py-3.5 px-6">Utilisateur</th>
                  <th className="py-3.5 px-6">Entité</th>
                  <th className="py-3.5 px-6">ID Entité</th>
                  <th className="py-3.5 px-6">Action</th>
                  <th className="py-3.5 px-6 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {log.user?.fullName?.charAt(0) || log.user?.username?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="text-sm leading-none">{log.user?.fullName || log.user?.username || "Inconnu"}</p>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{log.user?.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(log.entityType)}
                        <span>{log.entityType}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-500 max-w-[150px] truncate" title={log.entityId}>
                      {log.entityId}
                    </td>
                    <td className="py-4 px-6">{getActionBadge(log.action)}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Consulter</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-900">Détails de l'événement d'audit</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Utilisateur</p>
                <p className="font-bold text-slate-800">{selectedLog.user?.fullName || selectedLog.user?.username}</p>
                <p className="text-xs text-slate-500">Rôle : {selectedLog.user?.role}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Date & Heure</p>
                <p className="font-bold text-slate-800">{new Date(selectedLog.createdAt).toLocaleString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Type d'entité</p>
                <p className="font-bold text-slate-800">{selectedLog.entityType}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Action</p>
                <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase">ID Entité</p>
                <p className="font-mono text-xs text-slate-700 break-all">{selectedLog.entityId}</p>
              </div>
            </div>

            {/* Old Value vs New Value JSON Inspection */}
            <div className="space-y-3">
              {selectedLog.oldValue && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Ancienne valeur (Old Value)</label>
                  <pre className="p-3 bg-rose-950 text-rose-200 rounded-xl text-xs font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(parseJson(selectedLog.oldValue), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Nouvelle valeur (New Value)</label>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-xs font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(parseJson(selectedLog.newValue), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
