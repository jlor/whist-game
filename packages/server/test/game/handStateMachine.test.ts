import { describe, expect, it } from "vitest";
import { freshDeck, type Card } from "@whist/shared";
import { HandStateMachine } from "../../src/game/handStateMachine.js";
import type { SeatIndex } from "../../src/game/bidding.js";

/** Deals a fully controlled hand: cards assigned in a fixed order so tests
 * can place specific cards (e.g. a named partner-card) into specific seats. */
function forceDeal(
  hsm: HandStateMachine,
  hands: [Card[], Card[], Card[], Card[]],
  kitty: Card[]
): void {
  for (let seat = 0; seat < 4; seat++) {
    expect(hands[seat]).toHaveLength(13);
    (hsm.hands as Card[][])[seat] = hands[seat];
  }
  expect(kitty).toHaveLength(3);
  hsm.kitty = kitty;
}

/** Deals the real 55-card deck out in encounter order, four 13s + a 3-kitty
 * — deterministic and exhaustive, good enough when a test only needs *some*
 * concrete, valid deal rather than a hand-picked one. */
function sequentialDeal(): { hands: [Card[], Card[], Card[], Card[]]; kitty: Card[] } {
  const deck = freshDeck();
  const hands: [Card[], Card[], Card[], Card[]] = [
    deck.slice(0, 13),
    deck.slice(13, 26),
    deck.slice(26, 39),
    deck.slice(39, 52),
  ];
  return { hands, kitty: deck.slice(52, 55) };
}

/** Plays out the rest of the hand by always playing each seat's first legal
 * card — deterministic given a deterministic deal, and exercises the full
 * trick-taking + scoring pipeline without needing to hand-predict winners
 * (trick-winner correctness is covered independently by trickEngine.test.ts). */
function autoPlayToCompletion(hsm: HandStateMachine): void {
  let guard = 0;
  while (hsm.phase === "play") {
    if (++guard > 1000) throw new Error("autoplay did not terminate");
    const seat = hsm.turnSeat!;
    const legal = hsm.legalPlaysForCurrentTurn();
    hsm.playCard(seat, legal[0]);
  }
}

function nextSeat(seat: SeatIndex): SeatIndex {
  return (((seat + 1) % 4) as SeatIndex);
}

/** Drives the auction to completion: bidderSeat bids once (on its turn),
 * every other seat passes, until 3 passes in a row close the auction. */
function bidAllPassExcept(hsm: HandStateMachine, dealerSeat: SeatIndex, bidderSeat: SeatIndex, contractCode: any) {
  let seat = nextSeat(dealerSeat);
  let bidPlaced = false;
  let guard = 0;
  while (hsm.phase === "bidding") {
    if (++guard > 20) throw new Error("bidding did not terminate");
    if (seat === bidderSeat && !bidPlaced) {
      hsm.placeBid(seat, contractCode);
      bidPlaced = true;
    } else {
      hsm.placeBid(seat, null);
    }
    seat = nextSeat(seat);
  }
}

describe("HandStateMachine — full hand, sequential deal, free-trump contract", () => {
  it("runs bidding -> declaration -> kitty exchange -> 13 tricks -> zero-sum scoring", () => {
    const hsm = new HandStateMachine(0);
    const { hands, kitty } = sequentialDeal();
    forceDeal(hsm, hands, kitty);

    bidAllPassExcept(hsm, 0, 1, "ten");
    expect(hsm.phase).toBe("declaration");
    expect(hsm.declarerSeat).toBe(1);

    // Whoever actually holds the named ace becomes the secret partner —
    // find it in this deterministic deal rather than assuming a seat.
    const namedAce = { rank: "A" as const, suit: "spades" as const };
    hsm.declareContract({ contractCode: "ten", trumpSuit: "clubs", partnerCard: namedAce });
    expect(hsm.phase).toBe("kitty_exchange");
    expect(hsm.partnerResolution).toBeDefined();

    hsm.performKittyExchange(hsm.turnSeat!, null); // decline
    expect(hsm.phase).toBe("play");

    autoPlayToCompletion(hsm);

    expect(hsm.phase).toBe("complete");
    expect(hsm.tricks).toHaveLength(13);
    const result = hsm.result!;
    expect(result.ledger).toHaveLength(4);
    expect(result.ledger.reduce((sum, e) => sum + e.delta, 0)).toBe(0);

    // If a real partner was found (not self/kitty-stranded), the ace's own
    // seat must eventually have played it, revealing the partnership.
    if (!result.isSoloOutcome) {
      expect(hsm.partnerRevealedDuringPlay).toBe(true);
    }
  });
});

describe("HandStateMachine — solo outcome via self-held partner card", () => {
  it("declarer naming a card they hold themselves collapses to solo scoring", () => {
    const hsm = new HandStateMachine(0);
    const { hands, kitty } = sequentialDeal();
    forceDeal(hsm, hands, kitty);

    bidAllPassExcept(hsm, 0, 2, "eleven");
    const declarerHand = hsm.hands[2];
    const ownCard = declarerHand.find((c) => c.kind === "standard")! as { kind: "standard"; rank: any; suit: any };

    hsm.declareContract({
      contractCode: "eleven",
      trumpSuit: "hearts",
      partnerCard: { rank: ownCard.rank, suit: ownCard.suit },
    });

    expect(hsm.partnerResolution).toEqual({ status: "solo" });
    hsm.performKittyExchange(hsm.turnSeat!, null);
    autoPlayToCompletion(hsm);

    expect(hsm.result!.isSoloOutcome).toBe(true);
    expect(hsm.result!.partnerSeat).toBeNull();
    const declarerEntry = hsm.result!.ledger.find((e) => e.seat === 2)!;
    expect(declarerEntry.multiplier).toBe(3);
    expect(hsm.result!.ledger.reduce((sum, e) => sum + e.delta, 0)).toBe(0);
  });
});

describe("HandStateMachine — sol contract (structurally solo, no partner mechanic)", () => {
  it("goes straight from declaration to kitty exchange, no partner involved", () => {
    const hsm = new HandStateMachine(0, undefined, 1); // lower the bid floor so sol (rank 1) is biddable
    const { hands, kitty } = sequentialDeal();
    forceDeal(hsm, hands, kitty);

    bidAllPassExcept(hsm, 0, 3, "sol");
    expect(hsm.phase).toBe("declaration");
    hsm.declareContract({ contractCode: "sol" });
    expect(hsm.phase).toBe("kitty_exchange");
    expect(hsm.turnSeat).toBe(3);

    hsm.performKittyExchange(3, null);
    autoPlayToCompletion(hsm);

    expect(hsm.result!.isSoloOutcome).toBe(true);
    expect(hsm.result!.partnerSeat).toBeNull();
    expect(hsm.result!.ledger.reduce((sum, e) => sum + e.delta, 0)).toBe(0);
  });
});

describe("HandStateMachine — tip sub-method", () => {
  it("reveals kitty cards until the declarer stops, then still runs the normal kitty exchange", () => {
    const hsm = new HandStateMachine(0);
    const { hands, kitty } = sequentialDeal();
    forceDeal(hsm, hands, kitty);

    bidAllPassExcept(hsm, 0, 1, "ten_plus");
    hsm.declareContract({
      contractCode: "ten_plus",
      subMethod: "tip",
      partnerCard: { rank: "A", suit: "diamonds" },
    });

    expect(hsm.phase).toBe("trump_resolution");
    expect(hsm.kittyRevealState).toBeDefined();

    const revealed = hsm.revealNextTipCard();
    expect(hsm.kittyRevealState!.revealed).toEqual([revealed]);

    if (revealed.kind === "standard") {
      hsm.stopTipReveal(hsm.declarerSeat!);
      expect(hsm.trumpSuit).toBe(revealed.suit);
    } else {
      hsm.revealNextTipCard();
      hsm.revealNextTipCard();
    }

    expect(hsm.phase).toBe("kitty_exchange");
    hsm.performKittyExchange(hsm.turnSeat!, null);
    autoPlayToCompletion(hsm);
    expect(hsm.result!.ledger.reduce((sum, e) => sum + e.delta, 0)).toBe(0);
  });
});

describe("HandStateMachine — half sub-method", () => {
  it("partner reveals immediately and picks trump themselves", () => {
    const hsm = new HandStateMachine(0);
    const { hands, kitty } = sequentialDeal();
    forceDeal(hsm, hands, kitty);

    bidAllPassExcept(hsm, 0, 1, "nine_plus");
    hsm.declareContract({
      contractCode: "nine_plus",
      subMethod: "half",
      partnerCard: { rank: "A", suit: "clubs" },
    });

    expect(hsm.phase).toBe("trump_resolution");
    const actor = hsm.turnSeat!;
    if (hsm.partnerResolution?.status === "solo") {
      expect(actor).toBe(hsm.declarerSeat);
    } else {
      expect(hsm.partnerResolution?.status).toBe("revealed");
      expect(actor).toBe((hsm.partnerResolution as any).partnerSeat);
    }

    hsm.choosePartnerTrump(actor, "spades");
    expect(hsm.trumpSuit).toBe("spades");
    expect(hsm.phase).toBe("kitty_exchange");

    hsm.performKittyExchange(hsm.turnSeat!, null);
    autoPlayToCompletion(hsm);
    expect(hsm.result!.ledger.reduce((sum, e) => sum + e.delta, 0)).toBe(0);
  });
});

describe("HandStateMachine — all-pass redeal", () => {
  it("marks the hand all_passed without a declarer", () => {
    const hsm = new HandStateMachine(0);
    hsm.placeBid(1, null);
    hsm.placeBid(2, null);
    hsm.placeBid(3, null);
    hsm.placeBid(0, null);
    expect(hsm.phase).toBe("all_passed");
    expect(hsm.declarerSeat).toBeUndefined();
  });
});
