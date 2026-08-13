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
    const effet = await prisma.effet.findUnique({
      where: { id },
      include: {
        bank: true,
        template: {
          include: { fields: true },
        },
      },
    });

    if (!effet) return NextResponse.json({ error: "Effet non trouvé." }, { status: 404 });

    let template = effet.template;
    if (!template) {
      template = (await prisma.template.findFirst({
        where: { bankId: effet.bankId, documentType: "EFFET", isActive: true },
        include: { fields: true },
      })) as any;
    }

    if (!template || !template.fields || template.fields.length === 0) {
      return NextResponse.json(
        { error: "Aucun modèle d'impression actif configuré pour les effets sur cette banque." },
        { status: 400 }
      );
    }

    const formattedCreationDate = effet.creationDate
      ? new Date(effet.creationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const formattedDueDate = effet.dueDate
      ? new Date(effet.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const formattedAmount = `${effet.amountNumeric.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`;

    const dataMap: Record<string, string> = {
      beneficiary: effet.beneficiary,
      amountNumeric: formattedAmount,
      amountWords: effet.amountWords,
      creationDate: formattedCreationDate,
      creationPlace: effet.creationPlace || "",
      dueDate: formattedDueDate,
      cause: effet.cause || "",
      sapCode: effet.sapCode || "",
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

    const pdfBytes = await generateCalibratedPDF({
      physicalWidthMm: template.physicalWidthMm,
      physicalHeightMm: template.physicalHeightMm,
      backgroundImageUrl: null,
      fields: fieldsToPrint,
      drawGridOrBoxes: false,
    });

    await prisma.effet.update({
      where: { id },
      data: { status: "PRINTED" },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "EFFET",
        entityId: id,
        action: "PRINT",
        newValue: JSON.stringify({ printedAt: new Date(), templateId: template.id }),
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="effet_${effet.sapCode || effet.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating effet print PDF:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF d'impression de l'effet." }, { status: 500 });
  }
}
