import { Request } from "express";

export function isAdmin(req: Request): boolean {
  return req.user!.role === "ADMIN";
}

export function entityWhere(req: Request): Record<string, string> {
  return isAdmin(req) ? {} : { entityId: req.user!.entityId! };
}
