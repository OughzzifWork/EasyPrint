import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  if (role !== "ADMIN" && role !== "COMPTABLE") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur ou Comptable requis." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const search = searchParams.get("search");

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (search) {
    where.OR = [
      { entityId: { contains: search } },
      { oldValue: { contains: search } },
      { newValue: { contains: search } },
      { user: { fullName: { contains: search } } },
      { user: { username: { contains: search } } },
    ];
  }

  try {
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(auditLogs);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des journaux d'audit." }, { status: 500 });
  }
}
