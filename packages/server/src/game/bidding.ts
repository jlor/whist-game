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
  highBid: {
    seat: SeatIndex;
    contractCode: ContractCode;
    subMethod?: SubMethodCode;
    ladderRank: number;
  } | null;
  bids: BidRecord[];
  passesInRow: number;
  isComplete: boolean;
  allPassed: boolean;
  winner: { seat: SeatIndex; contractCode: ContractCode; subMethod?: SubMethodCode } | null;
}

function nextSeat(seat: SeatIndex): SeatIndex {
  return (((seat + 1) % 4) as SeatIndex);
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
    highBid: null,
    bids: [],
    passesInRow: 0,
    isComplete: false,
    allPassed: false,
    winner: null,
  };
}

export class IllegalBidError extends Error {}

/**
 * A bid at a `submethod_only` tier (8+, 9+, 10+, 11+, 12+, 13+) must name
 * one of the 4 sub-methods. Sub-methods have NO order among themselves: a
 * bid at the SAME tier as the current high bid is legal as long as its
 * sub-method differs from the current one — this can cycle indefinitely
 * among up to 4 players/sub-methods until someone escalates to a strictly
 * higher tier or the table passes it out. A bid at any other tier follows
 * the normal strictly-ascending rule.
 */
export function placeBid(
  state: BiddingState,
  seat: SeatIndex,
  contractCode: ContractCode | null,
  subMethod?: SubMethodCode
): BiddingState {
  if (state.isComplete) throw new IllegalBidError("bidding is already complete");
  if (seat !== state.turnSeat) throw new IllegalBidError("not this seat's turn");

  const bids = [...state.bids, { seat, contractCode, subMethod }];

  if (contractCode === null) {
    const passesInRow = state.passesInRow + 1;

    if (state.highBid === null && passesInRow === 4) {
      return { ...state, bids, passesInRow, isComplete: true, allPassed: true };
    }
    if (state.highBid !== null && passesInRow === 3) {
      return {
        ...state,
        bids,
        passesInRow,
        isComplete: true,
        winner: {
          seat: state.highBid.seat,
          contractCode: state.highBid.contractCode,
          subMethod: state.highBid.subMethod,
        },
      };
    }
    return { ...state, bids, passesInRow, turnSeat: nextSeat(seat) };
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
      if (subMethod === state.highBid.subMethod) {
        throw new IllegalBidError("must name a different sub-method than the current high bid");
      }
    }
  }

  return {
    ...state,
    bids,
    passesInRow: 0,
    highBid: { seat, contractCode, subMethod, ladderRank: contract.ladderRank },
    turnSeat: nextSeat(seat),
  };
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
