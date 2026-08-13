import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

try {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  if (!fs.existsSync(dbPath)) {
    console.log("[Prisma] Initializing SQLite database and pushing schema...");
    try {
      execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
      console.log("[Prisma] Seeding initial database records...");
      execSync("npx prisma db seed", { stdio: "inherit" });
    } catch (e) {
      console.warn("[Prisma] DB auto-initialization error:", e);
    }
  }
} catch (e) {
  console.warn("[Prisma] Could not check DB path:", e);
}

try {
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
} catch (e) {
  console.warn("[AI Studio] Database not connected — using mock proxy");
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
    upsert: async (d: any) => d?.create ?? {},
    count: async () => 0,
  };
  prismaInstance = new Proxy({}, { get: () => noOp }) as unknown as PrismaClient;
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
