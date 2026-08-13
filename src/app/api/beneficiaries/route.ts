import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET(req: NextRequest) {
  try {
    const beneficiaries = await prisma.beneficiary.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(beneficiaries);
  } catch (error) {
    console.error("GET /api/beneficiaries error", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des bénéficiaires." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { name, code, category } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Le nom du bénéficiaire est obligatoire." }, { status: 400 });
    }

    const trimmedName = name.trim();

    const beneficiary = await prisma.beneficiary.upsert({
      where: { name: trimmedName },
      update: {
        code: code ? code.trim() : undefined,
        category: category || "FOURNISSEUR",
        active: true,
      },
      create: {
        name: trimmedName,
        code: code ? code.trim() : null,
        category: category || "FOURNISSEUR",
        active: true,
      },
    });

    return NextResponse.json(beneficiary);
  } catch (error) {
    console.error("POST /api/beneficiaries error", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du bénéficiaire." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    await prisma.beneficiary.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/beneficiaries error", error);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
