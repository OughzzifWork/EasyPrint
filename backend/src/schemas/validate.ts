import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((e: any) => {
          const path = e.path.join(".");
          return path ? `${path}: ${e.message}` : e.message;
        });
        res.status(400).json({ error: "Erreur de validation", details: messages });
        return;
      }
      next(err);
    }
  };
}
