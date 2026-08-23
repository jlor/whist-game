import { HandStateMachine } from "./handStateMachine.js";
import type { SeatIndex } from "./bidding.js";

function nextSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

/**
 * Tracks one session (one full round: dealer starts here, session completes
 * once the dealer role has cycled back to that same seat) for a single
 * table. Owns the authoritative in-memory HandStateMachine for whichever
 * hand is currently in progress; the caller (TableRuntime) persists to the
 * DB after each phase transition and drives dealer rotation via this class.
 */
export class SessionManager {
  readonly sessionId: string;
  readonly startingDealerSeat: SeatIndex;
  private dealerSeat: SeatIndex;
  private handsCompletedThisSession = 0;
  private handNumber = 0;

  current: HandStateMachine;

  constructor(sessionId: string, startingDealerSeat: SeatIndex, bidFloorRank?: number, rng?: () => number) {
    this.sessionId = sessionId;
    this.startingDealerSeat = startingDealerSeat;
    this.dealerSeat = startingDealerSeat;
    this.handNumber = 1;
    this.current = new HandStateMachine(this.dealerSeat, rng, bidFloorRank);
  }

  /** Call after the current hand's bidding ends in an all-pass redeal. */
  redeal(bidFloorRank?: number, rng?: () => number): HandStateMachine {
    // Same dealer, no rotation, hand number does not advance in the
    // "real hands completed" sense but a fresh HandStateMachine is dealt.
    this.current = new HandStateMachine(this.dealerSeat, rng, bidFloorRank);
    return this.current;
  }

  /**
   * Call after a hand completes for real (not a redeal). Rotates the
   * dealer and deals the next hand, unless the session has completed —
   * i.e. the dealer has cycled all the way back to the starting seat.
   */
  advanceAfterCompletedHand(bidFloorRank?: number, rng?: () => number): { sessionComplete: boolean; next?: HandStateMachine } {
    this.handsCompletedThisSession++;
    const nextDealer = nextSeat(this.dealerSeat);
    if (nextDealer === this.startingDealerSeat) {
      return { sessionComplete: true };
    }
    this.dealerSeat = nextDealer;
    this.handNumber++;
    this.current = new HandStateMachine(this.dealerSeat, rng, bidFloorRank);
    return { sessionComplete: false, next: this.current };
  }

  get currentDealerSeat(): SeatIndex {
    return this.dealerSeat;
  }

  get currentHandNumber(): number {
    return this.handNumber;
  }
}
