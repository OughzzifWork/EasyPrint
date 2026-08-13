import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCalibratedPDF, FieldToPrint } from "@/lib/pdfGenerator";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;
    const cheque = await prisma.cheque.findUnique({
      where: { id },
      include: {
        bank: true,
        template: {
          include: { fields: true },
        },
      },
    });

    if (!cheque) return NextResponse.json({ error: "Chèque non trouvé." }, { status: 404 });

    // Ensure we have a template
    let template = cheque.template;
    if (!template) {
      template = (await prisma.template.findFirst({
        where: { bankId: cheque.bankId, documentType: "CHEQUE", isActive: true },
        include: { fields: true },
      })) as any;
    }

    if (!template || !template.fields || template.fields.length === 0) {
      return NextResponse.json(
        { error: "Aucun modèle d'impression actif configuré pour cette banque." },
        { status: 400 }
      );
    }

    // Format dates & amounts
    const formattedDate = cheque.creationDate
      ? new Date(cheque.creationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const formattedAmount = `${cheque.amountNumeric.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`;

    const dataMap: Record<string, string> = {
      beneficiary: cheque.beneficiary,
      amountNumeric: formattedAmount,
      amountWords: cheque.amountWords,
      creationDate: formattedDate,
      creationPlace: cheque.creationPlace || "",
    };

    const fieldsToPrint: FieldToPrint[] = template.fields.map((f: any) => ({
      fieldKey: f.fieldKey,
      value: dataMap[f.fieldKey] || "",
      x: f.x,
      y: f.y,
      width: f.width,
      fontSize: f.fontSize,
      fontFamily: f.fontFamily,
      align: f.align,
    }));

    // Generate calibrated PDF without background grid/boxes for actual printing
    const pdfBytes = await generateCalibratedPDF({
      physicalWidthMm: template.physicalWidthMm,
      physicalHeightMm: template.physicalHeightMm,
      backgroundImageUrl: null, // Don't print background scan image on real blank paper
      fields: fieldsToPrint,
      drawGridOrBoxes: false,
    });

    // Update cheque status to PRINTED
    await prisma.cheque.update({
      where: { id },
      data: { status: "PRINTED" },
    });

    // Log Audit action PRINT
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "CHEQUE",
        entityId: id,
        action: "PRINT",
        newValue: JSON.stringify({ printedAt: new Date(), templateId: template.id }),
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cheque_${cheque.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating cheque print PDF:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF d'impression." }, { status: 500 });
  }
}
