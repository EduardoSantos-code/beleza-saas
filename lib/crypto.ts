import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recomendado para GCM
const AUTH_TAG_LENGTH = 16;

const ENCRYPTION_KEY_RAW = process.env.FIELD_ENCRYPTION_KEY;
const IS_PROD = process.env.NODE_ENV === "production";

if (IS_PROD && (!ENCRYPTION_KEY_RAW || ENCRYPTION_KEY_RAW.length < 32)) {
  throw new Error("FIELD_ENCRYPTION_KEY deve ter pelo menos 32 caracteres em produção.");
}

const MASTER_KEY = ENCRYPTION_KEY_RAW || "dev-only-field-encryption-key-32bytes";

// Deriva uma chave de 32 bytes (256 bits) a partir da MASTER_KEY
const KEY = createHash("sha256").update(MASTER_KEY).digest();

export function encryptSecret(plainText: string): string {
  if (!plainText) {
    throw new Error("O texto para criptografia não pode estar vazio.");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Formato: iv:authTag:cipherText (todos em hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(encryptedValue: string): string {
  if (!encryptedValue) {
    throw new Error("O valor criptografado não pode estar vazio.");
  }

  const parts = encryptedValue.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de segredo inválido.");
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedText = Buffer.from(cipherTextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}