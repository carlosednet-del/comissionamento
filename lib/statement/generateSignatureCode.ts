import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Gera um código alfanumérico seguro de exatamente 32 caracteres (uppercase). */
export function generateSignatureCode(): string {
  let code = "";
  while (code.length < 32) {
    const bytes = randomBytes(64);
    for (let i = 0; i < bytes.length && code.length < 32; i++) {
      const idx = bytes[i] % ALPHABET.length;
      if (idx < ALPHABET.length) code += ALPHABET[idx];
    }
  }
  return code.slice(0, 32);
}
