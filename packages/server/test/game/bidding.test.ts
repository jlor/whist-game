import { describe, expect, it } from "vitest";
import { createBiddingState, IllegalBidError, placeBid } from "../../src/game/bidding.js";

describe("bidding auction", () => {
  it("opens with the seat to the dealer's left", () => {
    const state = createBiddingState(0);
    expect(state.turnSeat).toBe(1);
  });

  it("a bid must strictly outrank the current high bid", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, "nine_plus"); // ladderRank 2
    expect(() => placeBid(state, 2, "nine_plus")).toThrow(IllegalBidError);
    // "ten" is ladderRank 4, strictly higher than nine_plus (2) — legal.
    state = placeBid(state, 2, "ten");
    expect(state.highBid?.contractCode).toBe("ten");
  });

  it("rejects a bid below the table's bid floor", () => {
    const state = createBiddingState(0); // default floor = nine_plus (rank 2)
    expect(() => placeBid(state, 1, "sol")).toThrow(IllegalBidError); // sol is rank 1
  });

  it("rejects a bid out of turn", () => {
    const state = createBiddingState(0);
    expect(() => placeBid(state, 2, "nine_plus")).toThrow(IllegalBidError);
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
    state = placeBid(state, 1, "nine_plus");
    state = placeBid(state, 2, null);
    state = placeBid(state, 3, null);
    state = placeBid(state, 0, null);
    expect(state.isComplete).toBe(true);
    expect(state.allPassed).toBe(false);
    expect(state.winner).toEqual({ seat: 1, contractCode: "nine_plus" });
  });

  it("a later higher bid resets the passesInRow counter", () => {
    let state = createBiddingState(0);
    state = placeBid(state, 1, "nine_plus");
    state = placeBid(state, 2, null);
    state = placeBid(state, 3, "ten"); // outbids, resets passes
    state = placeBid(state, 0, null);
    state = placeBid(state, 1, null);
    expect(state.isComplete).toBe(false); // only 2 passes since the "ten" bid
    state = placeBid(state, 2, null);
    expect(state.isComplete).toBe(true);
    expect(state.winner).toEqual({ seat: 3, contractCode: "ten" });
  });
});
