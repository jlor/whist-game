import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { encodeCard, type Card } from "@whist/shared";
import { db } from "../../db/client.js";
import {
  bids,
  handContracts,
  hands,
  kittyExchanges,
  kittyReveals,
  plays,
  scoreLedger,
  sessions,
  tricks,
} from "../../db/schema.js";
import type { ScoreEntry } from "../../game/scoring.js";
import type { SeatIndex } from "../../game/bidding.js";

export function createSession(tableId: string, startingDealerSeat: SeatIndex): string {
  const id = nanoid();
  db.insert(sessions).values({ id, tableId, startingDealerSeat }).run();
  return id;
}

export function markSessionComplete(sessionId: string): void {
  db.update(sessions)
    .set({ status: "completed", endedAt: new Date().toISOString() })
    .where(eq(sessions.id, sessionId))
    .run();
}

export function createHandRecord(
  sessionId: string,
  handNumber: number,
  dealerSeat: SeatIndex,
  kitty: Card[],
  redealtFromHandId: string | null
): string {
  const id = nanoid();
  db.insert(hands)
    .values({
      id,
      sessionId,
      handNumber,
      dealerSeat,
      kittyCards: kitty.map(encodeCard),
      redealtFromHandId,
    })
    .run();
  return id;
}

export function markHandRedealt(handId: string): void {
  db.update(hands).set({ status: "redealt" }).where(eq(hands.id, handId)).run();
}

export function markHandComplete(handId: string): void {
  db.update(hands).set({ status: "complete" }).where(eq(hands.id, handId)).run();
}

export function recordBid(
  handId: string,
  seat: SeatIndex,
  bidOrder: number,
  contractCode: string | null
): void {
  db.insert(bids)
    .values({ id: nanoid(), handId, seat, bidOrder, contractCode, isPass: contractCode === null })
    .run();
}

export function recordContractResult(
  handId: string,
  input: {
    contractCode: string;
    subMethod?: string;
    declarerSeat: SeatIndex;
    namedPartnerCardRank?: string;
    namedPartnerCardSuit?: string;
    trumpSuit?: string | null;
    partnerSeat: SeatIndex | null;
    selfPartner: boolean;
    pointValueApplied: number;
    multiplierApplied: number;
    success: boolean;
    tricksTaken: number;
  }
): void {
  db.insert(handContracts)
    .values({
      handId,
      contractCode: input.contractCode,
      subMethod: input.subMethod,
      declarerSeat: input.declarerSeat,
      namedPartnerCardRank: input.namedPartnerCardRank,
      namedPartnerCardSuit: input.namedPartnerCardSuit,
      trumpSuit: input.trumpSuit ?? null,
      partnerSeat: input.partnerSeat,
      selfPartner: input.selfPartner,
      pointValueApplied: input.pointValueApplied,
      multiplierApplied: input.multiplierApplied,
      success: input.success,
      tricksTaken: input.tricksTaken,
    })
    .run();
}

export function recordKittyReveal(handId: string, order: number, card: Card, stoppedHere: boolean): void {
  db.insert(kittyReveals)
    .values({ id: nanoid(), handId, revealOrder: order, card: encodeCard(card), stoppedHere })
    .run();
}

export function recordKittyExchange(
  handId: string,
  performedBySeat: SeatIndex,
  exchanged: boolean,
  cardsOut: Card[],
  cardsIn: Card[]
): void {
  db.insert(kittyExchanges)
    .values({
      handId,
      performedBySeat,
      exchanged,
      cardsSwappedOut: cardsOut.map(encodeCard),
      cardsSwappedIn: cardsIn.map(encodeCard),
    })
    .run();
}

export function recordTrick(
  handId: string,
  trickNumber: number,
  leaderSeat: SeatIndex,
  winnerSeat: SeatIndex,
  trickPlays: { seat: SeatIndex; card: Card }[]
): void {
  const trickId = nanoid();
  db.insert(tricks).values({ id: trickId, handId, trickNumber, leaderSeat, winnerSeat }).run();
  trickPlays.forEach((p, i) => {
    db.insert(plays)
      .values({ id: nanoid(), trickId, seat: p.seat, card: encodeCard(p.card), playOrder: i })
      .run();
  });
}

/** Applies a hand's ledger entries and returns each seat's new running total for the session. */
export function recordScoreLedger(
  sessionId: string,
  handId: string,
  seatToUserId: Record<SeatIndex, string>,
  entries: ScoreEntry[]
): Record<SeatIndex, number> {
  const totals: Record<SeatIndex, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const entry of entries) {
    const userId = seatToUserId[entry.seat];
    const priorTotal = getRunningTotal(sessionId, userId);
    const newTotal = priorTotal + entry.delta;
    db.insert(scoreLedger)
      .values({
        id: nanoid(),
        handId,
        userId,
        seat: entry.seat,
        pointsDelta: entry.delta,
        multiplier: entry.multiplier,
        runningTotalAfter: newTotal,
      })
      .run();
    totals[entry.seat] = newTotal;
  }
  return totals;
}

function getRunningTotal(sessionId: string, userId: string): number {
  const row = db
    .select({ total: sql<number>`COALESCE(SUM(${scoreLedger.pointsDelta}), 0)` })
    .from(scoreLedger)
    .innerJoin(hands, eq(hands.id, scoreLedger.handId))
    .where(sql`${hands.sessionId} = ${sessionId} AND ${scoreLedger.userId} = ${userId}`)
    .get();
  return row?.total ?? 0;
}

export function getSessionHands(sessionId: string) {
  return db.select().from(hands).where(eq(hands.sessionId, sessionId)).all();
}

export function getHandDetail(handId: string) {
  const hand = db.select().from(hands).where(eq(hands.id, handId)).get();
  const contract = db.select().from(handContracts).where(eq(handContracts.handId, handId)).get();
  const bidHistory = db.select().from(bids).where(eq(bids.handId, handId)).all();
  const handTricks = db.select().from(tricks).where(eq(tricks.handId, handId)).all();
  const ledger = db.select().from(scoreLedger).where(eq(scoreLedger.handId, handId)).all();
  return { hand, contract, bids: bidHistory, tricks: handTricks, ledger };
}
