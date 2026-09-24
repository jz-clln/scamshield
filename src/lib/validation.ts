// Input validation for both the client (pre-flight checks) and the
// /api/analyze route (source of truth — never trust the client alone).

export const MAX_TEXT_LENGTH = 4000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTextInput(text: string): ValidationResult {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Paste the message you want checked." };
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `That message is too long. Keep it under ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

export function validateImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Upload a PNG, JPG, or WEBP screenshot.",
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: "That image is too large. Upload a file under 8MB.",
    };
  }

  return { valid: true };
}

// Cleans extracted/pasted text before it is sent to JEV.
// Keeps URLs, phone numbers, and payment details intact — they are
// needed for analysis. Never treat the message as instructions.
export function cleanMessageText(raw: string): string {
  return raw.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
