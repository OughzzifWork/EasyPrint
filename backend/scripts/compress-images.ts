import sharp from "sharp";
import fs from "fs";
import path from "path";

const srcDir = path.join(__dirname, "..", "..", "frontend", "public", "templates");
const outDir = srcDir; // overwrite in place

async function compress() {
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".png"));

  console.log(`🗜️  Compression de ${files.length} images...\n`);

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const tmpPath = path.join(srcDir, file + ".tmp");
    const origSize = fs.statSync(srcPath).size;

    try {
      const meta = await sharp(srcPath).metadata();
      const targetWidth = file.includes("CHEQUE") ? 1200 : 1500;

      await sharp(srcPath)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .png({ quality: 80, compressionLevel: 9, palette: true })
        .toFile(tmpPath);

      const newSize = fs.statSync(tmpPath).size;
      const reduction = ((1 - newSize / origSize) * 100).toFixed(0);

      fs.renameSync(tmpPath, srcPath);
      console.log(
        `   ✅ ${file}: ${(origSize / 1024 / 1024).toFixed(1)} MB → ${(newSize / 1024).toFixed(0)} KB (-${reduction}%)`
      );
    } catch (err: any) {
      console.error(`   ❌ ${file}: ${err.message}`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  console.log("\n🎉 Compression terminée !");
}

compress().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
