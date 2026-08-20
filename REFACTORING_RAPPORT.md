# Rapport de Refactoring — EasyPrint

**Date :** 20 août 2026  
**Statut :** ✅ Terminé — Backend `tsc --noEmit` passe sans erreur

---

## 1. Dépendances npm supprimées (5 packages)

| Package | Scope | Raison |
|---|---|---|
| `hdb` | backend | Pilote SAP HANA jamais importé — le projet utilise `mssql` (SQL Server) |
| `framer-motion` | frontend | Aucun import dans le code source |
| `konva` | frontend | Aucun import — `TemplateCanvas` utilise un `div` custom |
| `react-konva` | frontend | Peer dependency de `konva`, jamais importé |
| `tailwind-merge` | frontend | Aucun appel `twMerge()` ou `tailwindMerge()` dans le code |

**Impact :** Réduction de `node_modules` et élimination de dépendances mortes.

---

## 2. Code mort supprimé

| Fichier | Élément supprimé | Raison |
|---|---|---|
| `src/lib/sapHana.ts:86` | `export function closeClient(): void {}` | Fonction vide, jamais importée |
| `prisma/seed.ts:3` | `import crypto from "crypto"` | Import inutilisé |
| `prisma/seed.ts:7-9` | `function generatePassword()` | Fonction définie mais jamais appelée |

---

## 3. Code dupliqué extrait vers des modules partagés

### 3.1 `isAdmin()` — 6 copies identiques → 1 seule

**Anciens emplacements :**
- `src/routes/users.ts:194`
- `src/routes/banks.ts:9`
- `src/routes/beneficiaries.ts:9`
- `src/routes/templates.ts:10`
- `src/routes/cheques.ts:11`
- `src/routes/effets.ts:11`

**Nouveau module :** `src/lib/utils.ts`

```ts
export function isAdmin(req: Request): boolean {
  return req.user!.role === "ADMIN";
}
```

### 3.2 `entityWhere()` — 3 copies identiques → 1 seule

**Anciens emplacements :**
- `src/routes/beneficiaries.ts:13`
- `src/routes/cheques.ts:15`
- `src/routes/effets.ts:15`

**Nouveau module :** `src/lib/utils.ts`

```ts
export function entityWhere(req: Request): Record<string, string> {
  return isAdmin(req) ? {} : { entityId: req.user!.entityId };
}
```

### 3.3 `JWT_SECRET` — 2 copies → 1 seule

**Anciens emplacements :**
- `src/middleware/auth.ts:5-10`
- `src/routes/auth.ts:9-14`

**Nouveau module :** `src/lib/config.ts`

```ts
const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  console.error("[FATAL] JWT_SECRET is not set in environment variables.");
  process.exit(1);
}
export const JWT_SECRET: string = JWT_SECRET_RAW;
```

### 3.4 `formatAmount()` / `formatDate()` — 2 copies → 1 seule

**Anciens emplacements :**
- `src/routes/cheques.ts:325-341`
- `src/routes/effets.ts:331-347`

**Nouveau module :** `src/lib/printHelpers.ts`

### 3.5 Auto-création bénéficiaire — 2 copies → 1 seule

**Anciens emplacements :**
- `src/routes/cheques.ts:98-109`
- `src/routes/effets.ts:99-110`

**Nouveau module :** `src/lib/printHelpers.ts`

```ts
export async function ensureBeneficiary(name: string, entityId: string | null | undefined) { ... }
```

### 3.6 Découverte template actif — 2 copies → 1 seule

**Anciens emplacements :**
- `src/routes/cheques.ts:76-91`
- `src/routes/effets.ts:77-92`

**Nouveau module :** `src/lib/printHelpers.ts`

```ts
export async function findActiveTemplate(bankId: string, documentType: string, req: any) { ... }
```

### 3.7 Parsing des paramètres d'impression — 2 copies → 1 seule

**Anciens emplacements :**
- `src/routes/cheques.ts:314-323` (12 lignes)
- `src/routes/effets.ts:275-284` (12 lignes)

**Nouveau module :** `src/lib/printHelpers.ts`

```ts
export function parsePrintParams(query: Record<string, any>) {
  // validDecimals, thousandSep, orientation, offsetX, offsetY, currency, dateFormatParam, amountPrefix, amountSuffix
}
```

---

## 4. Fichiers créés

| Fichier | Rôle | Lignes |
|---|---|---|
| `backend/src/lib/utils.ts` | `isAdmin()` + `entityWhere()` | 9 |
| `backend/src/lib/config.ts` | `JWT_SECRET` partagé | 8 |
| `backend/src/lib/printHelpers.ts` | `parsePrintParams`, `formatAmount`, `formatDate`, `ensureBeneficiary`, `findActiveTemplate`, `enrichCreatedBy` | 66 |

---

## 5. Fichiers modifiés

| Fichier | Changements |
|---|---|
| `backend/package.json` | Suppression `hdb` |
| `backend/src/middleware/auth.ts` | Import `JWT_SECRET` depuis `config.ts` (suppression bloc dupliqué) |
| `backend/src/routes/auth.ts` | Import `JWT_SECRET` depuis `config.ts` (suppression bloc dupliqué) |
| `backend/src/routes/users.ts` | Import `isAdmin` depuis `utils.ts` + suppression fonction locale |
| `backend/src/routes/banks.ts` | Import `isAdmin` depuis `utils.ts` + suppression fonction locale |
| `backend/src/routes/beneficiaries.ts` | Import `isAdmin`/`entityWhere` depuis `utils.ts` + suppression fonctions locales |
| `backend/src/routes/templates.ts` | Import `isAdmin` depuis `utils.ts` + suppression fonction locale + correction pattern inline `role !== "ADMIN"` |
| `backend/src/routes/cheques.ts` | Import depuis `utils.ts` + `printHelpers.ts`, suppression fonctions locales, remplace code inline par appels partagés |
| `backend/src/routes/effets.ts` | Import depuis `utils.ts` + `printHelpers.ts`, suppression fonctions locales, remplace code inline par appels partagés |
| `backend/src/lib/sapHana.ts` | Suppression `closeClient()`, export `sql` pour `entities.ts` |
| `backend/src/routes/entities.ts` | Import `sql` depuis `sapHana.ts` au lieu de `require("mssql")` |
| `backend/prisma/seed.ts` | Suppression `import crypto` + fonction `generatePassword()` inutilisée |
| `frontend/package.json` | Suppression `framer-motion`, `konva`, `react-konva`, `tailwind-merge` |

---

## 6. Incohérences corrigées

| Problème | Avant | Après |
|---|---|---|
| `require()` vs `import` | `const sql = require("mssql")` dans `entities.ts` | `import { sql } from "../lib/sapHana"` |
| Pattern admin inline | `req.user!.role !== "ADMIN"` dans `templates.ts:213` | `!isAdmin(req)` via helper partagé |
| `sql.NVarChar` exposé dans route | `entities.ts` importait `mssql` directement | `sql` ré-exporté depuis `sapHana.ts` |

---

## 7. Résumé quantitatif

| Métrique | Valeur |
|---|---|
| Lignes de code dupliqué supprimées | ~150 |
| Fichiers modifiés | 13 |
| Fichiers créés | 3 |
| Dépendances supprimées | 5 |
| Code mort supprimé | 3 fonctions + 1 import |
| Erreurs TypeScript | 0 |

---

## 8. Vérification

```
backend:  npx tsc --noEmit  → ✅ 0 erreurs
frontend: npx tsc --noEmit  → ✅ 0 erreurs
```

---

## 9. Impact

- **Stabilité** : Code centralisé = moins de bugs de divergence entre cheques/effets
- **Maintenabilité** : Modifier `formatAmount` ou `isAdmin` = 1 fichier au lieu de 6
- **Légèreté** : 5 dépendances mortes supprimées (~réduction node_modules)
- **Sécurité** : `JWT_SECRET` initialisé en un seul endroit, impossible d'oublier un import
