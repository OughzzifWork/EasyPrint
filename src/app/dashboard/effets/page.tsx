"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import { convertAmountToWordsFr } from "@/lib/numberToWordsFr";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  CheckCircle,
  Upload,
  RotateCcw,
  Clock,
  CheckCheck,
} from "lucide-react";
import { clsx } from "clsx";

export default function EffetsPage() {
  const { data: session } = useSession();
  const canEdit = (session?.user as any)?.canEdit !== false;
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [effets, setEffets] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: "ACTIVE" (En cours), "PRINTED" (Déjà Imprimé), "DELETED" (Déjà Supprimé)
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PRINTED" | "DELETED">("ACTIVE");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedEffet, setSelectedEffet] = useState<any | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  // Form State
  const [bankId, setBankId] = useState("");
  const [sapCode, setSapCode] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amountNumeric, setAmountNumeric] = useState<string>("");
  const [amountWords, setAmountWords] = useState("");
  const [creationDate, setCreationDate] = useState(new Date().toISOString().split("T")[0]);
  const [creationPlace, setCreationPlace] = useState("Casablanca");
  const [cause, setCause] = useState("");
  const [storedBeneficiaries, setStoredBeneficiaries] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/beneficiaries")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setStoredBeneficiaries(data))
      .catch((e) => console.error(e));
  }, []);

  // Excel Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchEffets = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/effets", window.location.origin);
      if (selectedBankId) url.searchParams.set("bankId", selectedBankId);
      if (search) url.searchParams.set("search", search);
      url.searchParams.set("includeDeleted", "true");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Erreur de chargement des effets.");
      const data = await res.json();
      setEffets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreEffet = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/effets/${id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de restauration.");
      setSuccess("Effet restauré avec succès.");
      fetchEffets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleHardDeleteEffet = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Voulez-vous supprimer DÉFINITIVEMENT cet effet ? Action irréversible.")) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/effets/${id}?hard=true`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression définitive.");
      setSuccess("Effet supprimé définitivement.");
      fetchEffets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/banks");
      if (res.ok) {
        const data = await res.json();
        const activeBanks = data.filter((b: any) => b.active);
        setBanks(activeBanks);
        if (activeBanks.length > 0) setBankId(activeBanks[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    fetchEffets();
  }, [selectedBankId]);

  // Auto-calculate amount in words when numeric amount changes
  const handleAmountNumericChange = (val: string) => {
    setAmountNumeric(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmountWords(convertAmountToWordsFr(num));
    } else {
      setAmountWords("");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/effets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          sapCode,
          beneficiary,
          dueDate,
          amountNumeric: parseFloat(amountNumeric),
          amountWords,
          creationDate,
          creationPlace,
          cause,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création de l'effet.");

      setSuccess("Effet créé avec succès.");
      setIsCreateOpen(false);
      resetForm();
      fetchEffets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEffet) return;
    setError(null);

    try {
      const res = await fetch(`/api/effets/${selectedEffet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          sapCode,
          beneficiary,
          dueDate,
          amountNumeric: parseFloat(amountNumeric),
          amountWords,
          creationDate,
          creationPlace,
          cause,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la modification de l'effet.");

      setSuccess("Effet mis à jour.");
      setIsEditOpen(false);
      setSelectedEffet(null);
      fetchEffets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!confirm("Voulez-vous effectuer la suppression logique de cet effet ?")) return;
    try {
      const res = await fetch(`/api/effets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur de suppression.");
      }
      setSuccess("Effet archivé (Soft Delete).");
      fetchEffets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openPrintPdfModal = async (id: string) => {
    setPrintError(null);
    setPreviewPdfUrl(null);
    setPrintLoading(true);
    setIsPrintOpen(true);
    try {
      const res = await fetch(`/api/effets/${id}/print`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status} lors de la génération du PDF.`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl(blobUrl);
      setTimeout(fetchEffets, 500);
    } catch (err: any) {
      setPrintError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = effets.map((e) => ({
      ID: e.id,
      Code_SAP: e.sapCode,
      Banque: e.bank?.name || "",
      Code_Banque: e.bank?.code || "",
      Bénéficiaire: e.beneficiary,
      Date_Echéance: e.dueDate ? new Date(e.dueDate).toLocaleDateString("fr-FR") : "",
      Montant_Chiffres: e.amountNumeric,
      Montant_Lettres: e.amountWords,
      Motif_Cause: e.cause,
      Lieu_Création: e.creationPlace,
      Date_Création: e.creationDate ? new Date(e.creationDate).toLocaleDateString("fr-FR") : "",
      Statut: e.status,
      Créé_Par: e.createdBy,
      Supprimé: e.deletedAt ? "Oui" : "Non",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Effets_LCN");
    XLSX.writeFile(workbook, `Effets_IMPCE_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleBatchImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const dataBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) throw new Error("Le fichier Excel est vide.");

      let importedCount = 0;
      let errorsCount = 0;

      for (const row of rows) {
        const sapCodeVal = row["Code_SAP"] || row["SAP"] || row["sapCode"] || row["Code SAP"];
        const beneficiaryVal = row["Bénéficiaire"] || row["Beneficiaire"] || row["beneficiary"];
        const amountVal = row["Montant"] || row["Montant_Chiffres"] || row["amountNumeric"];
        const dueDateVal = row["Date_Echéance"] || row["Date_Echeance"] || row["dueDate"] || row["Echéance"];
        const bankCodeVal = row["Code_Banque"] || row["Banque"] || row["bankCode"];
        const causeVal = row["Motif"] || row["Cause"] || row["cause"] || "";

        if (!beneficiaryVal || !amountVal || !dueDateVal) {
          errorsCount++;
          continue;
        }

        // Match bank by code or use selected bankId
        let targetBankId = bankId;
        if (bankCodeVal) {
          const matchedBank = banks.find((b) => b.code.toLowerCase() === String(bankCodeVal).trim().toLowerCase() || b.name.toLowerCase().includes(String(bankCodeVal).trim().toLowerCase()));
          if (matchedBank) targetBankId = matchedBank.id;
        }

        const res = await fetch("/api/effets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankId: targetBankId,
            sapCode: String(sapCodeVal),
            beneficiary: String(beneficiaryVal),
            dueDate: new Date(dueDateVal).toISOString().split("T")[0],
            amountNumeric: parseFloat(amountVal),
            amountWords: convertAmountToWordsFr(parseFloat(amountVal)),
            creationDate: new Date().toISOString().split("T")[0],
            creationPlace: "Casablanca",
            cause: String(causeVal),
          }),
        });

        if (res.ok) importedCount++;
        else errorsCount++;
      }

      setSuccess(`Import terminé : ${importedCount} effet(s) créé(s) avec succès${errorsCount > 0 ? `, ${errorsCount} ligne(s) ignorée(s)` : ""}.`);
      setIsImportOpen(false);
      setImportFile(null);
      fetchEffets();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import du fichier Excel.");
    } finally {
      setImporting(false);
    }
  };

  const openEditModal = (e: any) => {
    setSelectedEffet(e);
    setBankId(e.bankId);
    setSapCode(e.sapCode);
    setBeneficiary(e.beneficiary);
    setDueDate(e.dueDate ? new Date(e.dueDate).toISOString().split("T")[0] : "");
    setAmountNumeric(String(e.amountNumeric));
    setAmountWords(e.amountWords);
    setCreationDate(e.creationDate ? new Date(e.creationDate).toISOString().split("T")[0] : "");
    setCreationPlace(e.creationPlace || "Casablanca");
    setCause(e.cause || "");
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setSapCode("");
    setBeneficiary("");
    setDueDate("");
    setAmountNumeric("");
    setAmountWords("");
    setCreationDate(new Date().toISOString().split("T")[0]);
    setCreationPlace("Casablanca");
    setCause("");
  };

  const countActive = effets.filter((e) => !e.deletedAt && e.status !== "PRINTED").length;
  const countPrinted = effets.filter((e) => !e.deletedAt && e.status === "PRINTED").length;
  const countDeleted = effets.filter((e) => e.deletedAt).length;

  const filteredEffets = effets.filter((e) => {
    const matchesSearch =
      e.beneficiary.toLowerCase().includes(search.toLowerCase()) ||
      e.sapCode.toLowerCase().includes(search.toLowerCase()) ||
      (e.cause && e.cause.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "ACTIVE") return !e.deletedAt && e.status !== "PRINTED";
    if (activeTab === "PRINTED") return !e.deletedAt && e.status === "PRINTED";
    if (activeTab === "DELETED") return e.deletedAt != null;
    return true;
  });

  return (
    <div className="space-y-6">
      <Header title="Gestion & Saisie des Effets (Lettres de Change - LCN)" />

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher code SAP, bénéficiaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Bank Filter */}
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          >
            <option value="">Toutes les banques</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm rounded-xl border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Import Batch Excel</span>
              </button>

              <button
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvel Effet (LCN)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3 TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border",
            activeTab === "ACTIVE"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Documents en cours</span>
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
              activeTab === "ACTIVE" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}
          >
            {countActive}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PRINTED")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border",
            activeTab === "PRINTED"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <CheckCheck className="w-4 h-4" />
          <span>Documents Déjà Imprimés</span>
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
              activeTab === "PRINTED" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}
          >
            {countPrinted}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("DELETED")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border",
            activeTab === "DELETED"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <Trash2 className="w-4 h-4" />
          <span>Documents Déjà Supprimés</span>
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
              activeTab === "DELETED" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}
          >
            {countDeleted}
          </span>
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

      {/* DataGrid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chargement des effets...</div>
        ) : filteredEffets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Aucun effet LCN enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Code SAP</th>
                  <th className="py-3.5 px-6">Banque</th>
                  <th className="py-3.5 px-6">Bénéficiaire</th>
                  <th className="py-3.5 px-6">Échéance</th>
                  <th className="py-3.5 px-6">Montant (#)</th>
                  <th className="py-3.5 px-6">Motif / Cause</th>
                  <th className="py-3.5 px-6">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEffets.map((e) => (
                  <tr
                    key={e.id}
                    className={clsx(
                      "hover:bg-slate-50/80 transition-colors",
                      e.deletedAt && "bg-rose-50/40 opacity-70 italic"
                    )}
                  >
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{e.sapCode}</td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-xs font-mono font-bold text-slate-800">
                        {e.bank?.code || "BANQUE"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{e.beneficiary}</td>
                    <td className="py-4 px-6 font-semibold text-amber-700">
                      {e.dueDate ? new Date(e.dueDate).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-blue-700">
                      {e.amountNumeric.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} #
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate" title={e.cause}>
                      {e.cause || "-"}
                    </td>
                    <td className="py-4 px-6">
                      {e.deletedAt ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Supprimé (Soft Delete)
                        </span>
                      ) : (
                        <span
                          className={clsx(
                            "px-2.5 py-1 rounded-full text-xs font-bold uppercase border",
                            e.status === "PRINTED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {e.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {e.deletedAt ? (
                          <>
                            {canEdit && (
                              <button
                                onClick={() => handleRestoreEffet(e.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 transition-colors"
                                title="Récupérer / Restaurer cet effet"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restaurer</span>
                              </button>
                            )}

                            {isAdmin && (
                              e.status === "PRINTED" ? (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-300 rounded-lg text-xs font-bold border border-slate-200 cursor-not-allowed"
                                  title="Suppression impossible pour un effet déjà imprimé"
                                >
                                  <Trash2 className="w-3.5 h-3.5 opacity-40" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleHardDeleteEffet(e.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold border border-rose-300 transition-colors"
                                  title="Supprimer définitivement (Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </>
                        ) : (
                          <>
                            {e.status === "PRINTED" ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 p-2 text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed text-xs font-semibold border border-slate-200"
                                title="Effet déjà imprimé (Réimpression désactivée)"
                              >
                                <Printer className="w-4 h-4 opacity-40" /> Imprimé
                              </button>
                            ) : (
                              <button
                                onClick={() => openPrintPdfModal(e.id)}
                                className="inline-flex items-center gap-1 p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-xs font-semibold"
                                title="Imprimer la Lettre de Change"
                              >
                                <Printer className="w-4 h-4" /> Imprimer
                              </button>
                            )}

                            {canEdit && (
                              <>
                                {e.status === "PRINTED" || e.deletedAt != null ? (
                                  <button
                                    disabled
                                    className="p-2 text-slate-300 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200"
                                    title={e.status === "PRINTED" ? "Édition désactivée pour un effet déjà imprimé" : "Édition désactivée pour un effet supprimé"}
                                  >
                                    <Edit2 className="w-4 h-4 opacity-40" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openEditModal(e)}
                                    className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {e.status === "PRINTED" ? (
                                  <button
                                    disabled
                                    className="p-2 text-slate-300 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200"
                                    title="Suppression désactivée pour un effet déjà imprimé"
                                  >
                                    <Trash2 className="w-4 h-4 opacity-40" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSoftDelete(e.id)}
                                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Suppression Logique"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Saisie Effet */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <span>Saisie d'une nouvelle Lettre de Change (Effet LCN)</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Banque tirée</label>
                  <select
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Code SAP / Réf (Optionnel)</label>
                  <input
                    type="text"
                    value={sapCode}
                    onChange={(e) => setSapCode(e.target.value)}
                    placeholder="ex: SAP-80291 (Optionnel)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Nom du Bénéficiaire (Propositions enregistrées)
                </label>
                <input
                  type="text"
                  required
                  list="effets-beneficiaries-list"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="Tapez ou sélectionnez un bénéficiaire enregistré..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <datalist id="effets-beneficiaries-list">
                  {storedBeneficiaries.map((b: any) => (
                    <option key={b.id || b.name} value={b.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Date d'Échéance</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Montant en chiffres (#)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountNumeric}
                    onChange={(e) => handleAmountNumericChange(e.target.value)}
                    placeholder="ex: 45000.00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Montant en lettres (Généré en Français)
                </label>
                <textarea
                  rows={2}
                  value={amountWords}
                  onChange={(e) => setAmountWords(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Motif / Cause</label>
                  <input
                    type="text"
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    placeholder="ex: Règlement Facture N° 4021"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Lieu de création</label>
                  <input
                    type="text"
                    value={creationPlace}
                    onChange={(e) => setCreationPlace(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-amber-500/20"
                >
                  Enregistrer l'effet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Effet */}
      {isEditOpen && selectedEffet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Modifier l'effet {selectedEffet.sapCode}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Code SAP (Optionnel)</label>
                  <input
                    type="text"
                    value={sapCode}
                    onChange={(e) => setSapCode(e.target.value)}
                    placeholder="Optionnel"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Date d'Échéance</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nom du Bénéficiaire</label>
                <input
                  type="text"
                  required
                  list="effets-beneficiaries-list"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Montant (#)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountNumeric}
                    onChange={(e) => handleAmountNumericChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Motif / Cause</label>
                  <input
                    type="text"
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Montant en lettres</label>
                <textarea
                  rows={2}
                  value={amountWords}
                  onChange={(e) => setAmountWords(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-amber-500/20"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Batch Import Excel */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-600" />
                <span>Import Batch Excel de Lettres de Change</span>
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Banque par défaut si non spécifiée
                </label>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Fichier Excel (.xlsx / .xls / .csv)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  required
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">Format de colonnes attendu :</p>
                <p>
                  <code className="font-mono text-amber-700">Code_SAP</code>,{" "}
                  <code className="font-mono text-amber-700">Bénéficiaire</code>,{" "}
                  <code className="font-mono text-amber-700">Montant</code>,{" "}
                  <code className="font-mono text-amber-700">Date_Echéance</code>,{" "}
                  <code className="font-mono text-amber-700">Code_Banque</code> (optionnel).
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2"
                >
                  {importing && <Upload className="w-4 h-4 animate-spin" />}
                  <span>Lancer l'importation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Modal Viewer */}
      {isPrintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <span>PDF d'Impression Calibré de l'Effet LCN (Prêt à l'impression)</span>
              </h3>
              <button
                onClick={() => {
                  setIsPrintOpen(false);
                  if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
                  setPreviewPdfUrl(null);
                  setPrintError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {printLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
                <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-sm font-medium">Génération du PDF en cours...</p>
              </div>
            )}

            {printError && !printLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <div className="text-center">
                  <p className="font-bold text-red-700 mb-2">Impossible de générer le PDF</p>
                  <p className="text-sm text-slate-600 max-w-md">{printError}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    Assurez-vous qu'un modèle d'impression actif avec des champs est configuré pour les effets LCN de cette banque dans la section Modèles.
                  </p>
                </div>
              </div>
            )}

            {previewPdfUrl && !printLoading && !printError && (
              <iframe src={previewPdfUrl} className="w-full flex-1 border-none" title="PDF Print Preview" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
