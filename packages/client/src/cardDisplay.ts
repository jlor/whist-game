const SUIT_SYMBOLS: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠" };
const SUIT_COLOR: Record<string, string> = { C: "black", D: "red", H: "red", S: "black" };

export function formatCard(code: string): { label: string; color: string } {
  if (code.startsWith("JOKER")) return { label: "🃏", color: "purple" };
  const suitCode = code.slice(-1);
  const rank = code.slice(0, -1);
  return { label: `${rank}${SUIT_SYMBOLS[suitCode] ?? suitCode}`, color: SUIT_COLOR[suitCode] ?? "black" };
}
