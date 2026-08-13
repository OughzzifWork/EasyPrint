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
    const existingCheque = await prisma.cheque.findUnique({ where: { id } });

    if (!existingCheque) {
      return NextResponse.json({ error: "Chèque non trouvé." }, { status: 404 });
    }

    const restoredCheque = await prisma.cheque.update({
      where: { id },
      data: { deletedAt: null },
      include: { bank: true, template: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "CHEQUE",
        entityId: id,
        action: "RESTORE",
        oldValue: JSON.stringify({ deletedAt: existingCheque.deletedAt }),
        newValue: JSON.stringify({ deletedAt: null }),
      },
    });

    return NextResponse.json({ message: "Chèque restauré avec succès.", cheque: restoredCheque });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la restauration du chèque." }, { status: 500 });
  }
}
