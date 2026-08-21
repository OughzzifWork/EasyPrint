"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth-context";
import { fetchApi, fetchApiRaw } from "@/lib/api";
import * as ExcelJS from "exceljs";
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
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

export default function EffetsPage() {
  const { user } = useAuth();
  const canEdit = user?.canEdit !== false;
  const isAdmin = user?.role === "ADMIN";

  const [effets, setEffets] = useState<any[]>([]);
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
  const [selectedEffet, setSelectedEffet] = useState<any | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printEffetId, setPrintEffetId] = useState<string | null>(null);

  // Form State
  const [bankId, setBankId] = useState("");
  const [sapCode, setSapCode] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [amountNumeric, setAmountNumeric] = useState<string>("");
  const [amountWords, setAmountWords] = useState("");
  const [creationDate, setCreationDate] = useState(new Date().toISOString().split("T")[0]);
  const [creationPlace, setCreationPlace] = useState("Casablanca");
  const [cause, setCause] = useState("");
  const [storedBeneficiaries, setStoredBeneficiaries] = useState<any[]>([]);

  // SAP Mode state
  const [sapMode, setSapMode] = useState(user?.entityDataMode === "SAP");
  const [sapEntityId, setSapEntityId] = useState<string | null>(null);
  const [sapLoading, setSapLoading] = useState(false);
  const [sapLookupError, setSapLookupError] = useState<string | null>(null);
  const [entityCreationPlace, setEntityCreationPlace] = useState("Casablanca");

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

  const fetchEffets = async () => {
    setLoading(true);
    try {
      let effetsUrl = "/api/effets?";
      if (selectedBankId) effetsUrl += `bankId=${encodeURIComponent(selectedBankId)}&`;
      if (search) effetsUrl += `search=${encodeURIComponent(search)}&`;
      effetsUrl += "includeDeleted=true";

      const data = await fetchApi(effetsUrl);
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
      await fetchApi(`/api/effets/${id}/restore`, { method: "POST" });
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
      await fetchApi(`/api/effets/${id}?hard=true`, { method: "DELETE" });
      setSuccess("Effet supprimé définitivement.");
      fetchEffets();
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

  // SAP Lookup: fetch document data by SAP code
  const handleSapLookup = async (code: string) => {
    if (!sapEntityId || !code.trim()) return;
    setSapLoading(true);
    setSapLookupError(null);
    try {
      const data = await fetchApi(`/api/entities/${sapEntityId}/sap-lookup/${encodeURIComponent(code.trim())}`);
      setBeneficiary(data.beneficiary || data.Fournisseur || data.CardName || "");
      const rawAmount = parseFloat(data.amountNumeric || data.Somme || data.BoeSum || 0);
      setAmountNumeric(rawAmount > 0 ? String(rawAmount) : "");
      if (rawAmount > 0) setAmountWords(convertAmountToWordsFr(rawAmount));
      else if (data.amountWords || data.Somme_lettre || data.TotalWords) {
        setAmountWords(data.amountWords || data.Somme_lettre || data.TotalWords);
      }
      if (data.dueDate || data.Date_Ech) {
        const d = new Date(data.dueDate || data.Date_Ech);
        if (!isNaN(d.getTime())) setDueDate(d.toISOString().split("T")[0]);
      }
      if (data.creationDate || data.Date_Cpt) {
        const d = new Date(data.creationDate || data.Date_Cpt);
        if (!isNaN(d.getTime())) setCreationDate(d.toISOString().split("T")[0]);
      }
      setCreationPlace(entityCreationPlace);
      setCause("");

      const bankCode = (data.bankCode || data.BPBankCod || data.Banque || "").trim();
      if (bankCode) {
        const matchedBank = banks.find((b: any) => b.code.toUpperCase() === bankCode.toUpperCase());
        if (matchedBank) setBankId(matchedBank.id);
      }
    } catch (err: any) {
      setSapLookupError(err.message || "Document SAP non trouvé.");
    } finally {
      setSapLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await fetchApi("/api/effets", {
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
      await fetchApi(`/api/effets/${selectedEffet.id}`, {
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
      await fetchApi(`/api/effets/${id}`, { method: "DELETE" });
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
    setPrintEffetId(id);
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
      const res = await fetchApiRaw(`/api/effets/${id}/print?${params.toString()}`);
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

  const refreshPrintPreview = async () => {
    if (!printEffetId) return;
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
      const res = await fetchApiRaw(`/api/effets/${printEffetId}/print?${params.toString()}`);
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
    const worksheet = workbook.addWorksheet("Effets_LCN");
    worksheet.columns = [
      { header: "ID", key: "ID", width: 36 },
      { header: "Code_SAP", key: "Code_SAP", width: 18 },
      { header: "Banque", key: "Banque", width: 25 },
      { header: "Code_Banque", key: "Code_Banque", width: 15 },
      { header: "Bénéficiaire", key: "Bénéficiaire", width: 30 },
      { header: "Date_Echéance", key: "Date_Echéance", width: 15 },
      { header: "Montant_Chiffres", key: "Montant_Chiffres", width: 18 },
      { header: "Montant_Lettres", key: "Montant_Lettres", width: 40 },
      { header: "Motif_Cause", key: "Motif_Cause", width: 30 },
      { header: "Lieu_Création", key: "Lieu_Création", width: 20 },
      { header: "Date_Création", key: "Date_Création", width: 15 },
      { header: "Statut", key: "Statut", width: 12 },
      { header: "Créé_Par", key: "Créé_Par", width: 20 },
      { header: "Supprimé", key: "Supprimé", width: 12 },
    ];
    effets.forEach((e) => {
      worksheet.addRow({
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
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Effets_EasyPrint_${new Date().toISOString().split("T")[0]}.xlsx`;
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

        try {
          await fetchApi("/api/effets", {
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
              creationPlace: entityCreationPlace,
              cause: String(causeVal),
            }),
          });
          importedCount++;
        } catch {
          errorsCount++;
        }
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
    setCreationPlace(entityCreationPlace);
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

    if (selectedEntityId && e.entityId !== selectedEntityId) return false;

    if (activeTab === "ACTIVE") return !e.deletedAt && e.status !== "PRINTED";
    if (activeTab === "PRINTED") return !e.deletedAt && e.status === "PRINTED";
    if (activeTab === "DELETED") return e.deletedAt != null;
    return true;
  });

  return (
    <div className="space-y-6">
      <Header title="Gestion & Saisie des Effets (Lettres de Change - LCN)" />

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher code SAP, bénéficiaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30"
            />
          </div>

          {/* Bank Filter */}
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 font-medium"
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
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 font-medium"
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

              {user?.entityDataMode === "SAP" && (
                <button
                  onClick={() => setSapMode(!sapMode)}
                  className={clsx(
                    "inline-flex items-center gap-2 px-3.5 py-2.5 font-semibold text-sm rounded-xl transition-all border",
                    sapMode
                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                      : "bg-white hover:bg-slate-50 text-blue-600 border-blue-200"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{sapMode ? "Mode SAP" : "Mode Normal"}</span>
                </button>
              )}

              <button
                onClick={async () => {
                  resetForm();
                  setIsCreateOpen(true);
                  setSapLookupError(null);
                  setSapLoading(false);
                  if (sapMode && user?.entityId) {
                    setSapEntityId(user.entityId);
                    try {
                      const entData = await fetchApi(`/api/entities/${user.entityId}`);
                      setEntityCreationPlace(entData.defaultCreationPlace || "Casablanca");
                      if (entData.bankEntities && entData.bankEntities.length > 0) {
                        setBankId(entData.bankEntities[0].bankId);
                      }
                    } catch {}
                  } else {
                    setSapEntityId(null);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#A16207] hover:bg-[#925506] text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvel Effet (LCN)</span>
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
              ? "bg-[#A16207] text-white border-[#A16207] shadow-sm"
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
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chargement des effets...</div>
        ) : filteredEffets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Aucun effet LCN enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Entité</th>
                  <th className="py-3.5 px-6">Banque</th>
                  <th className="py-3.5 px-6">Code SAP</th>
                  <th className="py-3.5 px-6">Bénéficiaire</th>
                  <th className="py-3.5 px-6">Échéance</th>
                  <th className="py-3.5 px-6">Montant (#)</th>
                  <th className="py-3.5 px-6">Créé par</th>
                  <th className="py-3.5 px-6">Date création</th>
                  <th className="py-3.5 px-6">Date impression</th>
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
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                        {e.entity?.code || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-xs font-mono font-bold text-slate-800">
                        {e.bank?.code || "BANQUE"}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{e.sapCode}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{e.beneficiary}</td>
                    <td className="py-4 px-6 font-semibold text-amber-700">
                      {e.dueDate ? new Date(e.dueDate).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-[#1E3A8A]">
                      {Number(e.amountNumeric).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} #
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">{e.createdByName || "—"}</td>
                    <td className="py-4 px-6 text-xs text-slate-500">{e.createdAt ? new Date(e.createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="py-4 px-6 text-xs text-slate-500">{e.printedAt ? new Date(e.printedAt).toLocaleDateString("fr-FR") : "—"}</td>
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
                              : "bg-[#A16207]/10 text-[#A16207] border-[#A16207]/20"
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
                              <button
                                onClick={() => handleHardDeleteEffet(e.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold border border-rose-300 transition-colors"
                                title="Supprimer définitivement (Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {isAdmin || e.status !== "PRINTED" ? (
                              <button
                                onClick={() => openPrintPdfModal(e.id)}
                                className="inline-flex items-center gap-1 p-2 text-[#A16207] hover:bg-[#A16207]/5 rounded-lg transition-colors text-xs font-semibold"
                                title={e.status === "PRINTED" ? "Réimprimer cet effet (Admin)" : "Imprimer la Lettre de Change"}
                              >
                                <Printer className="w-4 h-4" /> {e.status === "PRINTED" ? "Réimprimer" : "Imprimer"}
                              </button>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 p-2 text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed text-xs font-semibold border border-slate-200"
                                title="Effet déjà imprimé"
                              >
                                <Printer className="w-4 h-4 opacity-40" /> Imprimé
                              </button>
                            )}

                            {canEdit && (isAdmin || e.status !== "PRINTED") && (
                              <>
                                <button
                                  onClick={() => openEditModal(e)}
                                  className="p-2 text-slate-500 hover:text-[#A16207] hover:bg-[#A16207]/5 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSoftDelete(e.id)}
                                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Suppression Logique"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {canEdit && !isAdmin && e.status === "PRINTED" && (
                              <>
                                <button disabled className="p-2 text-slate-300 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200" title="Édition désactivée pour un effet imprimé">
                                  <Edit2 className="w-4 h-4 opacity-40" />
                                </button>
                                <button disabled className="p-2 text-slate-300 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200" title="Suppression désactivée pour un effet imprimé">
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

      {/* Modal Saisie Effet */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <span>Saisie d'une nouvelle Lettre de Change (Effet LCN)</span>
                {sapMode && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                    Mode SAP B1
                  </span>
                )}
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
                    disabled={sapMode}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {sapMode ? "Code SAP / N° Effet (Obtenir les données)" : "Code SAP / Réf (Optionnel)"}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={sapCode}
                      onChange={(e) => setSapCode(e.target.value)}
                      onBlur={(e) => {
                        if (sapMode && sapEntityId && e.target.value.trim()) {
                          handleSapLookup(e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (sapMode && e.key === "Tab" && sapEntityId && sapCode.trim()) {
                          handleSapLookup(sapCode);
                        }
                      }}
                      placeholder={sapMode ? "Entrez le N° Effet SAP puis TAB..." : "ex: SAP-80291 (Optionnel)"}
                      disabled={false}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A16207]/30"
                    />
                    {sapLoading && (
                      <div className="absolute right-3 top-2.5">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {sapLookupError && (
                    <p className="text-[11px] text-red-600 mt-1">{sapLookupError}</p>
                  )}
                  {sapMode && !sapLoading && !sapLookupError && sapCode && beneficiary && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Données SAP chargées avec succès
                    </p>
                  )}
                </div>
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
                      disabled={sapMode}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Date d'Échéance</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={sapMode}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={sapMode}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={sapMode}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={sapMode}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Lieu de création</label>
                  <input
                    type="text"
                    value={creationPlace}
                    onChange={(e) => setCreationPlace(e.target.value)}
                    disabled={sapMode}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A16207]/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-4 py-2 bg-[#A16207] hover:bg-[#925506] text-white text-sm font-semibold rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4">
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
                  className="px-4 py-2 bg-[#A16207] hover:bg-[#925506] text-white text-sm font-semibold rounded-xl shadow-sm"
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
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#A16207]/10 file:text-[#A16207] hover:file:bg-[#A16207]/20"
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
                  className="px-4 py-2 bg-[#A16207] hover:bg-[#925506] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2"
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
          <div className="bg-white rounded-xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-xl">
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
