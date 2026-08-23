import { describe, expect, it } from "vitest";
import { decodeCard } from "@whist/shared";
import { determineTrickWinner, legalPlays, type TrickPlay } from "../../src/game/trickEngine.js";

const c = decodeCard;

describe("legalPlays", () => {
  it("no restriction when leading", () => {
    const hand = [c("AH"), c("JOKER1")];
    expect(legalPlays(hand, null)).toEqual(hand);
  });

  it("must follow suit when able — jokers never count as following", () => {
    const hand = [c("AH"), c("2H"), c("JOKER1"), c("AC")];
    const legal = legalPlays(hand, "hearts");
    expect(legal).toEqual([c("AH"), c("2H")]);
  });

  it("free choice including jokers when unable to follow suit", () => {
    const hand = [c("AC"), c("JOKER1"), c("2S")];
    const legal = legalPlays(hand, "hearts");
    expect(legal).toEqual(hand);
  });
});

describe("determineTrickWinner", () => {
  it("no trump: first joker played stands, a later joker cannot overtake it", () => {
    const plays: TrickPlay[] = [
      { seat: 0, card: c("2H") },
      { seat: 1, card: c("JOKER1") },
      { seat: 2, card: c("JOKER2") },
      { seat: 3, card: c("AH") },
    ];
    expect(determineTrickWinner(plays, null, "hearts")).toBe(1);
  });

  it("no trump: highest card of the led suit wins when no joker is played", () => {
    const plays: TrickPlay[] = [
      { seat: 0, card: c("2H") },
      { seat: 1, card: c("AH") },
      { seat: 2, card: c("KH") },
      { seat: 3, card: c("AC") }, // off-suit, cannot win
    ];
    expect(determineTrickWinner(plays, null, "hearts")).toBe(1);
  });

  it("trump present: trump beats joker beats everything else", () => {
    const plays: TrickPlay[] = [
      { seat: 0, card: c("AH") }, // led suit, high
      { seat: 1, card: c("JOKER1") },
      { seat: 2, card: c("2C") }, // trump suit is clubs
      { seat: 3, card: c("2H") },
    ];
    expect(determineTrickWinner(plays, "clubs", "hearts")).toBe(2);
  });

  it("trump present but not played: joker beats plain cards", () => {
    const plays: TrickPlay[] = [
      { seat: 0, card: c("AH") },
      { seat: 1, card: c("JOKER1") },
      { seat: 2, card: c("KH") },
      { seat: 3, card: c("2S") },
    ];
    expect(determineTrickWinner(plays, "clubs", "hearts")).toBe(1);
  });

  it("trump present, multiple trumps: highest trump rank wins (no tie possible)", () => {
    const plays: TrickPlay[] = [
      { seat: 0, card: c("2C") },
      { seat: 1, card: c("AC") },
      { seat: 2, card: c("KC") },
      { seat: 3, card: c("3C") },
    ];
    expect(determineTrickWinner(plays, "clubs", "clubs")).toBe(1);
  });
});
