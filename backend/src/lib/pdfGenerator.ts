import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface FieldToPrint {
  fieldKey: string;
  value: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
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

const POINTS_PER_MM = 72 / 25.4;

export async function generateCalibratedPDF(options: PDFGenerationOptions): Promise<Uint8Array> {
  const { backgroundImageUrl, fields, drawGridOrBoxes } = options;

  const physicalWidthMm = (options.physicalWidthMm && options.physicalWidthMm > 0)
    ? options.physicalWidthMm
    : 210;
  const physicalHeightMm = (options.physicalHeightMm && options.physicalHeightMm > 0)
    ? options.physicalHeightMm
    : 297;

  const pdfDoc = await PDFDocument.create();

  const pageWidthPt = physicalWidthMm * POINTS_PER_MM;
  const pageHeightPt = physicalHeightMm * POINTS_PER_MM;

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

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
          opacity: drawGridOrBoxes ? 0.35 : 1.0,
        });
      }
    } catch (err) {
      console.warn("Could not embed background image in PDF:", err);
    }
  }

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const getFont = (family: string) => {
    if (family?.toLowerCase().includes("courier")) return fontCourier;
    if (family?.toLowerCase().includes("times")) return fontTimes;
    return fontHelvetica;
  };

  const sanitizeForWinAnsi = (str: string): string =>
    str
      .replace(/\u202F/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\u2019/g, "'")
      .replace(/\u2018/g, "'")
      .replace(/\u201C/g, '"')
      .replace(/\u201D/g, '"')
      .replace(/\u2013/g, "-")
      .replace(/\u2014/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/[^\x00-\xFF]/g, "");

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
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  for (const field of fields) {
    if (!field.value) continue;

    const font = getFont(field.fontFamily);
    const fontSizePt = field.fontSize || 10;
    const lineHeightPt = fontSizePt * 1.35;
    const text = sanitizeForWinAnsi(String(field.value));

    const fieldXPt = field.x * POINTS_PER_MM;
    const fieldYPt = (physicalHeightMm - field.y) * POINTS_PER_MM;
    const fieldWidthPt = field.width * POINTS_PER_MM;

    const lines = wrapText(text, font, fontSizePt, fieldWidthPt);
    const totalHeightPt = lines.length * lineHeightPt;

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

    lines.forEach((line, lineIndex) => {
      const lineWidthPt = font.widthOfTextAtSize(line, fontSizePt);

      let targetX = fieldXPt;
      if (field.align === "RIGHT") {
        targetX = fieldXPt + fieldWidthPt - lineWidthPt;
      } else if (field.align === "CENTER") {
        targetX = fieldXPt + (fieldWidthPt - lineWidthPt) / 2;
      }

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
