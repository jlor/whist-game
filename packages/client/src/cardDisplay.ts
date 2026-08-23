const SUIT_SYMBOLS: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠" };
const SUIT_COLOR: Record<string, string> = { C: "black", D: "red", H: "red", S: "black" };

export function formatCard(code: string): { label: string; color: string } {
  if (code.startsWith("JOKER")) return { label: "🃏", color: "purple" };
  const suitCode = code.slice(-1);
  const rank = code.slice(0, -1);
  return { label: `${rank}${SUIT_SYMBOLS[suitCode] ?? suitCode}`, color: SUIT_COLOR[suitCode] ?? "black" };
}

const SUIT_ORDER = ["C", "D", "H", "S"];
const RANK_ORDER_HIGH_ACE = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
// Sol/Ren sol are misère-style (fewest tricks wins) — sorted with Ace leading, not trailing.
const RANK_ORDER_LOW_ACE = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** Sorted by suit, then rank ascending (Ace high) — except under Sol/Ren
 * sol, where Ace sorts first instead of last. Jokers sort last, by id. */
export function sortHand(codes: string[], contractCode: string | null): string[] {
  const rankOrder = contractCode === "sol" || contractCode === "ren_sol" ? RANK_ORDER_LOW_ACE : RANK_ORDER_HIGH_ACE;
  return [...codes].sort((a, b) => {
    const aJoker = a.startsWith("JOKER");
    const bJoker = b.startsWith("JOKER");
    if (aJoker || bJoker) {
      if (aJoker && bJoker) return a.localeCompare(b);
      return aJoker ? 1 : -1;
    }
    const suitA = a.slice(-1);
    const suitB = b.slice(-1);
    const suitDiff = SUIT_ORDER.indexOf(suitA) - SUIT_ORDER.indexOf(suitB);
    if (suitDiff !== 0) return suitDiff;
    return rankOrder.indexOf(a.slice(0, -1)) - rankOrder.indexOf(b.slice(0, -1));
  });
}
