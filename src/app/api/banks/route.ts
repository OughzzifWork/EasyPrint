import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const banks = await prisma.bank.findMany({
      include: {
        _count: {
          select: {
            templates: true,
            cheques: true,
            effets: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });
    return NextResponse.json(banks);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la récupération des banques." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, code, active } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Le nom et le code de la banque sont obligatoires." }, { status: 400 });
    }

    const formattedCode = code.trim().toUpperCase();

    const existingBank = await prisma.bank.findUnique({
      where: { code: formattedCode },
    });

    if (existingBank) {
      return NextResponse.json({ error: "Une banque avec ce code existe déjà." }, { status: 400 });
    }

    const newBank = await prisma.bank.create({
      data: {
        name: name.trim(),
        code: formattedCode,
        active: active !== undefined ? active : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "BANK",
        entityId: newBank.id,
        action: "CREATE",
        newValue: JSON.stringify(newBank),
      },
    });

    return NextResponse.json(newBank, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la création de la banque." }, { status: 500 });
  }
}
