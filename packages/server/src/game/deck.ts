import { freshDeck, shuffle, type Card } from "@whist/shared";

export interface Deal {
  hands: [Card[], Card[], Card[], Card[]];
  kitty: Card[];
}

/** Deals the 55-card deck: 13 cards to each of 4 seats, 3-card kitty. */
export function dealHand(rng: () => number = Math.random): Deal {
  const deck = shuffle(freshDeck(), rng);
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  for (let seat = 0; seat < 4; seat++) {
    hands[seat] = deck.slice(seat * 13, seat * 13 + 13);
  }
  const kitty = deck.slice(52, 55);
  return { hands, kitty };
}
