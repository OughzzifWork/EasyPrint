"use client";

import React, { useState, useRef, useEffect } from "react";
import { Move, Trash2, Plus, Type, Eye, Sparkles, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { clsx } from "clsx";

export interface TemplateFieldItem {
  id?: string;
  fieldKey: string;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  fontSize: number; // in pt
  fontFamily: string;
  align: "LEFT" | "CENTER" | "RIGHT" | string;
  format: "TEXT" | "DATE" | "CURRENCY" | "AMOUNT_IN_WORDS" | string;
}

interface TemplateCanvasProps {
  documentType: "CHEQUE" | "EFFET";
  physicalWidthMm: number;
  physicalHeightMm: number;
  backgroundImageUrl: string | null;
  fields: TemplateFieldItem[];
  onChangeFields: (fields: TemplateFieldItem[]) => void;
  onGeneratePreviewPdf: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  beneficiary: "Bénéficiaire",
  amountNumeric: "Montant en chiffres (#)",
  amountWords: "Montant en lettres",
  creationDate: "Date de création",
  creationPlace: "Lieu de création",
  dueDate: "Date d'échéance (Effet)",
  cause: "Cause / Motif (Effet)",
  sapCode: "Code SAP (Effet)",
};

const DEFAULT_FIELDS_CHEQUE = ["beneficiary", "amountNumeric", "amountWords", "creationDate", "creationPlace"];
const DEFAULT_FIELDS_EFFET = [
  "beneficiary",
  "amountNumeric",
  "amountWords",
  "creationDate",
  "creationPlace",
  "dueDate",
  "cause",
  "sapCode",
];

export function TemplateCanvas({
  documentType,
  physicalWidthMm,
  physicalHeightMm,
  backgroundImageUrl,
  fields,
  onChangeFields,
  onGeneratePreviewPdf,
}: TemplateCanvasProps) {
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragOffsetMm, setDragOffsetMm] = useState({ x: 0, y: 0 });

  // Update container width on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Scale: pixels per millimeter
  const scale = containerWidth / Math.max(physicalWidthMm, 50);
  const canvasHeightPx = physicalHeightMm * scale;

  // Convert mm <-> px
  const mmToPx = (mm: number) => mm * scale;
  const pxToMm = (px: number) => px / scale;

  const availableFieldKeys = documentType === "CHEQUE" ? DEFAULT_FIELDS_CHEQUE : DEFAULT_FIELDS_EFFET;

  const addField = (fieldKey: string) => {
    // Check if field already exists
    if (fields.some((f) => f.fieldKey === fieldKey)) return;

    const newField: TemplateFieldItem = {
      fieldKey,
      x: 10,
      y: 10 + fields.length * 15,
      width: fieldKey === "amountWords" ? 140 : fieldKey === "beneficiary" ? 120 : 50,
      fontSize: 11,
      fontFamily: "Helvetica",
      align: "LEFT",
      format: fieldKey === "amountNumeric" ? "CURRENCY" : fieldKey === "amountWords" ? "AMOUNT_IN_WORDS" : "TEXT",
    };

    const updated = [...fields, newField];
    onChangeFields(updated);
    setSelectedFieldIndex(updated.length - 1);
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    onChangeFields(updated);
    if (selectedFieldIndex === index) setSelectedFieldIndex(null);
    else if (selectedFieldIndex !== null && selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1);
    }
  };

  const updateSelectedField = (key: keyof TemplateFieldItem, value: any) => {
    if (selectedFieldIndex === null) return;
    const updated = [...fields];
    updated[selectedFieldIndex] = {
      ...updated[selectedFieldIndex],
      [key]: value,
    };
    onChangeFields(updated);
  };

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedFieldIndex(index);
    setIsDragging(true);
    setDragStartIndex(index);

    const field = fields[index];
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const initialX = field.x;
    const initialY = field.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = pxToMm(moveEvent.clientX - mouseX);
      const deltaY = pxToMm(moveEvent.clientY - mouseY);

      let newX = Math.max(0, Math.min(physicalWidthMm - field.width, initialX + deltaX));
      let newY = Math.max(0, Math.min(physicalHeightMm - 5, initialY + deltaY));

      // Snap to 1mm grid
      newX = Math.round(newX * 2) / 2;
      newY = Math.round(newY * 2) / 2;

      const updated = [...fields];
      updated[index] = { ...updated[index], x: newX, y: newY };
      onChangeFields(updated);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const selectedField = selectedFieldIndex !== null ? fields[selectedFieldIndex] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Visual Canvas Area (Cols 8) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Controls Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">Ajouter une zone :</span>
            <div className="flex flex-wrap gap-1.5">
              {availableFieldKeys.map((key) => {
                const isAdded = fields.some((f) => f.fieldKey === key);
                return (
                  <button
                    key={key}
                    onClick={() => addField(key)}
                    disabled={isAdded}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1",
                      isAdded
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    )}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{FIELD_LABELS[key] || key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={onGeneratePreviewPdf}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#A16207] hover:bg-[#925506] text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Aperçu PDF Réel</span>
          </button>
        </div>

        {/* Physical mm Canvas Container */}
        <div className="bg-slate-900 rounded-2xl p-4 shadow-xl border border-slate-800 space-y-2 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Dimensions réelles : {physicalWidthMm} mm × {physicalHeightMm} mm</span>
            <span>Échelle : 1 mm = {scale.toFixed(1)} px</span>
          </div>

          {/* Canvas Wrapper */}
          <div
            ref={containerRef}
            className="relative w-full bg-white rounded-xl shadow-inner border border-slate-300 overflow-hidden select-none"
            style={{ height: `${canvasHeightPx}px` }}
          >
            {/* Background scan image */}
            {backgroundImageUrl ? (
              <img
                src={backgroundImageUrl}
                alt="Scan document vierge"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-90"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-medium">
                Scan d'image non chargé — Déposez les zones de texte sur ce canevas vierge
              </div>
            )}

            {/* Grid Lines Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-15"
              style={{
                backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                backgroundSize: `${mmToPx(10)}px ${mmToPx(10)}px`,
              }}
            />

            {/* Draggable Bounding Boxes */}
            {fields.map((field, idx) => {
              const isSelected = selectedFieldIndex === idx;
              const leftPx = mmToPx(field.x);
              const topPx = mmToPx(field.y);
              const widthPx = mmToPx(field.width);
              const heightPx = Math.max(mmToPx(field.fontSize * 0.5), 24);

              return (
                <div
                  key={idx}
                  onMouseDown={(e) => handleMouseDown(e, idx)}
                  style={{
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                  }}
                  className={clsx(
                    "absolute cursor-move flex items-center justify-between px-2 text-xs font-mono font-semibold rounded transition-shadow border-2 group",
                    isSelected
                      ? "bg-[#1E3A8A]/20 border-[#1E3A8A] ring-2 ring-[#1E3A8A]/40 shadow-lg text-[#1E3A8A] z-20"
                      : "bg-amber-400/20 border-amber-500/80 hover:bg-amber-400/40 text-amber-950 z-10"
                  )}
                >
                  <div className="flex items-center gap-1 overflow-hidden truncate">
                    <Move className="w-3 h-3 text-slate-600 shrink-0" />
                    <span className="truncate">{FIELD_LABELS[field.fieldKey] || field.fieldKey}</span>
                  </div>

                  <span className="text-[10px] bg-white/80 px-1 rounded font-bold text-slate-700 shrink-0 ml-1">
                    {field.x}mm, {field.y}mm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Properties & Configuration Panel (Cols 4) */}
      <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Paramètres de la Zone</span>
          </h3>
          {selectedFieldIndex !== null && (
            <button
              onClick={() => removeField(selectedFieldIndex)}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Supprimer la zone"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {selectedField ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Champ de données</label>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-bold text-sm">
                {FIELD_LABELS[selectedField.fieldKey] || selectedField.fieldKey}
              </div>
            </div>

            {/* Position X & Y in mm */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Position X (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={selectedField.x}
                  onChange={(e) => updateSelectedField("x", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Position Y (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={selectedField.y}
                  onChange={(e) => updateSelectedField("y", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>
            </div>

            {/* Width & Font Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Largeur (mm)</label>
                <input
                  type="number"
                  step="1"
                  value={selectedField.width}
                  onChange={(e) => updateSelectedField("width", parseFloat(e.target.value) || 10)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Taille Police (pt)</label>
                <input
                  type="number"
                  step="1"
                  value={selectedField.fontSize}
                  onChange={(e) => updateSelectedField("fontSize", parseFloat(e.target.value) || 10)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
                />
              </div>
            </div>

            {/* Font Family & Alignment */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Police de caractères</label>
              <select
                value={selectedField.fontFamily}
                onChange={(e) => updateSelectedField("fontFamily", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30"
              >
                <option value="Helvetica">Helvetica (Standard)</option>
                <option value="Courier">Courier (Monospacé)</option>
                <option value="Times-Roman">Times Roman (Serif)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Alignement du texte</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => updateSelectedField("align", "LEFT")}
                  className={clsx(
                    "p-2 rounded-xl border flex items-center justify-center gap-1 text-xs font-semibold transition-all",
                    selectedField.align === "LEFT" ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "bg-slate-50 text-slate-700 border-slate-200"
                  )}
                >
                  <AlignLeft className="w-4 h-4" /> Gauche
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedField("align", "CENTER")}
                  className={clsx(
                    "p-2 rounded-xl border flex items-center justify-center gap-1 text-xs font-semibold transition-all",
                    selectedField.align === "CENTER" ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "bg-slate-50 text-slate-700 border-slate-200"
                  )}
                >
                  <AlignCenter className="w-4 h-4" /> Centre
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedField("align", "RIGHT")}
                  className={clsx(
                    "p-2 rounded-xl border flex items-center justify-center gap-1 text-xs font-semibold transition-all",
                    selectedField.align === "RIGHT" ? "bg-[#1E3A8A] text-white border-[#1E3A8A]" : "bg-slate-50 text-slate-700 border-slate-200"
                  )}
                >
                  <AlignRight className="w-4 h-4" /> Droite
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Type className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Cliquez ou déplacez une zone sur le canevas pour modifier ses paramètres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
