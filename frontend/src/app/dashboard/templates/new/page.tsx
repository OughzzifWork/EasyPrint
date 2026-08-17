"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TemplateCanvas, TemplateFieldItem } from "@/components/templates/TemplateCanvas";
import { fetchApi, fetchApiRaw } from "@/lib/api";
import {
  Upload,
  Save,
  ArrowLeft,
  LayoutTemplate,
  Building2,
  CheckCircle,
  AlertCircle,
  X,
  FileCheck2,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import { BankDTO } from "@/types";
import { clsx } from "clsx";

export default function NewTemplatePage() {
  const router = useRouter();

  const [banks, setBanks] = useState<BankDTO[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  // Form step / meta fields
  const [bankId, setBankId] = useState("");
  const [documentType, setDocumentType] = useState<"CHEQUE" | "EFFET">("CHEQUE");
  const [name, setName] = useState("");
  const [physicalWidthMm, setPhysicalWidthMm] = useState<number>(210);
  const [physicalHeightMm, setPhysicalHeightMm] = useState<number>(100);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Canvas fields list
  const [fields, setFields] = useState<TemplateFieldItem[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const data = await fetchApi("/api/banks");
        setBanks(data.filter((b: BankDTO) => b.active));
        if (data.length > 0) setBankId(data[0].id);
      } catch (err) {
        console.error("Error loading banks:", err);
      } finally {
        setLoadingBanks(false);
      }
    };
    loadBanks();
  }, []);

  // Handle Scan Image File Upload
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

  // Generate real-time PDF Preview
  const handleGeneratePreview = async () => {
    setError(null);
    try {
      const res = await fetchApiRaw("/api/templates/preview", {
        method: "POST",
        body: JSON.stringify({
          physicalWidthMm,
          physicalHeightMm,
          backgroundImageUrl,
          fields,
          drawGridOrBoxes: true,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors du rendu du PDF d'aperçu.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle Save Template
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bankId || !name.trim()) {
      setError("Veuillez sélectionner une banque et renseigner le nom du modèle.");
      return;
    }

    if (fields.length === 0) {
      setError("Veuillez ajouter au moins une zone de texte à votre modèle.");
      return;
    }

    setIsSubmitting(true);

    try {
      await fetchApi("/api/templates", {
        method: "POST",
        body: JSON.stringify({
          bankId,
          documentType,
          name,
          physicalWidthMm,
          physicalHeightMm,
          backgroundImageUrl,
          isActive,
          fields,
        }),
      });

      router.push("/dashboard/templates");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Header title="Nouveau Modèle d'Impression (Gabarit Visuel)" />

      {/* Top Action Header */}
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
            <span>Tester l'aperçu PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Enregistrement..." : "Enregistrer le Modèle"}</span>
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

      {/* Main Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
          1. Caractéristiques Générales du Document
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bank Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Banque liée</label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Type de Document</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDocumentType("CHEQUE");
                  setName(`Gabarit Chèque ${banks.find((b) => b.id === bankId)?.code || ""}`);
                }}
                className={clsx(
                  "p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all",
                  documentType === "CHEQUE"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                )}
              >
                <FileCheck2 className="w-4 h-4" /> Chèque
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocumentType("EFFET");
                  setName(`Gabarit Effet ${banks.find((b) => b.id === bankId)?.code || ""}`);
                }}
                className={clsx(
                  "p-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all",
                  documentType === "EFFET"
                    ? "bg-amber-600 text-white border-amber-600 shadow"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                )}
              >
                <FileSpreadsheet className="w-4 h-4" /> Effet (LCN)
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nom du Modèle</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Chèque Standard 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Dimensions & Image Upload */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Largeur physique réelle (mm)
            </label>
            <input
              type="number"
              step="1"
              value={physicalWidthMm}
              onChange={(e) => setPhysicalWidthMm(parseFloat(e.target.value) || 210)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Hauteur physique réelle (mm)
            </label>
            <input
              type="number"
              step="1"
              value={physicalHeightMm}
              onChange={(e) => setPhysicalHeightMm(parseFloat(e.target.value) || 100)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Image de fond (Scan document vierge)
            </label>
            <label className="w-full flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl cursor-pointer text-xs text-slate-700 font-semibold transition-colors">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>{backgroundImageUrl ? "Changer le scan..." : "Téléverser un scan (PNG/JPG)"}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Visual Canvas Designer */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 text-base px-1">
          2. Concepteur Visuel Interactif (Positionner les zones sur le document)
        </h3>
        <TemplateCanvas
          documentType={documentType}
          physicalWidthMm={physicalWidthMm}
          physicalHeightMm={physicalHeightMm}
          backgroundImageUrl={backgroundImageUrl}
          fields={fields}
          onChangeFields={setFields}
          onGeneratePreviewPdf={handleGeneratePreview}
        />
      </div>

      {/* PDF Modal Viewer */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Aperçu PDF Calibré au Millimètre Près</span>
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
