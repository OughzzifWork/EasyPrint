import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.canEdit === false) {
    return NextResponse.json({ error: "Accès refusé. Droit d'édition requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const existingEffet = await prisma.effet.findUnique({ where: { id } });

    if (!existingEffet) {
      return NextResponse.json({ error: "Effet non trouvé." }, { status: 404 });
    }

    const restoredEffet = await prisma.effet.update({
      where: { id },
      data: { deletedAt: null },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "EFFET",
        entityId: id,
        action: "RESTORE",
        oldValue: JSON.stringify({ deletedAt: existingEffet.deletedAt }),
        newValue: JSON.stringify({ deletedAt: null }),
      },
    });

    return NextResponse.json({ message: "Effet restauré avec succès.", effet: restoredEffet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la restauration de l'effet." }, { status: 500 });
  }
}
