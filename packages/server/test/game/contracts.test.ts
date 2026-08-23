import { describe, expect, it } from "vitest";
import { CONTRACT_LADDER } from "@whist/shared";
import { assertLadderIsStrictlyAscending } from "../../src/game/bidding.js";

describe("CONTRACT_LADDER", () => {
  it("has exactly the 16 house-rule contracts", () => {
    expect(CONTRACT_LADDER).toHaveLength(16);
    const codes = CONTRACT_LADDER.map((c) => c.code).sort();
    expect(codes).toEqual(
      [
        "eight",
        "eight_plus",
        "nine",
        "sol",
        "nine_plus",
        "ren_sol",
        "ten",
        "ten_plus",
        "eleven",
        "eleven_plus",
        "twelve",
        "twelve_plus",
        "thirteen",
        "thirteen_plus",
        "halv_bordlaegger",
        "bordlaegger",
      ].sort()
    );
  });

  it("ladderRank forms a strict ascending 1..16 sequence", () => {
    expect(() => assertLadderIsStrictlyAscending()).not.toThrow();
  });

  it("point values match the confirmed table", () => {
    const byCode = Object.fromEntries(CONTRACT_LADDER.map((c) => [c.code, c.pointValue]));
    expect(byCode).toEqual({
      eight: 2,
      eight_plus: 4,
      nine: 4,
      sol: 10,
      nine_plus: 8,
      ren_sol: 20,
      ten: 8,
      ten_plus: 16,
      eleven: 16,
      eleven_plus: 32,
      twelve: 32,
      twelve_plus: 64,
      thirteen: 64,
      thirteen_plus: 128,
      halv_bordlaegger: 40,
      bordlaegger: 80,
    });
  });

  it("only submethod_only contracts require a sub-method", () => {
    for (const c of CONTRACT_LADDER) {
      if (c.trumpMode === "submethod_only") {
        expect(c.kittyExchange).toBe("submethod_defined");
      } else {
        expect(c.kittyExchange).toBe("declarer");
      }
    }
  });

  it("solo contracts never use the partner-card mechanic", () => {
    const soloCodes = CONTRACT_LADDER.filter((c) => c.isSolo).map((c) => c.code);
    expect(soloCodes.sort()).toEqual(["bordlaegger", "halv_bordlaegger", "ren_sol", "sol"].sort());
  });

  it("the ladder order is: 8 < 8+ < 9 < Sol < 9+ < Ren sol < 10 < 10+ < 11 < 11+ < 12 < 12+ < 13 < 13+ < Halv bordlægger < Bordlægger", () => {
    const order = [...CONTRACT_LADDER].sort((a, b) => a.ladderRank - b.ladderRank).map((c) => c.code);
    expect(order).toEqual([
      "eight",
      "eight_plus",
      "nine",
      "sol",
      "nine_plus",
      "ren_sol",
      "ten",
      "ten_plus",
      "eleven",
      "eleven_plus",
      "twelve",
      "twelve_plus",
      "thirteen",
      "thirteen_plus",
      "halv_bordlaegger",
      "bordlaegger",
    ]);
  });
});
