import { describe, expect, it } from "vitest";
import { decodeCard, type Card } from "@whist/shared";
import { eligiblePartnerCardRanks, resolvePartnerCard } from "../../src/game/partnerCard.js";

const c = decodeCard;

function emptyHands(): [Card[], Card[], Card[], Card[]] {
  return [[], [], [], []];
}

describe("resolvePartnerCard", () => {
  it("named card in an opponent's hand yields a secret partner by default", () => {
    const hands = emptyHands();
    hands[2] = [c("AH")];
    const res = resolvePartnerCard(0, { rank: "A", suit: "hearts" }, hands, [], false);
    expect(res).toEqual({ status: "secret", partnerSeat: 2 });
  });

  it("named card in an opponent's hand yields an immediately-revealed partner under `half`", () => {
    const hands = emptyHands();
    hands[3] = [c("AH")];
    const res = resolvePartnerCard(0, { rank: "A", suit: "hearts" }, hands, [], true);
    expect(res).toEqual({ status: "revealed", partnerSeat: 3 });
  });

  it("named card in the declarer's own hand yields solo", () => {
    const hands = emptyHands();
    hands[0] = [c("AH")];
    const res = resolvePartnerCard(0, { rank: "A", suit: "hearts" }, hands, [], false);
    expect(res).toEqual({ status: "solo" });
  });

  it("named card stranded in the kitty yields solo", () => {
    const hands = emptyHands();
    const res = resolvePartnerCard(0, { rank: "A", suit: "hearts" }, hands, [c("AH")], false);
    expect(res).toEqual({ status: "solo" });
  });

  it("throws if the named card is nowhere (deal invariant violated)", () => {
    const hands = emptyHands();
    expect(() => resolvePartnerCard(0, { rank: "A", suit: "hearts" }, hands, [], false)).toThrow();
  });
});

describe("eligiblePartnerCardRanks (Ace -> King -> Queen -> Jack cascade)", () => {
  it("only Ace is eligible by default", () => {
    expect(eligiblePartnerCardRanks([c("2H"), c("KC")])).toEqual(["A"]);
  });

  it("holding all 4 aces unlocks King as an option", () => {
    const hand = [c("AC"), c("AD"), c("AH"), c("AS")];
    expect(eligiblePartnerCardRanks(hand)).toEqual(["A", "K"]);
  });

  it("holding all 4 aces and kings unlocks Queen", () => {
    const hand = [c("AC"), c("AD"), c("AH"), c("AS"), c("KC"), c("KD"), c("KH"), c("KS")];
    expect(eligiblePartnerCardRanks(hand)).toEqual(["A", "K", "Q"]);
  });

  it("holding all 4 aces, kings and queens unlocks Jack", () => {
    const hand = [
      c("AC"), c("AD"), c("AH"), c("AS"),
      c("KC"), c("KD"), c("KH"), c("KS"),
      c("QC"), c("QD"), c("QH"), c("QS"),
    ];
    expect(eligiblePartnerCardRanks(hand)).toEqual(["A", "K", "Q", "J"]);
  });

  it("naming Ace is still legal even while holding all 4 aces — cascade is optional, not mandatory", () => {
    const hands = emptyHands();
    hands[0] = [c("AC"), c("AD"), c("AH"), c("AS")];
    const eligible = eligiblePartnerCardRanks(hands[0]);
    expect(eligible).toContain("A");
    // Declarer chooses to name an Ace anyway -> guaranteed self-partner/solo.
    const res = resolvePartnerCard(0, { rank: "A", suit: "clubs" }, hands, [], false);
    expect(res).toEqual({ status: "solo" });
  });
});
