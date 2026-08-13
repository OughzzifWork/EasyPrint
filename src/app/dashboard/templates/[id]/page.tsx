"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TemplateCanvas, TemplateFieldItem } from "@/components/templates/TemplateCanvas";
import {
  Upload,
  Save,
  ArrowLeft,
  Eye,
  AlertCircle,
  X,
  CheckCircle,
} from "lucide-react";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [name, setName] = useState("");
  const [physicalWidthMm, setPhysicalWidthMm] = useState<number>(210);
  const [physicalHeightMm, setPhysicalHeightMm] = useState<number>(100);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [fields, setFields] = useState<TemplateFieldItem[]>([]);

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${id}`);
        if (!res.ok) throw new Error("Modèle introuvable.");
        const data = await res.json();
        setTemplate(data);
        setName(data.name);
        setPhysicalWidthMm(data.physicalWidthMm);
        setPhysicalHeightMm(data.physicalHeightMm);
        setBackgroundImageUrl(data.backgroundImageUrl);
        setIsActive(data.isActive);
        setFields(data.fields || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTemplate();
  }, [id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setBackgroundImageUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleGeneratePreview = async () => {
    setError(null);
    try {
      const res = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          physicalWidthMm,
          physicalHeightMm,
          backgroundImageUrl,
          fields,
          drawGridOrBoxes: true,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la génération de l'aperçu PDF.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          physicalWidthMm,
          physicalHeightMm,
          backgroundImageUrl,
          isActive,
          fields,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la mise à jour.");

      router.push("/dashboard/templates");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Édition du Modèle" />
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          Chargement du modèle...
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <Header title="Erreur" />
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-rose-600">
          Modèle d'impression non trouvé.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Header title={`Modifier le Modèle : ${template.name}`} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux modèles</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGeneratePreview}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Aperçu PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Enregistrement..." : "Mettre à jour le Modèle"}</span>
          </button>
        </div>
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

      {/* Meta card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-base">Caractéristiques du Modèle</h3>
          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
            {template.bank?.code} — {template.documentType}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nom du Modèle</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Largeur (mm)</label>
            <input
              type="number"
              value={physicalWidthMm}
              onChange={(e) => setPhysicalWidthMm(parseFloat(e.target.value) || 210)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Hauteur (mm)</label>
            <input
              type="number"
              value={physicalHeightMm}
              onChange={(e) => setPhysicalHeightMm(parseFloat(e.target.value) || 100)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Changer Scan</label>
            <label className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Charger Image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600 w-4 h-4"
            />
            <span>Définir comme modèle actif pour cette banque</span>
          </label>
        </div>
      </div>

      {/* Visual Canvas Designer */}
      <TemplateCanvas
        documentType={template.documentType}
        physicalWidthMm={physicalWidthMm}
        physicalHeightMm={physicalHeightMm}
        backgroundImageUrl={backgroundImageUrl}
        fields={fields}
        onChangeFields={setFields}
        onGeneratePreviewPdf={handleGeneratePreview}
      />

      {/* PDF Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Aperçu PDF Calibré</h3>
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
