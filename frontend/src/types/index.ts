export type Role = "ADMIN" | "COMPTABLE" | "VISITEUR";
export type DocumentType = "CHEQUE" | "EFFET";
export type FieldAlign = "LEFT" | "CENTER" | "RIGHT";
export type FieldFormat = "TEXT" | "DATE" | "CURRENCY" | "AMOUNT_IN_WORDS";
export type DocumentStatus = "DRAFT" | "VALIDATED" | "PRINTED" | "CANCELLED";

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  canEdit: boolean;
  active: boolean;
}

export interface UserDTO {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  active: boolean;
  canEdit: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BankDTO {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    templates: number;
    cheques: number;
    effets: number;
  };
}
