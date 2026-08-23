import type { Server } from "socket.io";
import { CONTRACT_LADDER, encodeCard, getContract, type Card, type Suit } from "@whist/shared";
import { HandStateMachine, IllegalActionError, type DeclareContractInput } from "../game/handStateMachine.js";
import type { SeatIndex } from "../game/bidding.js";
import { SessionManager } from "../game/sessionManager.js";
import {
  createHandRecord,
  createSession,
  markHandComplete,
  markHandRedealt,
  markSessionComplete,
  recordBid,
  recordContractResult,
  recordKittyExchange,
  recordKittyReveal,
  recordScoreLedger,
  recordTrick,
} from "../persistence/repositories/hands.js";
import { setBidFloorRank, setSeat, setTableStatus, type TableRecord } from "../persistence/repositories/tables.js";
import { findUserById } from "../persistence/repositories/users.js";

interface SeatOccupant {
  userId: string;
  displayName: string;
  socketId: string | null;
}

const ALL_SEATS: SeatIndex[] = [0, 1, 2, 3];

export class TableRuntime {
  readonly table: TableRecord;
  readonly io: Server;
  seats: (SeatOccupant | null)[] = [null, null, null, null];
  status: "lobby" | "active" | "finished" = "lobby";
  session?: SessionManager;
  private bidOrder = 0;

  constructor(io: Server, table: TableRecord) {
    this.io = io;
    this.table = table;
  }

  private room(): string {
    return `table:${this.table.id}`;
  }

  seatedCount(): number {
    return this.seats.filter((s) => s !== null).length;
  }

  seatIndexForUser(userId: string): SeatIndex | null {
    const idx = this.seats.findIndex((s) => s?.userId === userId);
    return idx === -1 ? null : (idx as SeatIndex);
  }

  takeSeat(userId: string, seatIndex: SeatIndex, socketId: string): void {
    if (this.status !== "lobby") throw new IllegalActionError("table is not in the lobby phase");
    if (this.seats[seatIndex] !== null) throw new IllegalActionError("seat already taken");
    if (this.seatIndexForUser(userId) !== null) throw new IllegalActionError("already seated");
    const user = findUserById(userId);
    if (!user) throw new IllegalActionError("unknown user");
    this.seats[seatIndex] = { userId, displayName: user.displayName, socketId };
    setSeat(this.table.id, seatIndex, userId);
    this.broadcastTableState();
  }

  leaveSeat(userId: string): void {
    const idx = this.seatIndexForUser(userId);
    if (idx === null) return;
    this.seats[idx] = null;
    setSeat(this.table.id, idx, null);
    this.broadcastTableState();
  }

  /** Re-links a reconnecting user's socket to their existing seat, if any,
   * and re-sends whatever private state they'd otherwise have missed (their
   * hand, and any turn prompt currently waiting on them) — a fresh page
   * load or reconnect only gets `table:state`'s public snapshot otherwise. */
  attachSocket(userId: string, socketId: string): SeatIndex | null {
    const idx = this.seatIndexForUser(userId);
    if (idx !== null) {
      this.seats[idx]!.socketId = socketId;
      this.resyncSeat(idx);
    }
    return idx;
  }

  private resyncSeat(seat: SeatIndex): void {
    if (!this.session) return;
    const hsm = this.session.current;
    if (hsm.phase === "complete" || hsm.phase === "all_passed") return;

    this.emitPrivate(seat, "hand:yourCards", { cards: hsm.hands[seat].map(encodeCard) });

    if (hsm.partnerResolution?.status === "secret" && (hsm.partnerResolution as any).partnerSeat === seat) {
      this.emitPrivate(seat, "partner:youAreSecretPartner", {});
    }

    if (hsm.phase === "bidding" && hsm.bidding.turnSeat === seat) {
      this.emitPrivate(seat, "bid:yourTurn", {});
    } else if (hsm.phase === "declaration" && hsm.declarerSeat === seat) {
      this.emitPrivate(seat, "contract:yourTurnToDeclare", {
        eligiblePartnerCardRanks: hsm.eligiblePartnerCardRanksForDeclarer(),
      });
    } else if (hsm.phase === "trump_resolution" && hsm.turnSeat === seat) {
      if (hsm.kittyRevealState) this.emitPrivate(seat, "trump:yourTurnToReveal", {});
      else this.emitPrivate(seat, "trump:yourTurnToChoose", {});
    } else if (hsm.phase === "play" && hsm.turnSeat === seat) {
      this.emitPrivate(seat, "play:yourTurn", { legal: hsm.legalPlaysForCurrentTurn().map(encodeCard) });
    }
  }

  broadcastTableState(): void {
    this.io.to(this.room()).emit("table:state", this.publicState());
  }

  publicState() {
    return {
      tableId: this.table.id,
      code: this.table.code,
      name: this.table.name,
      status: this.status,
      seats: this.seats.map((s) => (s ? { userId: s.userId, displayName: s.displayName } : null)),
      phase: this.session?.current.phase ?? null,
      hostUserId: this.table.createdBy,
      bidFloorRank: this.table.bidFloorRank,
    };
  }

  startSession(requesterUserId: string, bidFloorRank?: number): void {
    if (this.status !== "lobby") throw new IllegalActionError("session already started");
    if (this.seatedCount() !== 4) throw new IllegalActionError("all 4 seats must be filled");
    if (this.table.createdBy !== requesterUserId) throw new IllegalActionError("only the host can start the session");

    if (bidFloorRank !== undefined) {
      if (!CONTRACT_LADDER.some((c) => c.ladderRank === bidFloorRank)) {
        throw new IllegalActionError("invalid bid floor");
      }
      this.table.bidFloorRank = bidFloorRank;
      setBidFloorRank(this.table.id, bidFloorRank);
    }

    this.status = "active";
    setTableStatus(this.table.id, "active");
    const sessionId = createSession(this.table.id, 0);
    this.session = new SessionManager(sessionId, 0, this.table.bidFloorRank);
    this.bidOrder = 0;
    this.currentHandDbId = this.persistNewHand(null);
    this.broadcastHandStarted();
  }

  private persistNewHand(redealtFromHandId: string | null): string {
    const hsm = this.session!.current;
    return createHandRecord(this.session!.sessionId, this.session!.currentHandNumber, hsm.dealerSeat, hsm.kitty, redealtFromHandId);
  }

  private currentHandDbId?: string;

  private broadcastHandStarted(): void {
    const hsm = this.session!.current;
    this.io.to(this.room()).emit("hand:started", {
      handNumber: this.session!.currentHandNumber,
      dealerSeat: hsm.dealerSeat,
    });
    for (const seat of ALL_SEATS) {
      this.emitPrivate(seat, "hand:yourCards", { cards: hsm.hands[seat].map(encodeCard) });
    }
    this.emitPublic("bid:turnChanged", { seat: hsm.bidding.turnSeat });
    this.emitPrivate(hsm.bidding.turnSeat, "bid:yourTurn", {});
  }

  private emitPrivate(seat: SeatIndex | undefined, event: string, payload: unknown): void {
    if (seat === undefined) return;
    const occupant = this.seats[seat];
    if (occupant?.socketId) this.io.to(occupant.socketId).emit(event, payload);
  }

  private emitPublic(event: string, payload: unknown): void {
    this.io.to(this.room()).emit(event, payload);
  }

  placeBid(
    userId: string,
    contractCode: Parameters<HandStateMachine["placeBid"]>[1],
    subMethod?: Parameters<HandStateMachine["placeBid"]>[2]
  ): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    hsm.placeBid(seat, contractCode, subMethod);
    recordBid(this.currentHandDbId!, seat, this.bidOrder++, contractCode, subMethod);
    this.emitPublic("bid:placed", { seat, contractCode, subMethod, isPass: contractCode === null });

    if (hsm.phase === "all_passed") {
      markHandRedealt(this.currentHandDbId!);
      this.emitPublic("bid:allPassedRedeal", {});
      this.session!.redeal(this.table.bidFloorRank);
      this.bidOrder = 0;
      this.currentHandDbId = this.persistNewHand(this.currentHandDbId!);
      this.broadcastHandStarted();
      return;
    }
    if (hsm.phase === "declaration") {
      this.emitPublic("bid:won", { seat: hsm.declarerSeat, contractCode: hsm.contractCode, subMethod: hsm.subMethodCode });
      this.emitPrivate(hsm.declarerSeat, "contract:yourTurnToDeclare", {
        eligiblePartnerCardRanks: hsm.eligiblePartnerCardRanksForDeclarer(),
      });
      return;
    }
    this.emitPublic("bid:turnChanged", { seat: hsm.bidding.turnSeat });
    this.emitPrivate(hsm.bidding.turnSeat, "bid:yourTurn", {});
  }

  declareContract(userId: string, input: DeclareContractInput): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    if (seat !== hsm.declarerSeat) throw new IllegalActionError("only the declarer can declare the contract");
    hsm.declareContract(input);

    const partnerStatus = hsm.partnerResolution?.status ?? "solo";
    this.emitPublic("contract:declared", {
      declarerSeat: hsm.declarerSeat,
      contractCode: hsm.contractCode,
      subMethod: hsm.subMethodCode,
      trumpSuit: hsm.trumpSuit ?? undefined,
      partnerStatus,
    });

    if (partnerStatus === "secret") {
      const res = hsm.partnerResolution as { status: "secret"; partnerSeat: SeatIndex };
      this.emitPrivate(res.partnerSeat, "partner:youAreSecretPartner", { handId: this.currentHandDbId });
    } else if (partnerStatus === "revealed") {
      const res = hsm.partnerResolution as { status: "revealed"; partnerSeat: SeatIndex };
      this.emitPublic("partner:revealed", { seat: res.partnerSeat });
    }

    this.afterDeclarationRouting();
  }

  private afterDeclarationRouting(): void {
    const hsm = this.session!.current;
    if (hsm.phase === "trump_resolution") {
      // Everyone needs to know we're in this phase (so a `tip` reveal is
      // actually visible to the whole table, not just the actor) — only the
      // acting seat additionally gets told it's their move.
      this.emitPublic("trump:awaiting", { seat: hsm.turnSeat, mode: hsm.kittyRevealState ? "reveal" : "choose" });
      if (hsm.kittyRevealState) {
        this.emitPrivate(hsm.declarerSeat, "trump:yourTurnToReveal", {});
      } else {
        this.emitPrivate(hsm.turnSeat, "trump:yourTurnToChoose", {});
      }
      return;
    }
    if (hsm.phase === "kitty_exchange") {
      this.promptKittyExchange();
    }
  }

  /** The kitty stays hidden until it's actually exchanged (any cards already
   * shown via a `tip` reveal are public knowledge, but the rest are not) —
   * so this only ever announces WHO must decide, never the kitty contents. */
  private promptKittyExchange(): void {
    const hsm = this.session!.current;
    const seat = hsm.turnSeat!;
    this.emitPublic("kitty:awaiting", { seat });
  }

  choosePartnerTrump(userId: string, suit: Suit): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    hsm.choosePartnerTrump(seat, suit);
    this.emitPublic("trump:resolved", { trumpSuit: hsm.trumpSuit ?? undefined });
    this.promptKittyExchange();
  }

  revealNextTipCard(userId: string): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    if (seat !== hsm.declarerSeat) throw new IllegalActionError("only the declarer drives the tip reveal");
    const card = hsm.revealNextTipCard();
    const order = hsm.kittyRevealState!.revealed.length - 1;
    recordKittyReveal(this.currentHandDbId!, order, card, false);
    this.emitPublic("trump:kittyCardRevealed", { card: encodeCard(card), index: order });
    if (hsm.phase === "kitty_exchange") {
      this.emitPublic("trump:resolved", { trumpSuit: hsm.trumpSuit ?? undefined });
      this.promptKittyExchange();
    }
  }

  stopTipReveal(userId: string): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    hsm.stopTipReveal(seat);
    this.emitPublic("trump:resolved", { trumpSuit: hsm.trumpSuit ?? undefined });
    this.promptKittyExchange();
  }

  performKittyExchange(userId: string, discard: Card[] | null): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    const cardsOut = discard ?? [];
    const cardsIn = discard ? hsm.kitty : [];
    hsm.performKittyExchange(seat, discard);
    recordKittyExchange(this.currentHandDbId!, seat, discard !== null, cardsOut, cardsIn);
    this.emitPublic("kitty:resolved", { exchanged: discard !== null });
    if (discard !== null) {
      this.emitPrivate(seat, "hand:yourCards", { cards: hsm.hands[seat].map(encodeCard) });
    }

    if (hsm.phase === "play") {
      const contract = getContract(hsm.contractCode!);
      if (contract.exposesHand !== "none") {
        this.emitPublic("hand:exposed", {
          seat: hsm.declarerSeat,
          level: contract.exposesHand,
          cards: hsm.hands[hsm.declarerSeat!].map(encodeCard),
        });
      }
      this.emitPublic("play:turnChanged", { seat: hsm.turnSeat });
      this.emitPrivate(hsm.turnSeat, "play:yourTurn", { legal: hsm.legalPlaysForCurrentTurn().map(encodeCard) });
    }
  }

  playCard(userId: string, card: Card): void {
    const seat = this.requireSeat(userId);
    const hsm = this.session!.current;
    const trickNumberBefore = hsm.tricks.length;
    const { trickComplete, partnerRevealedNow } = hsm.playCard(seat, card);

    this.emitPublic("play:cardPlayed", { seat, card: encodeCard(card), trickNumber: trickNumberBefore + 1 });
    if (partnerRevealedNow) {
      const res = hsm.partnerResolution as { status: "revealed"; partnerSeat: SeatIndex };
      this.emitPublic("partner:revealed", { seat: res.partnerSeat });
    }

    if (trickComplete) {
      const finished = hsm.tricks[hsm.tricks.length - 1];
      recordTrick(this.currentHandDbId!, trickNumberBefore + 1, finished.leaderSeat, finished.winnerSeat, finished.plays);
      this.emitPublic("trick:won", { winnerSeat: finished.winnerSeat, trickNumber: trickNumberBefore + 1 });
    }

    if (hsm.phase === "complete") {
      this.finishHand();
      return;
    }
    this.emitPublic("play:turnChanged", { seat: hsm.turnSeat });
    this.emitPrivate(hsm.turnSeat, "play:yourTurn", { legal: hsm.legalPlaysForCurrentTurn().map(encodeCard) });
  }

  private finishHand(): void {
    const hsm = this.session!.current;
    const result = hsm.result!;
    const contract = getContract(hsm.contractCode!);

    recordContractResult(this.currentHandDbId!, {
      contractCode: hsm.contractCode!,
      subMethod: hsm.subMethodCode,
      declarerSeat: hsm.declarerSeat!,
      namedPartnerCardRank: hsm.namedPartnerCard?.rank,
      namedPartnerCardSuit: hsm.namedPartnerCard?.suit,
      trumpSuit: hsm.trumpSuit ?? undefined,
      partnerSeat: result.partnerSeat,
      selfPartner: result.isSoloOutcome && !contract.isSolo,
      pointValueApplied: result.pointValue,
      multiplierApplied: result.isSoloOutcome ? 3 : 1,
      success: result.success,
      tricksTaken: result.tricksTakenByDeclarerSide,
    });
    markHandComplete(this.currentHandDbId!);

    const seatToUserId: Record<SeatIndex, string> = {
      0: this.seats[0]!.userId,
      1: this.seats[1]!.userId,
      2: this.seats[2]!.userId,
      3: this.seats[3]!.userId,
    };
    const totals = recordScoreLedger(this.session!.sessionId, this.currentHandDbId!, seatToUserId, result.ledger);

    this.emitPublic("hand:complete", {
      handId: this.currentHandDbId,
      success: result.success,
      tricksTaken: result.tricksTakenByDeclarerSide,
      declarerSeat: hsm.declarerSeat,
      partnerSeat: result.partnerSeat,
      contractCode: hsm.contractCode,
      pointValue: result.pointValue,
      ledger: result.ledger.map((e) => ({
        userId: seatToUserId[e.seat],
        delta: e.delta,
        multiplier: e.multiplier,
        runningTotal: totals[e.seat],
      })),
    });

    const advance = this.session!.advanceAfterCompletedHand(this.table.bidFloorRank);
    if (advance.sessionComplete) {
      markSessionComplete(this.session!.sessionId);
      this.emitPublic("session:complete", {
        sessionId: this.session!.sessionId,
        finalTotals: ALL_SEATS.map((s) => ({ userId: seatToUserId[s], total: totals[s] })),
      });
      this.status = "lobby";
      setTableStatus(this.table.id, "lobby");
      return;
    }

    this.bidOrder = 0;
    this.currentHandDbId = this.persistNewHand(null);
    this.broadcastHandStarted();
  }

  hostAction(userId: string, action: "continueSession" | "closeTable", bidFloorRank?: number): void {
    if (this.table.createdBy !== userId) throw new IllegalActionError("only the host can do this");
    if (action === "continueSession") {
      if (this.status !== "lobby") throw new IllegalActionError("session is still in progress");
      this.startSession(userId, bidFloorRank);
    } else {
      this.status = "finished";
      setTableStatus(this.table.id, "finished");
      this.emitPublic("table:closed", {});
    }
  }

  private requireSeat(userId: string): SeatIndex {
    const seat = this.seatIndexForUser(userId);
    if (seat === null) throw new IllegalActionError("not seated at this table");
    if (!this.session) throw new IllegalActionError("session has not started");
    return seat;
  }
}
