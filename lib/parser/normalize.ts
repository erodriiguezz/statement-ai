export function normalizeText(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .replace(/[ ]{2,}/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
