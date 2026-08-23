export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
] as const;
export type Rank = (typeof RANKS)[number];

/** Higher number = stronger card within a suit. Ace is high. */
export const RANK_STRENGTH: Record<Rank, number> = {
  A: 13,
  K: 12,
  Q: 11,
  J: 10,
  "10": 9,
  "9": 8,
  "8": 7,
  "7": 6,
  "6": 5,
  "5": 4,
  "4": 3,
  "3": 2,
  "2": 1,
};

export interface StandardCard {
  kind: "standard";
  suit: Suit;
  rank: Rank;
}

export interface JokerCard {
  kind: "joker";
  /** Distinguishes the 3 physical jokers for tracking only — they are equal rank in play. */
  id: 1 | 2 | 3;
}

export type Card = StandardCard | JokerCard;

/** Stable wire/DB encoding, e.g. "AH", "10C", "JOKER2". */
export function encodeCard(card: Card): string {
  if (card.kind === "joker") return `JOKER${card.id}`;
  const suitCode = card.suit[0].toUpperCase();
  return `${card.rank}${suitCode}`;
}

const SUIT_BY_CODE: Record<string, Suit> = {
  C: "clubs",
  D: "diamonds",
  H: "hearts",
  S: "spades",
};

export function decodeCard(code: string): Card {
  if (code.startsWith("JOKER")) {
    const id = Number(code.slice(5)) as 1 | 2 | 3;
    return { kind: "joker", id };
  }
  const suitCode = code.slice(-1);
  const rank = code.slice(0, -1) as Rank;
  const suit = SUIT_BY_CODE[suitCode];
  if (!suit || !RANKS.includes(rank)) {
    throw new Error(`Invalid card code: ${code}`);
  }
  return { kind: "standard", suit, rank };
}

export function cardsEqual(a: Card, b: Card): boolean {
  return encodeCard(a) === encodeCard(b);
}

export function isJoker(card: Card): card is JokerCard {
  return card.kind === "joker";
}

/** Full 55-card deck: 52 standard + 3 jokers. */
export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ kind: "standard", suit, rank });
    }
  }
  deck.push({ kind: "joker", id: 1 });
  deck.push({ kind: "joker", id: 2 });
  deck.push({ kind: "joker", id: 3 });
  return deck;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
