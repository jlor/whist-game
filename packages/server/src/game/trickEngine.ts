import { RANK_STRENGTH, type Card, type Suit } from "@whist/shared";
import type { SeatIndex } from "./bidding.js";

/**
 * Legal plays for a hand given the suit led this trick (null if this player
 * is leading). Must follow the led suit if holding it — jokers never count
 * as following, so a player who can follow suit may not play a joker. A
 * player unable to follow suit may play anything, including jokers and
 * trump. A player leading a trick has no restriction.
 */
export function legalPlays(hand: Card[], ledSuit: Suit | null): Card[] {
  if (ledSuit === null) return hand;
  const ofLedSuit = hand.filter((c) => c.kind === "standard" && c.suit === ledSuit);
  return ofLedSuit.length > 0 ? ofLedSuit : hand;
}

export interface TrickPlay {
  seat: SeatIndex;
  card: Card;
}

/**
 * With a trump suit in play: trump beats joker beats everything else.
 * With no trump: jokers beat everything and are equal rank among
 * themselves, so the first joker played in the trick simply isn't
 * overtaken by a later one. Otherwise the highest card of the led suit wins.
 */
export function determineTrickWinner(
  plays: TrickPlay[],
  trumpSuit: Suit | null,
  ledSuit: Suit
): SeatIndex {
  if (plays.length === 0) throw new Error("cannot determine a winner with no plays");

  if (trumpSuit !== null) {
    const trumpPlays = plays.filter(
      (p) => p.card.kind === "standard" && p.card.suit === trumpSuit
    );
    if (trumpPlays.length > 0) {
      return trumpPlays.reduce((best, p) =>
        strength(p.card) > strength(best.card) ? p : best
      ).seat;
    }
  }

  const jokerPlays = plays.filter((p) => p.card.kind === "joker");
  if (jokerPlays.length > 0) {
    return jokerPlays[0].seat;
  }

  const ledSuitPlays = plays.filter(
    (p) => p.card.kind === "standard" && p.card.suit === ledSuit
  );
  if (ledSuitPlays.length === 0) {
    throw new Error("no card of the led suit was played — the leader's own card is missing");
  }
  return ledSuitPlays.reduce((best, p) =>
    strength(p.card) > strength(best.card) ? p : best
  ).seat;
}

function strength(card: Card): number {
  if (card.kind === "joker") throw new Error("jokers have no rank strength");
  return RANK_STRENGTH[card.rank];
}
