import { NextResponse } from "next/server";
import { generateCalibratedPDF, FieldToPrint } from "@/lib/pdfGenerator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      physicalWidthMm,
      physicalHeightMm,
      backgroundImageUrl,
      fields,
      drawGridOrBoxes = true,
      sampleData = {},
    } = body;

    const widthMm = physicalWidthMm ? parseFloat(physicalWidthMm) : 210;
    const heightMm = physicalHeightMm ? parseFloat(physicalHeightMm) : 100;

    // Prepare fields to print with sample values
    const fieldsToPrint: FieldToPrint[] = (fields || []).map((f: any) => {
      let sampleVal = sampleData[f.fieldKey];

      if (!sampleVal) {
        switch (f.fieldKey) {
          case "beneficiary":
            sampleVal = "SOCIETE INDUSTRIELLE & COMMERCIALE S.A.";
            break;
          case "amountNumeric":
            sampleVal = "125 450,00 #";
            break;
          case "amountWords":
            sampleVal = "Cent vingt-cinq mille quatre cent cinquante Dirhams et 00 Centimes";
            break;
          case "creationDate":
            sampleVal = "30/07/2026";
            break;
          case "creationPlace":
            sampleVal = "Casablanca";
            break;
          case "dueDate":
            sampleVal = "30/09/2026";
            break;
          case "cause":
            sampleVal = "Règlement Facture N° FAC-2026-0891";
            break;
          case "sapCode":
            sampleVal = "SAP-901847";
            break;
          default:
            sampleVal = `[${f.fieldKey}]`;
        }
      }

      return {
        fieldKey: f.fieldKey,
        value: String(sampleVal),
        x: parseFloat(f.x),
        y: parseFloat(f.y),
        width: parseFloat(f.width),
        fontSize: f.fontSize ? parseFloat(f.fontSize) : 10,
        fontFamily: f.fontFamily || "Helvetica",
        align: f.align || "LEFT",
      };
    });

    const pdfBytes = await generateCalibratedPDF({
      physicalWidthMm: widthMm,
      physicalHeightMm: heightMm,
      backgroundImageUrl: backgroundImageUrl || null,
      fields: fieldsToPrint,
      drawGridOrBoxes: drawGridOrBoxes !== undefined ? drawGridOrBoxes : true,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="apercu_modele_impce.pdf"',
      },
    });
  } catch (error: any) {
    console.error("PDF Preview generation error:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF d'aperçu." }, { status: 500 });
  }
}
