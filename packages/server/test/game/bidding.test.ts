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
    expect(() => placeBid(state, 2, "nine_plus", "sans")).toThrow(IllegalBidError); // same tier, same sub-method
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

  it("3 passes in a row after a bid ends the auction with that bidder winning", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, "nine_plus", "sans");
    state = placeBid(state, 2, null);
    state = placeBid(state, 3, null);
    state = placeBid(state, 0, null);
    expect(state.isComplete).toBe(true);
    expect(state.allPassed).toBe(false);
    expect(state.winner).toEqual({ seat: 1, contractCode: "nine_plus", subMethod: "sans" });
  });

  it("a later higher bid resets the passesInRow counter", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, "nine_plus", "sans");
    state = placeBid(state, 2, null);
    state = placeBid(state, 3, "ten"); // outbids, resets passes
    state = placeBid(state, 0, null);
    state = placeBid(state, 1, null);
    expect(state.isComplete).toBe(false); // only 2 passes since the "ten" bid
    state = placeBid(state, 2, null);
    expect(state.isComplete).toBe(true);
    expect(state.winner).toEqual({ seat: 3, contractCode: "ten", subMethod: undefined });
  });

  describe("same-tier sub-method cycling (no order among sans/half/tip/strong)", () => {
    it("a different sub-method at the same tier outranks the current one", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, "nine_plus", "half"); // legal: differs from sans
      expect(state.highBid).toEqual({ seat: 2, contractCode: "nine_plus", subMethod: "half", ladderRank: 5 });
    });

    it("naming the same sub-method as the current high bid is rejected", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      expect(() => placeBid(state, 2, "nine_plus", "sans")).toThrow(IllegalBidError);
    });

    it("cycling can go all the way around the table more than once", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, "nine_plus", "half");
      state = placeBid(state, 3, "nine_plus", "strong");
      state = placeBid(state, 0, "nine_plus", "tip");
      // back to seat 1 — reusing "sans" again is legal since it only needs
      // to differ from the CURRENT high bid (tip), not from history.
      state = placeBid(state, 1, "nine_plus", "sans");
      expect(state.highBid?.seat).toBe(1);
      expect(state.highBid?.subMethod).toBe("sans");
    });

    it("jumping to the next trick tier is always legal regardless of sub-method history", () => {
      let state = createBiddingState(0);
      state = placeBid(state, 1, "nine_plus", "sans");
      state = placeBid(state, 2, "ten"); // escalates past the whole 9+ tier
      expect(state.highBid?.contractCode).toBe("ten");
    });
  });
});
