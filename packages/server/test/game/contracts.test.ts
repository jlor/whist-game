import { describe, expect, it } from "vitest";
import { CONTRACT_LADDER } from "@whist/shared";
import { assertLadderIsStrictlyAscending } from "../../src/game/bidding.js";

describe("CONTRACT_LADDER", () => {
  it("has exactly the 13 house-rule contracts", () => {
    expect(CONTRACT_LADDER).toHaveLength(13);
    const codes = CONTRACT_LADDER.map((c) => c.code).sort();
    expect(codes).toEqual(
      [
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

  it("ladderRank forms a strict ascending 1..13 sequence", () => {
    expect(() => assertLadderIsStrictlyAscending()).not.toThrow();
  });

  it("point values match the confirmed table", () => {
    const byCode = Object.fromEntries(CONTRACT_LADDER.map((c) => [c.code, c.pointValue]));
    expect(byCode).toEqual({
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
});
