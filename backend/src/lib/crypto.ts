import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const SAP_ENCRYPTION_KEY_RAW = process.env.SAP_ENCRYPTION_KEY;
if (!SAP_ENCRYPTION_KEY_RAW) {
  console.error("[FATAL] SAP_ENCRYPTION_KEY is not set in environment variables.");
  console.error("Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"");
  process.exit(1);
}
const KEY: Buffer = Buffer.from(SAP_ENCRYPTION_KEY_RAW, "base64");
if (KEY.length !== 32) {
  console.error("[FATAL] SAP_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 encoded).");
  process.exit(1);
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  return payload.toString("base64");
}

export function decrypt(encoded: string): string {
  const payload = Buffer.from(encoded, "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function maskPassword(): string {
  return "••••••••";
}

export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const buf = Buffer.from(value, "base64");
    if (buf.length < IV_LENGTH + TAG_LENGTH + 1) return false;
    decrypt(value);
    return true;
  } catch {
    return false;
  }
}
