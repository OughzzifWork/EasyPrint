import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        bank: true,
        fields: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Modèle d'impression non trouvé." }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors du chargement du modèle." }, { status: 500 });
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
    const { name, backgroundImageUrl, physicalWidthMm, physicalHeightMm, isActive, fields } = body;

    const existingTemplate = await prisma.template.findUnique({ where: { id } });
    if (!existingTemplate) {
      return NextResponse.json({ error: "Modèle d'impression non trouvé." }, { status: 404 });
    }

    // Versioning logic if activating
    if (isActive && !existingTemplate.isActive) {
      await prisma.template.updateMany({
        where: {
          bankId: existingTemplate.bankId,
          documentType: existingTemplate.documentType,
          isActive: true,
        },
        data: {
          isActive: false,
          validTo: new Date(),
        },
      });
    }

    // Delete old fields and recreate updated fields transactionally
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      if (fields) {
        await tx.templateField.deleteMany({ where: { templateId: id } });
      }

      return tx.template.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingTemplate.name,
          backgroundImageUrl: backgroundImageUrl !== undefined ? backgroundImageUrl : existingTemplate.backgroundImageUrl,
          physicalWidthMm: physicalWidthMm ? parseFloat(physicalWidthMm) : existingTemplate.physicalWidthMm,
          physicalHeightMm: physicalHeightMm ? parseFloat(physicalHeightMm) : existingTemplate.physicalHeightMm,
          isActive: isActive !== undefined ? isActive : existingTemplate.isActive,
          fields: fields
            ? {
                create: fields.map((f: any) => ({
                  fieldKey: f.fieldKey,
                  x: parseFloat(f.x),
                  y: parseFloat(f.y),
                  width: parseFloat(f.width),
                  fontSize: f.fontSize ? parseFloat(f.fontSize) : 10,
                  fontFamily: f.fontFamily || "Helvetica",
                  align: f.align || "LEFT",
                  format: f.format || "TEXT",
                })),
              }
            : undefined,
        },
        include: {
          fields: true,
          bank: true,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "TEMPLATE",
        entityId: id,
        action: "UPDATE",
        oldValue: JSON.stringify({ name: existingTemplate.name, isActive: existingTemplate.isActive }),
        newValue: JSON.stringify({ name: updatedTemplate.name, isActive: updatedTemplate.isActive }),
      },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la mise à jour du modèle." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé. Rôle Administrateur requis." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const existingTemplate = await prisma.template.findUnique({ where: { id } });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Modèle non trouvé." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Find fallback active template for the same bank & document type if available
      const fallbackTemplate = await tx.template.findFirst({
        where: {
          bankId: existingTemplate.bankId,
          documentType: existingTemplate.documentType,
          id: { not: id },
        },
      });

      if (fallbackTemplate) {
        if (existingTemplate.documentType === "CHEQUE") {
          await tx.cheque.updateMany({
            where: { templateId: id },
            data: { templateId: fallbackTemplate.id },
          });
        } else {
          await tx.effet.updateMany({
            where: { templateId: id },
            data: { templateId: fallbackTemplate.id },
          });
        }
      }

      await tx.templateField.deleteMany({ where: { templateId: id } });
      await tx.template.delete({ where: { id } });
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        entityType: "TEMPLATE",
        entityId: id,
        action: "DELETE",
        oldValue: JSON.stringify(existingTemplate),
        newValue: null,
      },
    });

    return NextResponse.json({ message: "Modèle supprimé avec succès." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur lors de la suppression du modèle." }, { status: 500 });
  }
}
