"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { fetchApi, fetchApiRaw } from "@/lib/api";
import Link from "next/link";
import {
  LayoutTemplate,
  Plus,
  Building2,
  FileCheck2,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  History,
  AlertCircle,
  X,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";

export default function TemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/templates");
      setTemplates(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDeleteTemplate = async (template: any) => {
    if (!isAdmin) return;
    if (!confirm(`Voulez-vous vraiment supprimer le modèle "${template.name}" ?`)) return;

    setError(null);
    setSuccess(null);
    try {
      await fetchApi(`/api/templates/${template.id}`, { method: "DELETE" });

      setSuccess(`Modèle "${template.name}" supprimé avec succès.`);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenPreviewPdf = async (template: any) => {
    setIsPreviewLoading(true);
    try {
      const res = await fetchApiRaw("/api/templates/preview", {
        method: "POST",
        body: JSON.stringify({
          physicalWidthMm: template.physicalWidthMm,
          physicalHeightMm: template.physicalHeightMm,
          backgroundImageUrl: template.backgroundImageUrl,
          fields: template.fields,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la génération du PDF d'aperçu.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header title="Modèles d'impression (Templates)" />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Gabarits visuels enregistrés</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Versionnage automatique : lors de l'activation d'un nouveau modèle pour une banque, l'ancien est archivé sans suppression.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/dashboard/templates/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm font-semibold rounded-xl shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Modèle Visuel</span>
          </Link>
        )}
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

      {/* Grid of Templates */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 font-medium">
          Chargement des modèles d'impression...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Aucun modèle d'impression défini.</p>
          {isAdmin && (
            <Link
              href="/dashboard/templates/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-xs font-semibold rounded-xl"
            >
              Créer le premier modèle
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className={clsx(
                "bg-white rounded-xl border p-5 shadow-sm transition-all duration-200 flex flex-col justify-between relative overflow-hidden",
                tmpl.isActive ? "border-blue-200 ring-1 ring-[#1E3A8A]/20" : "border-slate-200 opacity-80 bg-slate-50/50"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {tmpl.bank?.code || "BANQUE"}
                      </span>
                      <span
                        className={clsx(
                          "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border",
                          tmpl.documentType === "CHEQUE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {tmpl.documentType}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 mt-2 text-base leading-tight">{tmpl.name}</h3>
                  </div>

                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
                      tmpl.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    {tmpl.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                    <span>{tmpl.isActive ? "Actif" : "Archivé"}</span>
                  </span>
                </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Entités :</span>
                    <span className="font-semibold text-slate-700 text-right max-w-[60%] truncate" title={tmpl.templateEntities?.map((te: any) => te.entity?.name).join(", ")}>
                      {tmpl.templateEntities?.length > 0
                        ? tmpl.templateEntities.map((te: any) => te.entity?.name).join(", ")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dimensions :</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {tmpl.physicalWidthMm} × {tmpl.physicalHeightMm} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Zones paramétrées :</span>
                    <span className="font-bold text-[#1E3A8A]">{tmpl.fields?.length || 0} zones</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenPreviewPdf(tmpl)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Aperçu PDF</span>
                  </button>

                  {isAdmin && (
                    <Link
                      href={`/dashboard/templates/${tmpl.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Éditer</span>
                    </Link>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteTemplate(tmpl)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
                    title="Supprimer le modèle (Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Modal Viewer */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Aperçu du PDF Calibré au Millimètre Près</span>
              </h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewPdfUrl);
                  setPreviewPdfUrl(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe src={previewPdfUrl} className="w-full flex-1 border-none" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
