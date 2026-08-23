import {
  CONTRACT_LADDER,
  DEFAULT_BID_FLOOR_RANK,
  getContract,
  type ContractCode,
  type SubMethodCode,
} from "@whist/shared";

export type SeatIndex = 0 | 1 | 2 | 3;

export interface BidRecord {
  seat: SeatIndex;
  contractCode: ContractCode | null; // null = pass
  subMethod?: SubMethodCode;
}

export interface BiddingState {
  dealerSeat: SeatIndex;
  bidFloorRank: number;
  turnSeat: SeatIndex;
  /** Once a seat passes it's permanently out of this auction — passing is
   * not "yielding the floor," it's dropping out entirely. Indexed by seat. */
  passed: [boolean, boolean, boolean, boolean];
  highBid: {
    seat: SeatIndex;
    contractCode: ContractCode;
    subMethod?: SubMethodCode;
    ladderRank: number;
  } | null;
  bids: BidRecord[];
  isComplete: boolean;
  allPassed: boolean;
  winner: { seat: SeatIndex; contractCode: ContractCode; subMethod?: SubMethodCode } | null;
}

function nextSeat(seat: SeatIndex): SeatIndex {
  return (((seat + 1) % 4) as SeatIndex);
}

function nextActiveSeat(fromSeat: SeatIndex, passed: readonly boolean[]): SeatIndex {
  let seat = nextSeat(fromSeat);
  let guard = 0;
  while (passed[seat]) {
    seat = nextSeat(seat);
    if (++guard > 4) throw new Error("no active seats remain");
  }
  return seat;
}

function activeCount(passed: readonly boolean[]): number {
  return passed.filter((p) => !p).length;
}

/** Which sub-methods have already been named at this tier during this
 * auction — once used, a sub-method can never be picked again at that tier
 * for the rest of the auction, by anyone, even after another sub-method has
 * since taken over the high bid. */
function usedSubMethodsAtTier(bids: readonly BidRecord[], contractCode: ContractCode): Set<SubMethodCode> {
  const used = new Set<SubMethodCode>();
  for (const bid of bids) {
    if (bid.contractCode === contractCode && bid.subMethod) used.add(bid.subMethod);
  }
  return used;
}

/** Bidding always opens with the seat to the dealer's left. */
export function createBiddingState(
  dealerSeat: SeatIndex,
  bidFloorRank: number = DEFAULT_BID_FLOOR_RANK
): BiddingState {
  return {
    dealerSeat,
    bidFloorRank,
    turnSeat: nextSeat(dealerSeat),
    passed: [false, false, false, false],
    highBid: null,
    bids: [],
    isComplete: false,
    allPassed: false,
    winner: null,
  };
}

export class IllegalBidError extends Error {}

/**
 * A bid at a `submethod_only` tier (8+, 9+, 10+, 11+, 12+, 13+) must name
 * one of the 4 sub-methods. Sub-methods have NO order among themselves, but
 * each can only be used ONCE per tier per auction: a bid at the SAME tier
 * as the current high bid is legal only if its sub-method hasn't already
 * been named at that tier this auction (by anyone, at any point) — once all
 * 4 are exhausted at a tier, the only options left are escalating to a
 * strictly higher tier or passing.
 *
 * Passing is permanent: a seat that passes is out of the auction entirely
 * and never gets another turn. The auction ends the instant only one active
 * seat remains — immediately if they already hold the high bid (no one is
 * left to challenge them), or via a redeal if nobody ever bid.
 */
export function placeBid(
  state: BiddingState,
  seat: SeatIndex,
  contractCode: ContractCode | null,
  subMethod?: SubMethodCode
): BiddingState {
  if (state.isComplete) throw new IllegalBidError("bidding is already complete");
  if (seat !== state.turnSeat) throw new IllegalBidError("not this seat's turn");
  if (state.passed[seat]) throw new IllegalBidError("this seat has already passed and is out of the auction");

  const bids = [...state.bids, { seat, contractCode, subMethod }];

  if (contractCode === null) {
    const passed = [...state.passed] as [boolean, boolean, boolean, boolean];
    passed[seat] = true;

    if (activeCount(passed) === 0) {
      return { ...state, bids, passed, isComplete: true, allPassed: true };
    }
    if (activeCount(passed) === 1 && state.highBid !== null) {
      return {
        ...state,
        bids,
        passed,
        isComplete: true,
        winner: {
          seat: state.highBid.seat,
          contractCode: state.highBid.contractCode,
          subMethod: state.highBid.subMethod,
        },
      };
    }
    return { ...state, bids, passed, turnSeat: nextActiveSeat(seat, passed) };
  }

  const contract = getContract(contractCode);
  if (contract.trumpMode === "submethod_only" && !subMethod) {
    throw new IllegalBidError(`${contractCode} requires naming a sub-method (sans/half/tip/strong)`);
  }
  if (contract.trumpMode !== "submethod_only" && subMethod) {
    throw new IllegalBidError(`${contractCode} does not take a sub-method`);
  }
  if (contract.ladderRank < state.bidFloorRank) {
    throw new IllegalBidError(`${contractCode} is below the table's bid floor`);
  }

  if (state.highBid !== null) {
    if (contract.ladderRank < state.highBid.ladderRank) {
      throw new IllegalBidError(`${contractCode} does not outrank the current high bid`);
    }
    if (contract.ladderRank === state.highBid.ladderRank) {
      const sameTierSameContract = contract.code === state.highBid.contractCode;
      if (!sameTierSameContract || contract.trumpMode !== "submethod_only") {
        throw new IllegalBidError(`${contractCode} does not outrank the current high bid`);
      }
      if (usedSubMethodsAtTier(state.bids, contractCode).has(subMethod!)) {
        throw new IllegalBidError("that sub-method has already been used at this tier this auction");
      }
    }
  }

  const highBid = { seat, contractCode, subMethod, ladderRank: contract.ladderRank };

  if (activeCount(state.passed) === 1) {
    // Last active seat — no one left to challenge, the auction ends right here.
    return { ...state, bids, highBid, isComplete: true, winner: { seat, contractCode, subMethod } };
  }

  return { ...state, bids, highBid, turnSeat: nextActiveSeat(seat, state.passed) };
}

/** Sanity check used by tests: the ladder's ranks are a strict 1..N sequence. */
export function assertLadderIsStrictlyAscending(): void {
  const ranks = CONTRACT_LADDER.map((c) => c.ladderRank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      throw new Error("CONTRACT_LADDER ladderRank values are not a strict 1..N sequence");
    }
  }
}
