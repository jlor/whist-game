import { cardsEqual, type Card } from "@whist/shared";

export interface KittyExchangeResult {
  newHand: Card[];
  newKitty: Card[];
  exchanged: boolean;
}

/**
 * All-or-none 3-for-3 swap between the performer's hand and the kitty.
 * Applies to every contract, including the solo ones and — separately from
 * its trump-search reveal — `tip` as well. Pass `discard: null` to decline.
 */
export function exchangeKitty(hand: Card[], kitty: Card[], discard: Card[] | null): KittyExchangeResult {
  if (discard === null) {
    return { newHand: hand, newKitty: kitty, exchanged: false };
  }
  if (kitty.length !== 3) throw new Error("kitty must have exactly 3 cards");
  if (discard.length !== 3) throw new Error("must discard exactly 3 cards, or none at all");

  const remaining = [...hand];
  for (const card of discard) {
    const idx = remaining.findIndex((c) => cardsEqual(c, card));
    if (idx === -1) throw new Error("cannot discard a card not held in hand");
    remaining.splice(idx, 1);
  }

  return { newHand: [...remaining, ...kitty], newKitty: discard, exchanged: true };
}
