import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertAmountToWordsFr } from "@/lib/numberToWordsFr";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bankId = searchParams.get("bankId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const where: any = {};
  if (!includeDeleted) {
    where.deletedAt = null;
  }
  if (bankId) where.bankId = bankId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { beneficiary: { contains: search } },
      { creationPlace: { contains: search } },
    ];
  }

  try {
    const cheques = await prisma.cheque.findMany({
      where,
      include: {
        bank: true,
        template: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cheques);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la récupération des chèques." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.canEdit === false) {
    return NextResponse.json({ error: "Accès refusé. Droit d'édition requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { bankId, templateId, beneficiary, amountNumeric, amountWords, creationDate, creationPlace } = body;

    if (!bankId || !beneficiary || !amountNumeric) {
      return NextResponse.json({ error: "La banque, le bénéficiaire et le montant sont obligatoires." }, { status: 400 });
    }

    // Find active template if templateId not specified
    let selectedTemplateId = templateId;
    if (!selectedTemplateId) {
      const activeTemplate = await prisma.template.findFirst({
        where: { bankId, documentType: "CHEQUE", isActive: true },
      });
      if (!activeTemplate) {
        return NextResponse.json(
          { error: "Aucun modèle d'impression actif défini pour cette banque. Veuillez en créer un dans le Concepteur." },
          { status: 400 }
        );
      }
      selectedTemplateId = activeTemplate.id;
    }

    const numAmount = parseFloat(amountNumeric);
    const finalAmountWords = amountWords || convertAmountToWordsFr(numAmount);
    const trimmedBeneficiary = beneficiary.trim();

    // Auto-save beneficiary in central directory if not present
    if (trimmedBeneficiary) {
      await prisma.beneficiary.upsert({
        where: { name: trimmedBeneficiary },
        update: { active: true },
        create: { name: trimmedBeneficiary, category: "FOURNISSEUR" },
      }).catch(() => {});
    }

    const newCheque = await prisma.cheque.create({
      data: {
        bankId,
        templateId: selectedTemplateId,
        beneficiary: trimmedBeneficiary,
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : new Date(),
        creationPlace: creationPlace || "Casablanca",
        status: "DRAFT",
        createdBy: (session.user as any).name || (session.user as any).username,
      },
      include: {
        bank: true,
        template: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "CHEQUE",
        entityId: newCheque.id,
        action: "CREATE",
        newValue: JSON.stringify({ beneficiary: newCheque.beneficiary, amountNumeric: newCheque.amountNumeric }),
      },
    });

    return NextResponse.json(newCheque, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la création du chèque." }, { status: 500 });
  }
}
