import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bankId = searchParams.get("bankId");
  const documentType = searchParams.get("documentType");

  const where: any = {};
  if (bankId) where.bankId = bankId;
  if (documentType) where.documentType = documentType;

  try {
    const templates = await prisma.template.findMany({
      where,
      include: {
        bank: true,
        fields: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la récupération des modèles." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.canEdit === false) {
    return NextResponse.json({ error: "Accès refusé. Droit d'édition requis." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      bankId,
      documentType,
      name,
      backgroundImageUrl,
      physicalWidthMm,
      physicalHeightMm,
      isActive,
      fields,
    } = body;

    if (!bankId || !documentType || !name) {
      return NextResponse.json({ error: "La banque, le type de document et le nom du modèle sont obligatoires." }, { status: 400 });
    }

    // Versioning logic: If setting this template as active, deactivate previous active templates for same bank & docType
    if (isActive) {
      await prisma.template.updateMany({
        where: {
          bankId,
          documentType,
          isActive: true,
        },
        data: {
          isActive: false,
          validTo: new Date(),
        },
      });
    }

    const newTemplate = await prisma.template.create({
      data: {
        bankId,
        documentType,
        name: name.trim(),
        backgroundImageUrl: backgroundImageUrl || null,
        physicalWidthMm: physicalWidthMm ? parseFloat(physicalWidthMm) : 210,
        physicalHeightMm: physicalHeightMm ? parseFloat(physicalHeightMm) : 100,
        isActive: isActive !== undefined ? isActive : true,
        fields: {
          create: (fields || []).map((f: any) => ({
            fieldKey: f.fieldKey,
            x: parseFloat(f.x),
            y: parseFloat(f.y),
            width: parseFloat(f.width),
            fontSize: f.fontSize ? parseFloat(f.fontSize) : 10,
            fontFamily: f.fontFamily || "Helvetica",
            align: f.align || "LEFT",
            format: f.format || "TEXT",
          })),
        },
      },
      include: {
        fields: true,
        bank: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "TEMPLATE",
        entityId: newTemplate.id,
        action: "CREATE",
        newValue: JSON.stringify({ name: newTemplate.name, bankId, documentType, fieldCount: newTemplate.fields.length }),
      },
    });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la création du modèle." }, { status: 500 });
  }
}
