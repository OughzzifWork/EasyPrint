import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface FieldToPrint {
  fieldKey: string;
  value: string;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  fontSize: number; // in pt
  fontFamily: string;
  align: "LEFT" | "CENTER" | "RIGHT" | string;
}

export interface PDFGenerationOptions {
  physicalWidthMm: number;
  physicalHeightMm: number;
  backgroundImageUrl?: string | null;
  fields: FieldToPrint[];
  drawGridOrBoxes?: boolean;
}

const POINTS_PER_MM = 72 / 25.4; // ~2.83464567

export async function generateCalibratedPDF(options: PDFGenerationOptions): Promise<Uint8Array> {
  const { backgroundImageUrl, fields, drawGridOrBoxes } = options;

  // Fallback to A4 dimensions if not specified or zero
  const physicalWidthMm = (options.physicalWidthMm && options.physicalWidthMm > 0)
    ? options.physicalWidthMm
    : 210;
  const physicalHeightMm = (options.physicalHeightMm && options.physicalHeightMm > 0)
    ? options.physicalHeightMm
    : 297;

  // Create new PDF Document
  const pdfDoc = await PDFDocument.create();

  // Convert dimensions from mm to points
  const pageWidthPt = physicalWidthMm * POINTS_PER_MM;
  const pageHeightPt = physicalHeightMm * POINTS_PER_MM;

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // Optionally embed background image if provided and requested
  if (backgroundImageUrl && backgroundImageUrl.startsWith("data:image/")) {
    try {
      let embeddedImage;
      if (backgroundImageUrl.startsWith("data:image/png")) {
        const base64Data = backgroundImageUrl.split(",")[1];
        const imageBytes = Buffer.from(base64Data, "base64");
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else if (backgroundImageUrl.startsWith("data:image/jpeg") || backgroundImageUrl.startsWith("data:image/jpg")) {
        const base64Data = backgroundImageUrl.split(",")[1];
        const imageBytes = Buffer.from(base64Data, "base64");
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }

      if (embeddedImage) {
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: pageWidthPt,
          height: pageHeightPt,
          opacity: drawGridOrBoxes ? 0.35 : 1.0, // Watermark if previewing, full if draft
        });
      }
    } catch (err) {
      console.warn("Could not embed background image in PDF:", err);
    }
  }

  // Load standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const getFont = (family: string) => {
    if (family?.toLowerCase().includes("courier")) return fontCourier;
    if (family?.toLowerCase().includes("times")) return fontTimes;
    return fontHelvetica;
  };

  /**
   * Sanitize text to only contain characters encodable by WinAnsi (Latin-1 extended).
   * pdf-lib standard fonts use WinAnsi encoding and crash on Unicode-only characters.
   *
   * Common offenders from fr-FR locale:
   *   U+202F NARROW NO-BREAK SPACE  → used by toLocaleString("fr-FR") as thousands separator
   *   U+00A0 NO-BREAK SPACE         → regular non-breaking space
   *   U+2019 RIGHT SINGLE QUOTATION → typographic apostrophe
   */
  const sanitizeForWinAnsi = (str: string): string =>
    str
      .replace(/\u202F/g, " ")   // NARROW NO-BREAK SPACE  → ASCII space
      .replace(/\u00A0/g, " ")   // NO-BREAK SPACE          → ASCII space
      .replace(/\u2019/g, "'")   // RIGHT SINGLE QUOT MARK  → apostrophe
      .replace(/\u2018/g, "'")   // LEFT SINGLE QUOT MARK   → apostrophe
      .replace(/\u201C/g, '"')   // LEFT DOUBLE QUOT MARK   → quote
      .replace(/\u201D/g, '"')   // RIGHT DOUBLE QUOT MARK  → quote
      .replace(/\u2013/g, "-")   // EN DASH                 → hyphen
      .replace(/\u2014/g, "-")   // EM DASH                 → hyphen
      .replace(/\u2026/g, "...") // ELLIPSIS                → three dots
      // Strip any remaining character outside WinAnsi range (0x00-0xFF)
      .replace(/[^\x00-\xFF]/g, "");

  /**
   * Word-wrap text to fit within a given width in points.
   * Splits on spaces; if a single word is wider than the field it is kept as-is on its own line.
   */
  const wrapText = (text: string, font: any, fontSize: number, maxWidthPt: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);
      if (candidateWidth <= maxWidthPt) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        // If a single word is wider than the field, still push it alone
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Render fields
  for (const field of fields) {
    if (!field.value) continue;

    const font = getFont(field.fontFamily);
    const fontSizePt = field.fontSize || 10;
    const lineHeightPt = fontSizePt * 1.35; // line spacing
    const text = sanitizeForWinAnsi(String(field.value));

    const fieldXPt = field.x * POINTS_PER_MM;
    const fieldYPt = (physicalHeightMm - field.y) * POINTS_PER_MM;
    const fieldWidthPt = field.width * POINTS_PER_MM;

    // Wrap text into lines that fit within the field width
    const lines = wrapText(text, font, fontSizePt, fieldWidthPt);
    const totalHeightPt = lines.length * lineHeightPt;

    // Draw field bounding box covering all lines if debug mode is enabled
    if (drawGridOrBoxes) {
      page.drawRectangle({
        x: fieldXPt,
        y: fieldYPt - totalHeightPt,
        width: fieldWidthPt,
        height: totalHeightPt,
        borderColor: rgb(0.2, 0.4, 0.8),
        borderWidth: 0.5,
        opacity: 0.5,
      });
    }

    // Draw each wrapped line
    lines.forEach((line, lineIndex) => {
      const lineWidthPt = font.widthOfTextAtSize(line, fontSizePt);

      let targetX = fieldXPt;
      if (field.align === "RIGHT") {
        targetX = fieldXPt + fieldWidthPt - lineWidthPt;
      } else if (field.align === "CENTER") {
        targetX = fieldXPt + (fieldWidthPt - lineWidthPt) / 2;
      }

      // Baseline Y: first line at field top, subsequent lines below
      const targetY = fieldYPt - fontSizePt * 0.85 - lineIndex * lineHeightPt;

      page.drawText(line, {
        x: Math.max(fieldXPt, targetX),
        y: targetY,
        size: fontSizePt,
        font: font,
        color: rgb(0, 0, 0),
      });
    });
  }

  return await pdfDoc.save();
}

