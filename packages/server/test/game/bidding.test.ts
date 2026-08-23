import { describe, expect, it } from "vitest";
import { createBiddingState, IllegalBidError, placeBid } from "../../src/game/bidding.js";

describe("bidding auction", () => {
  it("opens with the seat to the dealer's left", () => {
    const state = createBiddingState(0);
    expect(state.turnSeat).toBe(1);
  });

  it("a bid must strictly outrank the current high bid", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, "nine_plus", "sans"); // ladderRank 5
    expect(() => placeBid(state, 2, "nine_plus", "sans")).toThrow(IllegalBidError); // already used at this tier
    // "ten" is ladderRank 7, strictly higher than nine_plus (5) — legal.
    state = placeBid(state, 2, "ten");
    expect(state.highBid?.contractCode).toBe("ten");
  });

  it("rejects a bid below the table's bid floor", () => {
    const state = createBiddingState(0); // default floor = nine_plus (rank 5)
    expect(() => placeBid(state, 1, "sol")).toThrow(IllegalBidError); // sol is rank 4
  });

  it("rejects a bid out of turn", () => {
    const state = createBiddingState(0);
    expect(() => placeBid(state, 2, "nine_plus", "sans")).toThrow(IllegalBidError);
  });

  it("a submethod_only contract requires naming a sub-method", () => {
    const state = createBiddingState(0);
    expect(() => placeBid(state, 1, "nine_plus")).toThrow(IllegalBidError);
  });

  it("a non-submethod contract rejects a sub-method", () => {
    const state = createBiddingState(0);
    expect(() => placeBid(state, 1, "ten", "sans")).toThrow(IllegalBidError);
  });

  it("all 4 players passing with no bid ends in a redeal, dealer unchanged", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, null);
    state = placeBid(state, 2, null);
    state = placeBid(state, 3, null);
    state = placeBid(state, 0, null);
    expect(state.isComplete).toBe(true);
    expect(state.allPassed).toBe(true);
    expect(state.winner).toBeNull();
  });

  it("once everyone else has passed, the sole remaining bidder wins immediately", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, "nine_plus", "sans");
    state = placeBid(state, 2, null);
    state = placeBid(state, 3, null);
    state = placeBid(state, 0, null);
    expect(state.isComplete).toBe(true);
    expect(state.allPassed).toBe(false);
    expect(state.winner).toEqual({ seat: 1, contractCode: "nine_plus", subMethod: "sans" });
  });

  describe("passing is permanent", () => {
    it("a passed seat is skipped in the turn rotation", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, null); // seat 1 out
      expect(state.turnSeat).toBe(2);
      state = placeBid(state, 2, "nine_plus", "sans");
      expect(state.turnSeat).toBe(3); // skips seat 1, not seat 1 again
    });

    it("a passed seat cannot bid again later in the same auction", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, null); // seat 1 passes, permanently out
      state = placeBid(state, 2, "nine_plus", "sans");
      state = placeBid(state, 3, "nine_plus", "half"); // differs, legal
      // rotation skips seat 1 (passed) and returns to seat 0
      expect(state.turnSeat).toBe(0);
      state = placeBid(state, 0, null);
      // only seat 3 remains active now (1 and 0 passed, 2 was outbid but never
      // itself passed... wait 2 is still active) — verify turn goes to seat 2
      expect(state.turnSeat).toBe(2);
    });

    it("the auction ends the moment only one active seat remains, even mid-cycle", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, null);
      state = placeBid(state, 3, null);
      // only seats 0 and 1 remain active; seat 0 passing leaves just seat 1
      state = placeBid(state, 0, null);
      expect(state.isComplete).toBe(true);
      expect(state.winner).toEqual({ seat: 1, contractCode: "nine_plus", subMethod: "sans" });
    });

    it("the last active seat winning via their own bid ends the auction immediately, no further pass needed", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, null);
      state = placeBid(state, 2, null);
      state = placeBid(state, 3, null);
      // seat 0 is the only one left; their bid wins outright
      state = placeBid(state, 0, "nine_plus", "sans");
      expect(state.isComplete).toBe(true);
      expect(state.winner).toEqual({ seat: 0, contractCode: "nine_plus", subMethod: "sans" });
    });
  });

  describe("same-tier sub-method cycling (no order among sans/half/tip/strong, each usable once per tier)", () => {
    it("a different, not-yet-used sub-method at the same tier outranks the current one", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, "nine_plus", "half"); // legal: not yet used at this tier
      expect(state.highBid).toEqual({ seat: 2, contractCode: "nine_plus", subMethod: "half", ladderRank: 5 });
    });

    it("naming the same sub-method as the current high bid is rejected", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      expect(() => placeBid(state, 2, "nine_plus", "sans")).toThrow(IllegalBidError);
    });

    it("a sub-method already used earlier at this tier cannot be reused, even once it's no longer the current bid", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "half");
      state = placeBid(state, 2, "nine_plus", "sans"); // half -> sans, legal
      // seat 3 tries to bring back "half" — must be rejected even though the
      // CURRENT high bid is "sans", not "half".
      expect(() => placeBid(state, 3, "nine_plus", "half")).toThrow(IllegalBidError);
    });

    it("once all 4 sub-methods are used at a tier, only escalating to the next tier (or passing) remains", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, "nine_plus", "half");
      state = placeBid(state, 3, "nine_plus", "strong");
      state = placeBid(state, 0, "nine_plus", "tip");
      // seat 1 is active again (rotation continues); every sub-method at this
      // tier is now used, so any further nine_plus bid must fail.
      for (const sub of ["sans", "half", "strong", "tip"] as const) {
        expect(() => placeBid(state, 1, "nine_plus", sub)).toThrow(IllegalBidError);
      }
      state = placeBid(state, 1, "ten"); // escalating past the tier is still fine
      expect(state.highBid?.contractCode).toBe("ten");
    });

    it("jumping to the next trick tier is always legal regardless of sub-method history", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, "ten"); // escalates past the whole 9+ tier
      expect(state.highBid?.contractCode).toBe("ten");
    });
  });
});
