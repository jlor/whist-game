import {
  getContract,
  getSubMethod,
  type Card,
  type ContractCode,
  type PartnerCardRank,
  type Suit,
  type SubMethodCode,
} from "@whist/shared";
import { createBiddingState, placeBid as placeBidPure, type BiddingState, type SeatIndex } from "./bidding.js";
import { dealHand } from "./deck.js";
import { exchangeKitty } from "./kittyExchange.js";
import { eligiblePartnerCardRanks, resolvePartnerCard, type PartnerResolution } from "./partnerCard.js";
import { checkWinCondition, scoreHand, type ScoreEntry } from "./scoring.js";
import { determineTrickWinner, legalPlays, type TrickPlay } from "./trickEngine.js";
import {
  canStopOnLastReveal,
  finalizeExhaustedReveal,
  resolveStaticTrump,
  revealNextKittyCard,
  startKittyReveal,
  stopKittyReveal,
  type KittyRevealState,
} from "./trumpSelection.js";

export type HandPhase =
  | "bidding"
  | "all_passed"
  | "declaration"
  | "trump_resolution"
  | "kitty_exchange"
  | "play"
  | "complete";

export interface CompletedTrick {
  leaderSeat: SeatIndex;
  plays: TrickPlay[];
  winnerSeat: SeatIndex;
}

export interface DeclareContractInput {
  contractCode: ContractCode;
  partnerCard?: { rank: PartnerCardRank; suit: Suit };
  trumpSuit?: Suit; // only for trumpMode === 'free'
}

export interface HandResult {
  success: boolean;
  tricksTakenByDeclarerSide: number;
  isSoloOutcome: boolean;
  partnerSeat: SeatIndex | null;
  pointValue: number;
  ledger: ScoreEntry[];
}

function nextSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

export class IllegalActionError extends Error {}

export class HandStateMachine {
  readonly dealerSeat: SeatIndex;
  readonly hands: [Card[], Card[], Card[], Card[]];
  kitty: Card[];
  bidding: BiddingState;
  phase: HandPhase = "bidding";

  contractCode?: ContractCode;
  subMethodCode?: SubMethodCode;
  declarerSeat?: SeatIndex;
  namedPartnerCard?: { rank: PartnerCardRank; suit: Suit };
  partnerResolution?: PartnerResolution;
  trumpSuit: Suit | null | undefined;
  kittyRevealState?: KittyRevealState;

  private kittyExchangeDone = false;
  private exchangePerformerSeat?: SeatIndex;

  leaderSeat?: SeatIndex;
  turnSeat?: SeatIndex;
  currentTrickPlays: TrickPlay[] = [];
  tricks: CompletedTrick[] = [];
  partnerRevealedDuringPlay = false;

  result?: HandResult;

  constructor(dealerSeat: SeatIndex, rng?: () => number, bidFloorRank?: number) {
    this.dealerSeat = dealerSeat;
    const deal = dealHand(rng);
    this.hands = deal.hands;
    this.kitty = deal.kitty;
    this.bidding = createBiddingState(dealerSeat, bidFloorRank);
  }

  placeBid(seat: SeatIndex, contractCode: ContractCode | null, subMethod?: SubMethodCode): void {
    if (this.phase !== "bidding") throw new IllegalActionError("not in bidding phase");
    this.bidding = placeBidPure(this.bidding, seat, contractCode, subMethod);
    if (!this.bidding.isComplete) return;
    if (this.bidding.allPassed) {
      this.phase = "all_passed";
      return;
    }
    const winner = this.bidding.winner!;
    this.declarerSeat = winner.seat;
    this.contractCode = winner.contractCode;
    this.subMethodCode = winner.subMethod;
    this.phase = "declaration";
  }

  eligiblePartnerCardRanksForDeclarer(): PartnerCardRank[] {
    if (this.declarerSeat === undefined) throw new IllegalActionError("no declarer yet");
    return eligiblePartnerCardRanks(this.hands[this.declarerSeat]);
  }

  declareContract(input: DeclareContractInput): void {
    if (this.phase !== "declaration") throw new IllegalActionError("not in declaration phase");
    if (this.declarerSeat === undefined) throw new IllegalActionError("no declarer");
    if (input.contractCode !== this.contractCode) {
      throw new IllegalActionError("contractCode must match the winning bid");
    }
    const contract = getContract(this.contractCode!);
    // contract.trumpMode === "submethod_only" is already satisfied at this
    // point — the sub-method was locked in when the bid itself was placed
    // (see bidding.ts), not chosen here.

    if (contract.trumpMode === "free" && !input.trumpSuit) {
      throw new IllegalActionError("this contract requires declarer to freely choose a trump suit");
    }
    if (!contract.isSolo && !input.partnerCard) {
      throw new IllegalActionError("this contract requires a named partner card");
    }
    // Good ("strong") fixes trump to a known suit up front — the partner
    // card can never be named in that same suit.
    if (this.subMethodCode) {
      const fixedTrump = getSubMethod(this.subMethodCode).fixedTrumpSuit;
      if (fixedTrump && input.partnerCard?.suit === fixedTrump) {
        throw new IllegalActionError(`the partner card cannot be in ${fixedTrump} — that's this contract's fixed trump suit`);
      }
    }

    this.namedPartnerCard = input.partnerCard;

    if (contract.isSolo) {
      this.trumpSuit = null;
      this.beginKittyExchange(this.declarerSeat!);
      return;
    }

    const revealImmediately = this.subMethodCode
      ? getSubMethod(this.subMethodCode).partnerRevealTiming === "immediate"
      : false;
    this.partnerResolution = resolvePartnerCard(
      this.declarerSeat!,
      input.partnerCard!,
      this.hands,
      this.kitty,
      revealImmediately
    );

    if (contract.trumpMode === "free") {
      this.trumpSuit = input.trumpSuit!;
      this.beginKittyExchange(this.declarerSeat!);
      return;
    }

    // submethod_only
    const subMethod = getSubMethod(this.subMethodCode!);
    switch (subMethod.trumpResolution) {
      case "none":
        this.trumpSuit = null;
        this.beginKittyExchange(this.kittyExchangePerformer(subMethod.kittyExchangePerformedBy));
        return;
      case "fixed":
        this.trumpSuit = resolveStaticTrump(subMethod.code);
        this.beginKittyExchange(this.kittyExchangePerformer(subMethod.kittyExchangePerformedBy));
        return;
      case "partner_choice":
        if (this.partnerResolution!.status === "solo") {
          // Assumption: named card was self-held/kitty-stranded under `half`
          // — declarer falls back to doing trump choice + exchange themselves.
          this.phase = "trump_resolution";
          this.turnSeat = this.declarerSeat;
          return;
        }
        this.phase = "trump_resolution";
        this.turnSeat = this.partnerResolution!.partnerSeat;
        return;
      case "kitty_reveal":
        this.phase = "trump_resolution";
        this.kittyRevealState = startKittyReveal(this.kitty);
        this.turnSeat = this.declarerSeat;
        return;
    }
  }

  private kittyExchangePerformer(performedBy: "declarer" | "partner"): SeatIndex {
    if (performedBy === "declarer") return this.declarerSeat!;
    if (this.partnerResolution!.status === "solo") return this.declarerSeat!;
    return this.partnerResolution!.partnerSeat;
  }

  /** Used by `half` (partner freely chooses trump) and its solo fallback. */
  choosePartnerTrump(seat: SeatIndex, suit: Suit): void {
    if (this.phase !== "trump_resolution") throw new IllegalActionError("not resolving trump");
    if (seat !== this.turnSeat) throw new IllegalActionError("not this seat's turn to choose trump");
    if (this.namedPartnerCard!.suit === suit) {
      throw new IllegalActionError("trump cannot be the same suit as the named partner card");
    }
    this.trumpSuit = suit;
    const subMethod = getSubMethod(this.subMethodCode!);
    this.beginKittyExchange(this.kittyExchangePerformer(subMethod.kittyExchangePerformedBy));
  }

  /** Used by `tip`: dealer flips the next kitty card. */
  revealNextTipCard(): Card {
    if (this.phase !== "trump_resolution" || !this.kittyRevealState) {
      throw new IllegalActionError("not resolving a tip trump search");
    }
    const { state, card } = revealNextKittyCard(this.kittyRevealState);
    this.kittyRevealState = state;
    if (state.revealed.length === state.kitty.length && !canStopOnLastReveal(state)) {
      // Whole kitty revealed and the last card is unusable — force-finalize.
      this.kittyRevealState = finalizeExhaustedReveal(state);
      this.trumpSuit = this.kittyRevealState.resolvedTrump ?? null;
      this.beginKittyExchange(this.kittyExchangePerformer(getSubMethod(this.subMethodCode!).kittyExchangePerformedBy));
    }
    return card;
  }

  /** Declarer stops the tip reveal on the currently-shown card. */
  stopTipReveal(seat: SeatIndex): void {
    if (this.phase !== "trump_resolution" || !this.kittyRevealState) {
      throw new IllegalActionError("not resolving a tip trump search");
    }
    if (seat !== this.declarerSeat) throw new IllegalActionError("only the declarer can stop the reveal");
    this.kittyRevealState = stopKittyReveal(this.kittyRevealState);
    this.trumpSuit = this.kittyRevealState.resolvedTrump ?? null;
    this.beginKittyExchange(this.kittyExchangePerformer(getSubMethod(this.subMethodCode!).kittyExchangePerformedBy));
  }

  private beginKittyExchange(performerSeat: SeatIndex): void {
    this.exchangePerformerSeat = performerSeat;
    this.phase = "kitty_exchange";
    this.turnSeat = performerSeat;
  }

  /** All-or-none 3-for-3 swap. Pass `discard: null` to decline. */
  performKittyExchange(seat: SeatIndex, discard: Card[] | null): void {
    if (this.phase !== "kitty_exchange") throw new IllegalActionError("not in kitty exchange phase");
    if (seat !== this.exchangePerformerSeat) throw new IllegalActionError("not this seat's exchange");
    const result = exchangeKitty(this.hands[seat], this.kitty, discard);
    this.hands[seat] = result.newHand;
    this.kitty = result.newKitty;
    this.kittyExchangeDone = true;
    this.beginPlay();
  }

  private beginPlay(): void {
    this.phase = "play";
    this.leaderSeat = nextSeat(this.dealerSeat);
    this.turnSeat = this.leaderSeat;
    this.currentTrickPlays = [];
  }

  private currentLedSuit(): Suit | null {
    if (this.currentTrickPlays.length === 0) return null;
    const first = this.currentTrickPlays[0].card;
    return first.kind === "standard" ? first.suit : null;
  }

  legalPlaysForCurrentTurn(): Card[] {
    if (this.phase !== "play" || this.turnSeat === undefined) {
      throw new IllegalActionError("not in play phase");
    }
    return legalPlays(this.hands[this.turnSeat], this.currentLedSuit());
  }

  playCard(seat: SeatIndex, card: Card): { trickComplete: boolean; partnerRevealedNow: boolean } {
    if (this.phase !== "play") throw new IllegalActionError("not in play phase");
    if (seat !== this.turnSeat) throw new IllegalActionError("not this seat's turn");

    const legal = legalPlays(this.hands[seat], this.currentLedSuit());
    const idx = legal.findIndex((c) => c.kind === card.kind && encodeSame(c, card));
    if (idx === -1) throw new IllegalActionError("illegal card for this trick");

    const handIdx = this.hands[seat].findIndex((c) => c.kind === card.kind && encodeSame(c, card));
    this.hands[seat].splice(handIdx, 1);
    this.currentTrickPlays.push({ seat, card });

    let partnerRevealedNow = false;
    if (
      this.partnerResolution?.status === "secret" &&
      this.namedPartnerCard &&
      card.kind === "standard" &&
      card.rank === this.namedPartnerCard.rank &&
      card.suit === this.namedPartnerCard.suit
    ) {
      this.partnerResolution = { status: "revealed", partnerSeat: this.partnerResolution.partnerSeat };
      this.partnerRevealedDuringPlay = true;
      partnerRevealedNow = true;
    }

    if (this.currentTrickPlays.length < 4) {
      this.turnSeat = nextSeat(seat);
      return { trickComplete: false, partnerRevealedNow };
    }

    const ledSuit = this.currentLedSuit()!;
    const winnerSeat = determineTrickWinner(this.currentTrickPlays, this.trumpSuit ?? null, ledSuit);
    this.tricks.push({ leaderSeat: this.leaderSeat!, plays: this.currentTrickPlays, winnerSeat });
    this.currentTrickPlays = [];
    this.leaderSeat = winnerSeat;
    this.turnSeat = winnerSeat;

    if (this.tricks.length === 13) {
      this.finishHand();
    }

    return { trickComplete: true, partnerRevealedNow };
  }

  private finishHand(): void {
    const contract = getContract(this.contractCode!);
    const isSoloOutcome = contract.isSolo || this.partnerResolution?.status === "solo";
    const declarerSide = isSoloOutcome
      ? new Set<SeatIndex>([this.declarerSeat!])
      : new Set<SeatIndex>([this.declarerSeat!, (this.partnerResolution as any).partnerSeat]);

    const tricksTakenByDeclarerSide = this.tricks.filter((t) => declarerSide.has(t.winnerSeat)).length;
    const success = checkWinCondition(contract.winCondition, tricksTakenByDeclarerSide);
    const partnerSeat = isSoloOutcome ? null : (this.partnerResolution as any).partnerSeat;
    const ledger = scoreHand(contract.pointValue, success, isSoloOutcome, this.declarerSeat!, partnerSeat);

    this.result = {
      success,
      tricksTakenByDeclarerSide,
      isSoloOutcome,
      partnerSeat,
      pointValue: contract.pointValue,
      ledger,
    };
    this.phase = "complete";
  }
}

function encodeSame(a: Card, b: Card): boolean {
  if (a.kind === "joker" && b.kind === "joker") return a.id === b.id;
  if (a.kind === "standard" && b.kind === "standard") return a.suit === b.suit && a.rank === b.rank;
  return false;
}
