import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const bankTemplates = [
  { bankCode: "AWB",  imagePrefix: "AWB",  chequeName: "Chèque ATTIJARI WAFA BANK", effetName: "Effet ATTIJARI WAFA BANK" },
  { bankCode: "BMCE", imagePrefix: "BOA",  chequeName: "Chèque BANK OF AFRICA",    effetName: "Effet BANK OF AFRICA" },
  { bankCode: "BMCI", imagePrefix: "BMCI", chequeName: "Chèque BMCI",              effetName: "Effet BMCI" },
  { bankCode: "BP",   imagePrefix: "BP",   chequeName: "Chèque Banque Populaire",   effetName: "Effet Banque Populaire" },
  { bankCode: "CA",   imagePrefix: "CADM", chequeName: "Chèque CRÉDIT AGRICOLE",    effetName: "Effet CRÉDIT AGRICOLE" },
  { bankCode: "CIH",  imagePrefix: "CIH",  chequeName: "Chèque CIH",                effetName: "Effet CIH" },
  { bankCode: "SB",   imagePrefix: "CDM",  chequeName: "Chèque SAHAM BANK",         effetName: "Effet SAHAM BANK" },
  { bankCode: "SG",   imagePrefix: "SG",   chequeName: "Chèque Société Générale",   effetName: "Effet Société Générale" },
];

async function seedTemplates() {
  console.log("🏦 Création des templates de banques...\n");

  for (const bt of bankTemplates) {
    const bank = await prisma.bank.findFirst({ where: { code: bt.bankCode } });
    if (!bank) {
      console.log(`   ⚠️  Banque ${bt.bankCode} non trouvée, ignorée`);
      continue;
    }

    for (const docType of ["CHEQUE", "EFFET"] as const) {
      const name = docType === "CHEQUE" ? bt.chequeName : bt.effetName;
      const imageFile = `/templates/${bt.imagePrefix}_${docType}.png`;
      const isCheque = docType === "CHEQUE";

      const exists = await prisma.template.findFirst({
        where: { bankId: bank.id, documentType: docType },
      });

      if (exists) {
        console.log(`   ⏭️  ${name} existe déjà (id: ${exists.id})`);
        continue;
      }

      const template = await prisma.template.create({
        data: {
          bankId: bank.id,
          documentType: docType,
          name,
          backgroundImageUrl: imageFile,
          physicalWidthMm: isCheque ? 170 : 210,
          physicalHeightMm: isCheque ? 80  : 100,
          isActive: true,
          fields: {
            create: isCheque
              ? [
                  { fieldKey: "beneficiary",   x: 50,  y: 15, width: 100, fontSize: 10, fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                  { fieldKey: "amountNumeric", x: 50,  y: 30, width: 40,  fontSize: 10, fontFamily: "Helvetica", align: "RIGHT",  format: "NUMBER" },
                  { fieldKey: "amountWords",   x: 20,  y: 45, width: 130, fontSize: 9,  fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                  { fieldKey: "creationDate",  x: 130, y: 60, width: 35,  fontSize: 9,  fontFamily: "Helvetica", align: "CENTER", format: "DATE" },
                  { fieldKey: "creationPlace", x: 50,  y: 60, width: 50,  fontSize: 9,  fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                ]
              : [
                  { fieldKey: "sapCode",       x: 5,   y: 10, width: 30,  fontSize: 9,  fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                  { fieldKey: "beneficiary",   x: 40,  y: 10, width: 120, fontSize: 10, fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                  { fieldKey: "dueDate",       x: 160, y: 10, width: 35,  fontSize: 9,  fontFamily: "Helvetica", align: "CENTER", format: "DATE" },
                  { fieldKey: "amountNumeric", x: 40,  y: 30, width: 40,  fontSize: 10, fontFamily: "Helvetica", align: "RIGHT",  format: "NUMBER" },
                  { fieldKey: "amountWords",   x: 20,  y: 45, width: 160, fontSize: 9,  fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                  { fieldKey: "cause",         x: 20,  y: 60, width: 160, fontSize: 9,  fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                  { fieldKey: "creationDate",  x: 20,  y: 80, width: 35,  fontSize: 9,  fontFamily: "Helvetica", align: "CENTER", format: "DATE" },
                  { fieldKey: "creationPlace", x: 60,  y: 80, width: 50,  fontSize: 9,  fontFamily: "Helvetica", align: "LEFT",   format: "TEXT" },
                ],
          },
        },
      });

      console.log(`   ✅ ${name} (id: ${template.id})`);
    }
  }

  console.log("\n🎉 Templates créés !");
  await prisma.$disconnect();
}

seedTemplates().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
