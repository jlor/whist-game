import { describe, expect, it } from "vitest";
import { checkWinCondition, scoreHand } from "../../src/game/scoring.js";

function sumDeltas(entries: { delta: number }[]): number {
  return entries.reduce((sum, e) => sum + e.delta, 0);
}

describe("checkWinCondition", () => {
  it("at_least", () => {
    expect(checkWinCondition({ type: "at_least", tricks: 9 }, 9)).toBe(true);
    expect(checkWinCondition({ type: "at_least", tricks: 9 }, 8)).toBe(false);
    expect(checkWinCondition({ type: "at_least", tricks: 9 }, 13)).toBe(true);
  });
  it("at_most", () => {
    expect(checkWinCondition({ type: "at_most", tricks: 1 }, 0)).toBe(true);
    expect(checkWinCondition({ type: "at_most", tricks: 1 }, 1)).toBe(true);
    expect(checkWinCondition({ type: "at_most", tricks: 1 }, 2)).toBe(false);
  });
  it("exact", () => {
    expect(checkWinCondition({ type: "exact", tricks: 0 }, 0)).toBe(true);
    expect(checkWinCondition({ type: "exact", tricks: 0 }, 1)).toBe(false);
  });
});

describe("scoreHand — 2v2 partnership", () => {
  it("made: declarer + partner each +value, opponents each -value, nets to zero", () => {
    const ledger = scoreHand(8, true, false, 0, 2);
    expect(ledger).toEqual(
      expect.arrayContaining([
        { seat: 0, delta: 8, multiplier: 1 },
        { seat: 2, delta: 8, multiplier: 1 },
        { seat: 1, delta: -8, multiplier: 1 },
        { seat: 3, delta: -8, multiplier: 1 },
      ])
    );
    expect(sumDeltas(ledger)).toBe(0);
  });

  it("missed: signs flip, still nets to zero", () => {
    const ledger = scoreHand(16, false, false, 1, 3);
    expect(ledger).toEqual(
      expect.arrayContaining([
        { seat: 1, delta: -16, multiplier: 1 },
        { seat: 3, delta: -16, multiplier: 1 },
        { seat: 0, delta: 16, multiplier: 1 },
        { seat: 2, delta: 16, multiplier: 1 },
      ])
    );
    expect(sumDeltas(ledger)).toBe(0);
  });
});

describe("scoreHand — solo outcome", () => {
  it("made: lone player +3x, each of 3 opponents -1x, nets to zero", () => {
    const ledger = scoreHand(10, true, true, 0, null);
    expect(ledger).toEqual(
      expect.arrayContaining([
        { seat: 0, delta: 30, multiplier: 3 },
        { seat: 1, delta: -10, multiplier: 1 },
        { seat: 2, delta: -10, multiplier: 1 },
        { seat: 3, delta: -10, multiplier: 1 },
      ])
    );
    expect(sumDeltas(ledger)).toBe(0);
  });

  it("missed: lone player -3x, each opponent +1x, nets to zero", () => {
    const ledger = scoreHand(20, false, true, 2, null);
    expect(ledger.find((e) => e.seat === 2)).toEqual({ seat: 2, delta: -60, multiplier: 3 });
    for (const e of ledger.filter((e) => e.seat !== 2)) {
      expect(e).toEqual({ seat: e.seat, delta: 20, multiplier: 1 });
    }
    expect(sumDeltas(ledger)).toBe(0);
  });

  it("throws for a non-solo outcome with no partner seat", () => {
    expect(() => scoreHand(8, true, false, 0, null)).toThrow();
  });
});
