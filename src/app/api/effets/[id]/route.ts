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
    const effet = await prisma.effet.findUnique({
      where: { id },
      include: { bank: true, template: { include: { fields: true } } },
    });

    if (!effet) return NextResponse.json({ error: "Effet non trouvé." }, { status: 404 });
    return NextResponse.json(effet);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors du chargement de l'effet." }, { status: 500 });
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
    const {
      sapCode,
      beneficiary,
      dueDate,
      amountNumeric,
      amountWords,
      creationDate,
      creationPlace,
      cause,
      status,
      bankId,
      templateId,
    } = body;

    const existingEffet = await prisma.effet.findUnique({ where: { id } });
    if (!existingEffet) return NextResponse.json({ error: "Effet non trouvé." }, { status: 404 });

    const numAmount = amountNumeric !== undefined ? parseFloat(amountNumeric) : existingEffet.amountNumeric;
    const finalAmountWords = amountWords || convertAmountToWordsFr(numAmount);

    const updatedEffet = await prisma.effet.update({
      where: { id },
      data: {
        sapCode: sapCode !== undefined ? sapCode.trim() : existingEffet.sapCode,
        beneficiary: beneficiary !== undefined ? beneficiary.trim() : existingEffet.beneficiary,
        dueDate: dueDate ? new Date(dueDate) : existingEffet.dueDate,
        amountNumeric: numAmount,
        amountWords: finalAmountWords,
        creationDate: creationDate ? new Date(creationDate) : existingEffet.creationDate,
        creationPlace: creationPlace !== undefined ? creationPlace : existingEffet.creationPlace,
        cause: cause !== undefined ? cause : existingEffet.cause,
        status: status !== undefined ? status : existingEffet.status,
        bankId: bankId !== undefined ? bankId : existingEffet.bankId,
        templateId: templateId !== undefined ? templateId : existingEffet.templateId,
      },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "EFFET",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ sapCode: existingEffet.sapCode, amountNumeric: existingEffet.amountNumeric }),
        newValue: JSON.stringify({ sapCode: updatedEffet.sapCode, amountNumeric: updatedEffet.amountNumeric }),
      },
    });

    return NextResponse.json(updatedEffet);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la modification de l'effet." }, { status: 500 });
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

    const existingEffet = await prisma.effet.findUnique({ where: { id } });
    if (!existingEffet) return NextResponse.json({ error: "Effet non trouvé." }, { status: 404 });

    if (existingEffet.status === "PRINTED") {
      return NextResponse.json({ error: "Impossible de supprimer un effet déjà imprimé." }, { status: 400 });
    }

    if (isHardDelete) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Seul un administrateur peut supprimer définitivement un effet." }, { status: 403 });
      }

      await prisma.effet.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          entityType: "EFFET",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(existingEffet),
          newValue: null,
        },
      });

      return NextResponse.json({ message: "Effet supprimé définitivement." });
    }

    const softDeletedEffet = await prisma.effet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "EFFET",
        entityId: id,
        action: "SOFT_DELETE",
        oldValue: JSON.stringify({ deletedAt: null }),
        newValue: JSON.stringify({ deletedAt: softDeletedEffet.deletedAt }),
      },
    });

    return NextResponse.json({ message: "Effet supprimé (Soft Delete) avec succès.", effet: softDeletedEffet });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la suppression de l'effet." }, { status: 500 });
  }
}
