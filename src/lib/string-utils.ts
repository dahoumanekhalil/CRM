export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || email.trim() === "") return null;
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || phone.trim() === "") return null;
  // Strip all non-digit characters for comparison (keeps leading +)
  return phone.trim().replace(/[^\d+]/g, "");
}
