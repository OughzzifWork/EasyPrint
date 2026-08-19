"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { fetchApi, fetchApiRaw } from "@/lib/api";
import * as ExcelJS from "exceljs";
import { convertAmountToWordsFr } from "@/lib/numberToWordsFr";
import {
  FileCheck2,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  FileSpreadsheet,
  AlertCircle,
  X,
  CheckCircle,
  Upload,
  RotateCcw,
  Clock,
  CheckCheck,
  UserCheck,
} from "lucide-react";
import { clsx } from "clsx";

export default function ChequesPage() {
  const { user } = useAuth();
  const canEdit = user?.canEdit !== false;
  const isAdmin = user?.role === "ADMIN";

  const [cheques, setCheques] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: "ACTIVE" (En cours), "PRINTED" (Déjà Imprimé), "DELETED" (Déjà Supprimé)
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PRINTED" | "DELETED">("ACTIVE");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<any | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printChequeId, setPrintChequeId] = useState<string | null>(null);

  // Form state
  const [bankId, setBankId] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
  const [amountNumeric, setAmountNumeric] = useState<string>("");
  const [amountWords, setAmountWords] = useState("");
  const [creationDate, setCreationDate] = useState(new Date().toISOString().split("T")[0]);
  const [creationPlace, setCreationPlace] = useState("Casablanca");
  const [storedBeneficiaries, setStoredBeneficiaries] = useState<any[]>([]);

  useEffect(() => {
    const loadBeneficiaries = async () => {
      try {
        const data = await fetchApi("/api/beneficiaries");
        setStoredBeneficiaries(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadBeneficiaries();
  }, []);

  // Excel Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchCheques = async () => {
    setLoading(true);
    try {
      let chequesUrl = "/api/cheques?";
      if (selectedBankId) chequesUrl += `bankId=${encodeURIComponent(selectedBankId)}&`;
      if (search) chequesUrl += `search=${encodeURIComponent(search)}&`;
      chequesUrl += "includeDeleted=true";

      const data = await fetchApi(chequesUrl);
      setCheques(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreCheque = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await fetchApi(`/api/cheques/${id}/restore`, { method: "POST" });
      setSuccess("Chèque restauré avec succès.");
      fetchCheques();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleHardDeleteCheque = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Voulez-vous supprimer DÉFINITIVEMENT ce chèque ? Action irréversible.")) return;

    setError(null);
    setSuccess(null);
    try {
      await fetchApi(`/api/cheques/${id}?hard=true`, { method: "DELETE" });
      setSuccess("Chèque supprimé définitivement.");
      fetchCheques();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBanks = async () => {
    try {
      const data = await fetchApi("/api/banks");
      const activeBanks = data.filter((b: any) => b.active);
      setBanks(activeBanks);
      if (activeBanks.length > 0) setBankId(activeBanks[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEntities = async () => {
    try {
      const data = await fetchApi("/api/entities");
      setEntities(Array.isArray(data) ? data.filter((e: any) => e.active) : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBanks();
    fetchEntities();
  }, []);

  useEffect(() => {
    fetchCheques();
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
      await fetchApi("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          beneficiary,
          amountNumeric: parseFloat(amountNumeric),
          amountWords,
          creationDate,
          creationPlace,
        }),
      });

      setSuccess("Chèque créé avec succès.");
      setIsCreateOpen(false);
      resetForm();
      fetchCheques();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheque) return;
    setError(null);

    try {
      await fetchApi(`/api/cheques/${selectedCheque.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          beneficiary,
          amountNumeric: parseFloat(amountNumeric),
          amountWords,
          creationDate,
          creationPlace,
        }),
      });

      setSuccess("Chèque mis à jour.");
      setIsEditOpen(false);
      setSelectedCheque(null);
      fetchCheques();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!confirm("Voulez-vous effectuer la suppression logique de ce chèque ?")) return;
    try {
      await fetchApi(`/api/cheques/${id}`, { method: "DELETE" });
      setSuccess("Chèque archivé (Soft Delete).");
      fetchCheques();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openPrintPdfModal = async (id: string) => {
    setPrintError(null);
    setPreviewPdfUrl(null);
    setPrintLoading(true);
    setIsPrintOpen(true);
    setPrintChequeId(id);
    try {
      const stored = localStorage.getItem("impce_printer_config");
      const cfg = stored ? JSON.parse(stored) : {};
      const params = new URLSearchParams({
        orientation: cfg.orientation || "LANDSCAPE",
        decimals: String(cfg.decimals ?? 2),
        thousandSep: cfg.thousandSep || " ",
        currency: cfg.currency || "MAD",
        dateFormat: cfg.dateFormat || "DD/MM/YYYY",
        amountPrefix: cfg.amountPrefix ?? "#",
        amountSuffix: cfg.amountSuffix ?? "#",
        offsetX: String(cfg.offsetX ?? 0),
        offsetY: String(cfg.offsetY ?? 0),
      });
      const res = await fetchApiRaw(`/api/cheques/${id}/print?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status} lors de la génération du PDF.`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl(blobUrl);
      setTimeout(fetchCheques, 500);
    } catch (err: any) {
      setPrintError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  const refreshPrintPreview = async () => {
    if (!printChequeId) return;
    setPrintLoading(true);
    setPrintError(null);
    setPreviewPdfUrl(null);
    try {
      const stored = localStorage.getItem("impce_printer_config");
      const cfg = stored ? JSON.parse(stored) : {};
      const params = new URLSearchParams({
        orientation: cfg.orientation || "LANDSCAPE",
        decimals: String(cfg.decimals ?? 2),
        thousandSep: cfg.thousandSep || " ",
        currency: cfg.currency || "MAD",
        dateFormat: cfg.dateFormat || "DD/MM/YYYY",
        amountPrefix: cfg.amountPrefix ?? "#",
        amountSuffix: cfg.amountSuffix ?? "#",
        offsetX: String(cfg.offsetX ?? 0),
        offsetY: String(cfg.offsetY ?? 0),
      });
      const res = await fetchApiRaw(`/api/cheques/${printChequeId}/print?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setPrintError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Chèques");
    worksheet.columns = [
      { header: "ID", key: "ID", width: 36 },
      { header: "Banque", key: "Banque", width: 25 },
      { header: "Code_Banque", key: "Code_Banque", width: 15 },
      { header: "Bénéficiaire", key: "Bénéficiaire", width: 30 },
      { header: "Montant_Chiffres", key: "Montant_Chiffres", width: 18 },
      { header: "Montant_Lettres", key: "Montant_Lettres", width: 40 },
      { header: "Lieu_Création", key: "Lieu_Création", width: 20 },
      { header: "Date_Création", key: "Date_Création", width: 15 },
      { header: "Statut", key: "Statut", width: 12 },
      { header: "Créé_Par", key: "Créé_Par", width: 20 },
      { header: "Supprimé", key: "Supprimé", width: 12 },
    ];
    cheques.forEach((c) => {
      worksheet.addRow({
        ID: c.id,
        Banque: c.bank?.name || "",
        Code_Banque: c.bank?.code || "",
        Bénéficiaire: c.beneficiary,
        Montant_Chiffres: c.amountNumeric,
        Montant_Lettres: c.amountWords,
        Lieu_Création: c.creationPlace,
        Date_Création: c.creationDate ? new Date(c.creationDate).toLocaleDateString("fr-FR") : "",
        Statut: c.status,
        Créé_Par: c.createdBy,
        Supprimé: c.deletedAt ? "Oui" : "Non",
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cheques_EasyPrint_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const dataBuffer = await importFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(dataBuffer);
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount <= 1) throw new Error("Le fichier Excel est vide.");

      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => { headers[colNumber] = String(cell.value || ""); });

      const rows: any[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: any = {};
        row.eachCell((cell, colNumber) => { obj[headers[colNumber]] = cell.value; });
        rows.push(obj);
      });

      if (rows.length === 0) throw new Error("Le fichier Excel est vide.");

      let importedCount = 0;
      let errorsCount = 0;

      for (const row of rows) {
        const beneficiaryVal = row["Bénéficiaire"] || row["Beneficiaire"] || row["beneficiary"];
        const amountVal = row["Montant"] || row["Montant_Chiffres"] || row["amountNumeric"];
        const bankCodeVal = row["Code_Banque"] || row["Banque"] || row["bankCode"];
        const placeVal = row["Lieu"] || row["Lieu_Création"] || row["creationPlace"] || "Casablanca";

        if (!beneficiaryVal || !amountVal) {
          errorsCount++;
          continue;
        }

        let targetBankId = bankId;
        if (bankCodeVal) {
          const matchedBank = banks.find((b) => b.code.toLowerCase() === String(bankCodeVal).trim().toLowerCase() || b.name.toLowerCase().includes(String(bankCodeVal).trim().toLowerCase()));
          if (matchedBank) targetBankId = matchedBank.id;
        }

        try {
          await fetchApi("/api/cheques", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bankId: targetBankId,
              beneficiary: String(beneficiaryVal),
              amountNumeric: parseFloat(amountVal),
              amountWords: convertAmountToWordsFr(parseFloat(amountVal)),
              creationDate: new Date().toISOString().split("T")[0],
              creationPlace: String(placeVal),
            }),
          });
          importedCount++;
        } catch {
          errorsCount++;
        }
      }

      setSuccess(`Import terminé : ${importedCount} chèque(s) créé(s) avec succès${errorsCount > 0 ? `, ${errorsCount} ligne(s) ignorée(s)` : ""}.`);
      setIsImportOpen(false);
      setImportFile(null);
      fetchCheques();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import du fichier Excel.");
    } finally {
      setImporting(false);
    }
  };

  const openEditModal = (c: any) => {
    setSelectedCheque(c);
    setBankId(c.bankId);
    setBeneficiary(c.beneficiary);
    setAmountNumeric(String(c.amountNumeric));
    setAmountWords(c.amountWords);
    setCreationDate(c.creationDate ? new Date(c.creationDate).toISOString().split("T")[0] : "");
    setCreationPlace(c.creationPlace || "Casablanca");
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setBeneficiary("");
    setAmountNumeric("");
    setAmountWords("");
    setCreationDate(new Date().toISOString().split("T")[0]);
    setCreationPlace("Casablanca");
  };

  const countActive = cheques.filter((c) => !c.deletedAt && c.status !== "PRINTED").length;
  const countPrinted = cheques.filter((c) => !c.deletedAt && c.status === "PRINTED").length;
  const countDeleted = cheques.filter((c) => c.deletedAt).length;

  const filteredCheques = cheques.filter((c) => {
    const matchesSearch =
      c.beneficiary.toLowerCase().includes(search.toLowerCase()) ||
      (c.creationPlace && c.creationPlace.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedEntityId && c.entityId !== selectedEntityId) return false;

    if (activeTab === "ACTIVE") return !c.deletedAt && c.status !== "PRINTED";
    if (activeTab === "PRINTED") return !c.deletedAt && c.status === "PRINTED";
    if (activeTab === "DELETED") return c.deletedAt != null;
    return true;
  });

  return (
    <div className="space-y-6">
      <Header title="Gestion & Saisie des Chèques" />

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher bénéficiaire, lieu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
            />
          </div>

          {/* Bank Filter */}
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-medium"
          >
            <option value="">Toutes les banques</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Entity Filter */}
          {isAdmin && entities.length > 0 && (
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-medium"
            >
              <option value="">Toutes les entités</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name} ({ent.code})
                </option>
              ))}
            </select>
          )}
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
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Chèque</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3 TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border",
            activeTab === "ACTIVE"
              ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm"
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

      {/* Cheques DataGrid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chargement des chèques...</div>
        ) : filteredCheques.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Aucun chèque enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Entité</th>
                  <th className="py-3.5 px-6">Banque</th>
                  <th className="py-3.5 px-6">Bénéficiaire</th>
                  <th className="py-3.5 px-6">Montant (#)</th>
                  <th className="py-3.5 px-6">Lieu / Date</th>
                  <th className="py-3.5 px-6">Créé par</th>
                  <th className="py-3.5 px-6">Date création</th>
                  <th className="py-3.5 px-6">Date impression</th>
                  <th className="py-3.5 px-6">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCheques.map((c) => (
                  <tr
                    key={c.id}
                    className={clsx(
                      "hover:bg-slate-50/80 transition-colors",
                      c.deletedAt && "bg-rose-50/40 opacity-70 italic"
                    )}
                  >
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                        {c.entity?.code || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-xs font-mono">
                        {c.bank?.code || "BANQUE"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{c.beneficiary}</td>
                    <td className="py-4 px-6 font-mono font-bold text-[#1E3A8A]">
                      {Number(c.amountNumeric).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} #
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      <p className="font-semibold text-slate-800">{c.creationPlace}</p>
                      <p>{c.creationDate ? new Date(c.creationDate).toLocaleDateString("fr-FR") : ""}</p>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">{c.createdByName || "—"}</td>
                    <td className="py-4 px-6 text-xs text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="py-4 px-6 text-xs text-slate-500">{c.printedAt ? new Date(c.printedAt).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="py-4 px-6">
                      {c.deletedAt ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Supprimé (Soft Delete)
                        </span>
                      ) : (
                        <span
                          className={clsx(
                            "px-2.5 py-1 rounded-full text-xs font-bold uppercase border",
                            c.status === "PRINTED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20"
                          )}
                        >
                          {c.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.deletedAt ? (
                          <>
                            {canEdit && (
                              <button
                                onClick={() => handleRestoreCheque(c.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                                title="Récupérer / Restaurer ce chèque"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restaurer</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => handleHardDeleteCheque(c.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold border border-rose-300 transition-colors"
                                title="Supprimer définitivement (Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {isAdmin || c.status !== "PRINTED" ? (
                              <button
                                onClick={() => openPrintPdfModal(c.id)}
                                className="inline-flex items-center gap-1 p-2 text-[#1E3A8A] hover:bg-[#1E3A8A]/5 rounded-lg transition-colors text-xs font-semibold"
                                title={c.status === "PRINTED" ? "Réimprimer ce chèque (Admin)" : "Imprimer le PDF haute précision"}
                              >
                                <Printer className="w-4 h-4" /> {c.status === "PRINTED" ? "Réimprimer" : "Imprimer"}
                              </button>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 p-2 text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed text-xs font-semibold border border-slate-200"
                                title="Chèque déjà imprimé"
                              >
                                <Printer className="w-4 h-4 opacity-40" /> Imprimé
                              </button>
                            )}

                            {canEdit && (isAdmin || c.status !== "PRINTED") && (
                              <>
                                <button
                                  onClick={() => openEditModal(c)}
                                  className="p-2 text-slate-500 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/5 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSoftDelete(c.id)}
                                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Suppression Logique"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {canEdit && !isAdmin && c.status === "PRINTED" && (
                              <>
                                <button disabled className="p-2 text-slate-300 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200" title="Édition désactivée pour un chèque imprimé">
                                  <Edit2 className="w-4 h-4 opacity-40" />
                                </button>
                                <button disabled className="p-2 text-slate-300 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200" title="Suppression désactivée pour un chèque imprimé">
                                  <Trash2 className="w-4 h-4 opacity-40" />
                                </button>
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

      {/* Modal Saisie Chèque */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Saisie d'un nouveau chèque</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Banque émettrice</label>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-semibold"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Nom du Bénéficiaire
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={beneficiary}
                      onChange={(e) => {
                        setBeneficiary(e.target.value);
                        setBeneficiarySearch(e.target.value);
                        setShowBeneficiaryDropdown(true);
                      }}
                      onFocus={() => setShowBeneficiaryDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBeneficiaryDropdown(false), 200)}
                      placeholder="Tapez pour rechercher ou sélectionnez..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-medium"
                    />
                    {showBeneficiaryDropdown && storedBeneficiaries.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {storedBeneficiaries
                          .filter((b: any) => b.name.toLowerCase().includes(beneficiarySearch.toLowerCase()))
                          .map((b: any) => (
                            <button
                              key={b.id || b.name}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setBeneficiary(b.name);
                                setShowBeneficiaryDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-800">{b.name}</span>
                              {b.category && <span className="text-[10px] text-slate-400 ml-auto">{b.category}</span>}
                            </button>
                          ))
                          .slice(0, 20)}
                        {beneficiarySearch && !storedBeneficiaries.some((b: any) => b.name.toLowerCase() === beneficiarySearch.toLowerCase()) && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setBeneficiary(beneficiarySearch);
                              setShowBeneficiaryDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 flex items-center gap-2 border-t border-slate-100"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-700 font-semibold">Utiliser "{beneficiarySearch}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Sélectionnez dans la liste ou tapez un nouveau nom</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Montant en chiffres (#)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountNumeric}
                    onChange={(e) => handleAmountNumericChange(e.target.value)}
                    placeholder="ex: 125000.00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Lieu de création</label>
                  <input
                    type="text"
                    value={creationPlace}
                    onChange={(e) => setCreationPlace(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Montant en Lettres (Généré automatiquement en Français - Dirhams)
                </label>
                <textarea
                  rows={2}
                  value={amountWords}
                  onChange={(e) => setAmountWords(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Date d'émission</label>
                <input
                  type="date"
                  value={creationDate}
                  onChange={(e) => setCreationDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
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
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm font-semibold rounded-xl shadow-sm"
                >
                  Enregistrer le chèque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition Chèque */}
      {isEditOpen && selectedCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Modifier le chèque</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nom du Bénéficiaire</label>
                <input
                  type="text"
                  required
                  value={beneficiary}
                  onChange={(e) => {
                    setBeneficiary(e.target.value);
                    setBeneficiarySearch(e.target.value);
                    setShowBeneficiaryDropdown(true);
                  }}
                  onFocus={() => setShowBeneficiaryDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBeneficiaryDropdown(false), 200)}
                  placeholder="Tapez pour rechercher ou sélectionnez..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
                {showBeneficiaryDropdown && storedBeneficiaries.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {storedBeneficiaries
                      .filter((b: any) => b.name.toLowerCase().includes(beneficiarySearch.toLowerCase()))
                      .map((b: any) => (
                        <button
                          key={b.id || b.name}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setBeneficiary(b.name);
                            setShowBeneficiaryDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{b.name}</span>
                          {b.category && <span className="text-[10px] text-slate-400 ml-auto">{b.category}</span>}
                        </button>
                      ))
                      .slice(0, 20)}
                    {beneficiarySearch && !storedBeneficiaries.some((b: any) => b.name.toLowerCase() === beneficiarySearch.toLowerCase()) && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setBeneficiary(beneficiarySearch);
                          setShowBeneficiaryDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-700 font-semibold">Utiliser "{beneficiarySearch}"</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Montant en chiffres (#)</label>
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
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Lieu de création</label>
                  <input
                    type="text"
                    value={creationPlace}
                    onChange={(e) => setCreationPlace(e.target.value)}
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
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm font-semibold rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Import Batch Excel de Chèques</span>
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
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1E3A8A] hover:file:bg-blue-100"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">Format de colonnes attendu :</p>
                <p>
                  <code className="font-mono text-[#1E3A8A]">Bénéficiaire</code>,{" "}
                  <code className="font-mono text-[#1E3A8A]">Montant</code>,{" "}
                  <code className="font-mono text-[#1E3A8A]">Code_Banque</code> (optionnel),{" "}
                  <code className="font-mono text-[#1E3A8A]">Lieu</code> (optionnel).
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
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2"
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
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span>PDF d'Impression Calibré du Chèque (Prêt à l'impression)</span>
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
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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
                    Assurez-vous qu'un modèle d'impression actif avec des champs est configuré pour cette banque dans la section Modèles.
                  </p>
                </div>
              </div>
            )}

            {previewPdfUrl && !printLoading && !printError && (
              <>
                <iframe src={previewPdfUrl} className="w-full flex-1 border-none" title="PDF Print Preview" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
