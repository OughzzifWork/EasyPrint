import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, code, active } = body;

    const existingBank = await prisma.bank.findUnique({ where: { id } });
    if (!existingBank) {
      return NextResponse.json({ error: "Banque non trouvée." }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (code !== undefined) dataToUpdate.code = code.trim().toUpperCase();
    if (active !== undefined) dataToUpdate.active = active;

    const updatedBank = await prisma.bank.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "BANK",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify(existingBank),
        newValue: JSON.stringify(updatedBank),
      },
    });

    return NextResponse.json(updatedBank);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour de la banque." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const isHardDelete = searchParams.get("hard") === "true";

    const existingBank = await prisma.bank.findUnique({ where: { id } });

    if (!existingBank) {
      return NextResponse.json({ error: "Banque non trouvée." }, { status: 404 });
    }

    if (isHardDelete) {
      await prisma.$transaction(async (tx) => {
        // Delete child cheques & effets for this bank
        await tx.cheque.deleteMany({ where: { bankId: id } });
        await tx.effet.deleteMany({ where: { bankId: id } });

        // Get bank templates
        const templates = await tx.template.findMany({ where: { bankId: id }, select: { id: true } });
        const templateIds = templates.map((t) => t.id);

        if (templateIds.length > 0) {
          await tx.templateField.deleteMany({ where: { templateId: { in: templateIds } } });
          await tx.template.deleteMany({ where: { bankId: id } });
        }

        // Delete bank
        await tx.bank.delete({ where: { id } });
      });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          entityType: "BANK",
          entityId: id,
          action: "PERMANENT_DELETE",
          oldValue: JSON.stringify(existingBank),
          newValue: null,
        },
      });

      return NextResponse.json({ message: "Banque et ses modèles/documents supprimés définitivement." });
    }

    const toggledBank = await prisma.bank.update({
      where: { id },
      data: { active: !existingBank.active },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "BANK",
        entityId: id,
        action: toggledBank.active ? "ACTIVATE" : "DEACTIVATE",
        oldValue: JSON.stringify({ active: existingBank.active }),
        newValue: JSON.stringify({ active: toggledBank.active }),
      },
    });

    return NextResponse.json(toggledBank);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la modification ou suppression de la banque." }, { status: 500 });
  }
}
