import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
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
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la récupération des utilisateurs." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, username, password, role, active, canEdit } = body;

    if (!fullName || !username || !password) {
      return NextResponse.json({ error: "Tous les champs obligatoires doivent être renseignés." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Ce nom d'utilisateur est déjà utilisé." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        role: role || "COMPTABLE",
        active: active !== undefined ? active : true,
        canEdit: canEdit !== undefined ? canEdit : true,
      },
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

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "USER",
        entityId: newUser.id,
        action: "CREATE",
        newValue: JSON.stringify(newUser),
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur lors de la création de l'utilisateur." }, { status: 500 });
  }
}
