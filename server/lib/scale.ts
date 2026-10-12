/** The number in the model's reply to a scale photo, or null. Accepts "209.4", "209.4 lb", "NONE". */
export function parseReading(text: string): number | null {
  const m = text.trim().match(/^(\d{2,3}(?:[.,]\d)?)\b/);
  if (!m) return null;
  const value = Number(m[1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}
