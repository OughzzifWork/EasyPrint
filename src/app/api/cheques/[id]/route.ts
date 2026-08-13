import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertAmountToWordsFr } from "@/lib/numberToWordsFr";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;
    const cheque = await prisma.cheque.findUnique({
      where: { id },
      include: { bank: true, template: { include: { fields: true } } },
    });

    if (!cheque) return NextResponse.json({ error: "Chèque non trouvé." }, { status: 404 });
    return NextResponse.json(cheque);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors du chargement du chèque." }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.canEdit === false) {
    return NextResponse.json({ error: "Accès refusé. Droit d'édition requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { beneficiary, amountNumeric, amountWords, creationDate, creationPlace, status, bankId, templateId } = body;

    const existingCheque = await prisma.cheque.findUnique({ where: { id } });
    if (!existingCheque) return NextResponse.json({ error: "Chèque non trouvé." }, { status: 404 });

    const numAmount = amountNumeric !== undefined ? parseFloat(amountNumeric) : existingCheque.amountNumeric;
    const finalAmountWords = amountWords || convertAmountToWordsFr(numAmount);

    const updatedCheque = await prisma.cheque.update({
      where: { id },
      data: {
        beneficiary: beneficiary !== undefined ? beneficiary.trim() : existingCheque.beneficiary,
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : existingCheque.creationDate,
        creationPlace: creationPlace !== undefined ? creationPlace : existingCheque.creationPlace,
        status: status !== undefined ? status : existingCheque.status,
        bankId: bankId !== undefined ? bankId : existingCheque.bankId,
        templateId: templateId !== undefined ? templateId : existingCheque.templateId,
      },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "CHEQUE",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ beneficiary: existingCheque.beneficiary, amountNumeric: existingCheque.amountNumeric }),
        newValue: JSON.stringify({ beneficiary: updatedCheque.beneficiary, amountNumeric: updatedCheque.amountNumeric }),
      },
    });

    return NextResponse.json(updatedCheque);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la modification du chèque." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.canEdit === false) {
    return NextResponse.json({ error: "Accès refusé. Droit d'édition requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const isHardDelete = searchParams.get("hard") === "true";
    const isAdmin = (session.user as any)?.role === "ADMIN";

    const existingCheque = await prisma.cheque.findUnique({ where: { id } });
    if (!existingCheque) return NextResponse.json({ error: "Chèque non trouvé." }, { status: 404 });

    if (existingCheque.status === "PRINTED") {
      return NextResponse.json({ error: "Impossible de supprimer un chèque déjà imprimé." }, { status: 400 });
    }

    if (isHardDelete) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Seul un administrateur peut supprimer définitivement un chèque." }, { status: 403 });
      }

      await prisma.cheque.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          entityType: "CHEQUE",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(existingCheque),
          newValue: null,
        },
      });

      return NextResponse.json({ message: "Chèque supprimé définitivement." });
    }

    // Soft delete (logical delete)
    const softDeletedCheque = await prisma.cheque.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "CHEQUE",
        entityId: id,
        action: "SOFT_DELETE",
        oldValue: JSON.stringify({ deletedAt: null }),
        newValue: JSON.stringify({ deletedAt: softDeletedCheque.deletedAt }),
      },
    });

    return NextResponse.json({ message: "Chèque supprimé (Soft Delete) avec succès.", cheque: softDeletedCheque });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la suppression du chèque." }, { status: 500 });
  }
}
