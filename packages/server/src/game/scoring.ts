import type { WinCondition } from "@whist/shared";
import type { SeatIndex } from "./bidding.js";

export function checkWinCondition(winCondition: WinCondition, tricksTaken: number): boolean {
  switch (winCondition.type) {
    case "at_most":
      return tricksTaken <= winCondition.tricks;
    case "at_least":
      return tricksTaken >= winCondition.tricks;
    case "exact":
      return tricksTaken === winCondition.tricks;
  }
}

export interface ScoreEntry {
  seat: SeatIndex;
  delta: number;
  multiplier: number;
}

/**
 * Every hand is zero-sum. A real 2v2 partnership: declarer and partner each
 * get ±pointValue, both opponents get the mirrored ∓pointValue — sums to
 * zero. Any solo outcome (a structurally solo contract, or a partnered
 * contract that collapsed to self-partner because the named card was
 * self-held or kitty-stranded): the lone player gets ±3×pointValue, each of
 * the other 3 gets the mirrored ∓pointValue — also sums to zero.
 */
export function scoreHand(
  pointValue: number,
  made: boolean,
  isSoloOutcome: boolean,
  declarerSeat: SeatIndex,
  partnerSeat: SeatIndex | null
): ScoreEntry[] {
  const sign = made ? 1 : -1;
  const allSeats: SeatIndex[] = [0, 1, 2, 3];

  if (isSoloOutcome) {
    return allSeats.map((seat) =>
      seat === declarerSeat
        ? { seat, delta: sign * 3 * pointValue, multiplier: 3 }
        : { seat, delta: -sign * pointValue, multiplier: 1 }
    );
  }

  if (partnerSeat === null) {
    throw new Error("non-solo outcome requires a resolved partner seat");
  }
  const declarerSide = new Set<SeatIndex>([declarerSeat, partnerSeat]);
  return allSeats.map((seat) =>
    declarerSide.has(seat)
      ? { seat, delta: sign * pointValue, multiplier: 1 }
      : { seat, delta: -sign * pointValue, multiplier: 1 }
  );
}
