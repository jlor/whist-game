import {
  PARTNER_CARD_CASCADE,
  SUITS,
  cardsEqual,
  type Card,
  type PartnerCardRank,
  type Suit,
} from "@whist/shared";
import type { SeatIndex } from "./bidding.js";

function holdsAllFourOfRank(hand: Card[], rank: PartnerCardRank): boolean {
  return SUITS.every((suit) =>
    hand.some((c) => c.kind === "standard" && c.rank === rank && c.suit === suit)
  );
}

/**
 * Which partner-card ranks the declarer may legally name, in cascade order.
 * Always includes Ace. King is unlocked only by holding all 4 aces; Queen
 * by holding all 4 aces AND all 4 kings; Jack by holding all 4 of aces,
 * kings, and queens. Naming a rank the declarer holds all 4 of is always
 * still legal (it just guarantees a self-partner/solo outcome) — the
 * cascade only ever adds options, never removes the default Ace choice.
 */
export function eligiblePartnerCardRanks(declarerHand: Card[]): PartnerCardRank[] {
  const eligible: PartnerCardRank[] = ["A"];
  for (let i = 0; i < PARTNER_CARD_CASCADE.length - 1; i++) {
    const rankToCheck = PARTNER_CARD_CASCADE[i];
    if (!holdsAllFourOfRank(declarerHand, rankToCheck)) break;
    eligible.push(PARTNER_CARD_CASCADE[i + 1]);
  }
  return eligible;
}

export type PartnerResolution =
  | { status: "solo" }
  | { status: "secret"; partnerSeat: SeatIndex }
  | { status: "revealed"; partnerSeat: SeatIndex };

/**
 * Resolves the partner-card mechanic against the as-dealt hands (before any
 * kitty exchange — the kitty only ever moves cards between the
 * declarer/partner and the kitty, never touches an opponent's hand, so
 * resolving before or after exchange is always equivalent).
 *
 * `revealImmediately` is true under the `half` sub-method, where the
 * partner is known right away because they pick trump themselves.
 */
export function resolvePartnerCard(
  declarerSeat: SeatIndex,
  namedCard: { rank: PartnerCardRank; suit: Suit },
  hands: [Card[], Card[], Card[], Card[]],
  kitty: Card[],
  revealImmediately: boolean
): PartnerResolution {
  const named: Card = { kind: "standard", rank: namedCard.rank, suit: namedCard.suit };

  if (hands[declarerSeat].some((c) => cardsEqual(c, named))) {
    return { status: "solo" };
  }
  if (kitty.some((c) => cardsEqual(c, named))) {
    return { status: "solo" };
  }
  for (let seat = 0; seat < 4; seat++) {
    if (seat === declarerSeat) continue;
    if (hands[seat].some((c) => cardsEqual(c, named))) {
      const partnerSeat = seat as SeatIndex;
      return revealImmediately
        ? { status: "revealed", partnerSeat }
        : { status: "secret", partnerSeat };
    }
  }
  throw new Error("named partner card was not found in any hand or the kitty");
}
