import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { fullName, role, active, canEdit, newPassword } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (role !== undefined) dataToUpdate.role = role;
    if (active !== undefined) dataToUpdate.active = active;
    if (canEdit !== undefined) dataToUpdate.canEdit = canEdit;

    if (newPassword && newPassword.trim() !== "") {
      dataToUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        active: true,
        canEdit: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "USER",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ fullName: existingUser.fullName, role: existingUser.role, active: existingUser.active, canEdit: existingUser.canEdit }),
        newValue: JSON.stringify(updatedUser),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur lors de la mise à jour de l'utilisateur." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Prevent deleting oneself
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte utilisateur." }, { status: 400 });
    }

    // Toggle active status to false instead of hard deleting
    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "USER",
        entityId: id,
        action: "DEACTIVATE",
        oldValue: JSON.stringify({ active: true }),
        newValue: JSON.stringify({ active: false }),
      },
    });

    return NextResponse.json({ message: "Compte utilisateur désactivé avec succès.", user: deactivatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la désactivation de l'utilisateur." }, { status: 500 });
  }
}
