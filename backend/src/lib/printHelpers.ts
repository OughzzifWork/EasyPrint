import { prisma } from "./prisma";
import { isAdmin } from "./utils";

export function parsePrintParams(query: Record<string, any>) {
  const validDecimals = Math.max(0, Math.min(4, parseInt(query.decimals as string) || 2));
  const thousandSep = (query.thousandSep as string) === "." ? "." : ",";
  const orientation: "LANDSCAPE" | "PORTRAIT" = (query.orientation as string) === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE";
  const offsetX = parseFloat(query.offsetX as string) || 0;
  const offsetY = parseFloat(query.offsetY as string) || 0;
  const currency = (query.currency as string) || "MAD";
  const dateFormatParam = (query.dateFormat as string) || "DD/MM/YYYY";
  const amountPrefix = (query.amountPrefix as string) || "";
  const amountSuffix = (query.amountSuffix as string) || "";
  return { validDecimals, thousandSep, orientation, offsetX, offsetY, currency, dateFormatParam, amountPrefix, amountSuffix };
}

export function formatAmount(num: number, validDecimals: number, thousandSep: string): string {
  const fixed = num.toFixed(validDecimals);
  const [intPart, decPart] = fixed.split(".");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
  return decPart ? `${withSep}${thousandSep}${decPart}` : withSep;
}

export function formatDate(date: Date, dateFormatParam: string): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  switch (dateFormatParam) {
    case "MM/DD/YYYY": return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD": return `${yyyy}-${mm}-${dd}`;
    case "DD-MM-YYYY": return `${dd}-${mm}-${yyyy}`;
    default: return `${dd}/${mm}/${yyyy}`;
  }
}

export async function ensureBeneficiary(name: string, entityId: string | null | undefined) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const where: any = { name: trimmed, ...(entityId ? { entityId } : {}) };
  const existing = await prisma.beneficiary.findFirst({ where });
  if (existing) {
    await prisma.beneficiary.update({ where: { id: existing.id }, data: { active: true } }).catch(() => {});
  } else {
    await prisma.beneficiary.create({ data: { name: trimmed, category: "FOURNISSEUR", entityId } }).catch(() => {});
  }
}

export async function findActiveTemplate(bankId: string, documentType: string, req: any) {
  const where: any = { bankId, documentType, isActive: true };
  if (!isAdmin(req) && req.user!.entityId) {
    where.templateEntities = { some: { entityId: req.user!.entityId } };
  }
  return prisma.template.findFirst({ where });
}

export async function enrichCreatedBy(createdByUsers: Record<string, string>) {
  const userIds = [...new Set(Object.values(createdByUsers).filter(Boolean))];
  if (userIds.length === 0) return {};
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));
  const result: Record<string, string> = {};
  for (const [key, userId] of Object.entries(createdByUsers)) {
    result[key] = userMap[userId] || "";
  }
  return result;
}
