export interface SeatOccupant {
  userId: string;
  displayName: string;
}

export interface BidEntry {
  seat: number;
  contractCode: string | null;
  isPass: boolean;
}

export interface TrickCardEntry {
  seat: number;
  card: string;
}

export interface HandCompletePayload {
  handId: string;
  success: boolean;
  tricksTaken: number;
  declarerSeat: number;
  partnerSeat: number | null;
  contractCode: string;
  pointValue: number;
  ledger: { userId: string; delta: number; multiplier: number; runningTotal: number }[];
}

export interface SessionCompletePayload {
  sessionId: string;
  finalTotals: { userId: string; total: number }[];
}

export interface GameState {
  tableId: string | null;
  code: string | null;
  name: string | null;
  tableStatus: "lobby" | "active" | "finished" | null;
  seats: (SeatOccupant | null)[];
  mySeat: number | null;

  phase: string | null;
  dealerSeat: number | null;
  handNumber: number | null;
  myCards: string[];

  biddingTurnSeat: number | null;
  playTurnSeat: number | null;
  bids: BidEntry[];
  highBid: { seat: number; contractCode: string } | null;

  declarerSeat: number | null;
  contractCode: string | null;
  subMethod: string | null;
  trumpSuit: string | null;
  partnerStatus: "solo" | "secret" | "revealed" | null;
  partnerSeat: number | null;
  eligiblePartnerCardRanks: string[] | null;
  amSecretPartner: boolean;

  tipReveals: { card: string; index: number }[];
  awaitingTipStop: boolean;
  awaitingTrumpChoice: boolean;

  kittyCards: string[] | null;
  kittyResolved: boolean | null;

  exposedHand: { seat: number; level: string; cards: string[] } | null;

  currentTrick: TrickCardEntry[];
  myTurnToPlay: boolean;
  legalPlays: string[] | null;
  lastTrickWinner: { winnerSeat: number; trickNumber: number } | null;

  lastHandResult: HandCompletePayload | null;
  sessionComplete: SessionCompletePayload | null;

  errors: string[];
}

export const initialGameState: GameState = {
  tableId: null,
  code: null,
  name: null,
  tableStatus: null,
  seats: [null, null, null, null],
  mySeat: null,
  phase: null,
  dealerSeat: null,
  handNumber: null,
  myCards: [],
  biddingTurnSeat: null,
  playTurnSeat: null,
  bids: [],
  highBid: null,
  declarerSeat: null,
  contractCode: null,
  subMethod: null,
  trumpSuit: null,
  partnerStatus: null,
  partnerSeat: null,
  eligiblePartnerCardRanks: null,
  amSecretPartner: false,
  tipReveals: [],
  awaitingTipStop: false,
  awaitingTrumpChoice: false,
  kittyCards: null,
  kittyResolved: null,
  exposedHand: null,
  currentTrick: [],
  myTurnToPlay: false,
  legalPlays: null,
  lastTrickWinner: null,
  lastHandResult: null,
  sessionComplete: null,
  errors: [],
};

export type GameAction =
  | { type: "table:state"; payload: any }
  | { type: "hand:started"; payload: any }
  | { type: "hand:yourCards"; payload: { cards: string[] } }
  | { type: "bid:yourTurn" }
  | { type: "bid:turnChanged"; payload: { seat: number } }
  | { type: "bid:placed"; payload: BidEntry }
  | { type: "bid:won"; payload: { seat: number; contractCode: string } }
  | { type: "bid:allPassedRedeal" }
  | { type: "contract:yourTurnToDeclare"; payload: { eligiblePartnerCardRanks: string[] } }
  | { type: "contract:declared"; payload: any }
  | { type: "partner:youAreSecretPartner" }
  | { type: "partner:revealed"; payload: { seat: number } }
  | { type: "trump:yourTurnToReveal" }
  | { type: "trump:yourTurnToChoose" }
  | { type: "trump:kittyCardRevealed"; payload: { card: string; index: number } }
  | { type: "trump:resolved"; payload: { trumpSuit?: string } }
  | { type: "kitty:cards"; payload: { cards: string[] } }
  | { type: "kitty:resolved"; payload: { exchanged: boolean } }
  | { type: "hand:exposed"; payload: { seat: number; level: string; cards: string[] } }
  | { type: "play:turnChanged"; payload: { seat: number } }
  | { type: "play:yourTurn"; payload: { legal: string[] } }
  | { type: "play:cardPlayed"; payload: TrickCardEntry & { trickNumber: number } }
  | { type: "trick:won"; payload: { winnerSeat: number; trickNumber: number } }
  | { type: "hand:complete"; payload: HandCompletePayload }
  | { type: "session:complete"; payload: SessionCompletePayload }
  | { type: "table:closed" }
  | { type: "error"; payload: { message: string } }
  | { type: "reset" };

function computeMySeat(seats: GameState["seats"], userId: string | null): number | null {
  if (!userId) return null;
  const idx = seats.findIndex((s) => s?.userId === userId);
  return idx === -1 ? null : idx;
}

export function createGameReducer(myUserId: string | null) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case "reset":
        return initialGameState;

      case "table:state": {
        const p = action.payload;
        return {
          ...state,
          tableId: p.tableId,
          code: p.code,
          name: p.name,
          tableStatus: p.status,
          seats: p.seats,
          mySeat: computeMySeat(p.seats, myUserId),
          phase: p.phase,
        };
      }

      case "hand:started":
        return {
          ...initialGameState,
          tableId: state.tableId,
          code: state.code,
          name: state.name,
          tableStatus: "active",
          seats: state.seats,
          mySeat: state.mySeat,
          phase: "bidding",
          dealerSeat: action.payload.dealerSeat,
          handNumber: action.payload.handNumber,
        };

      case "hand:yourCards":
        return { ...state, myCards: action.payload.cards };

      case "bid:yourTurn":
        return state;

      case "bid:turnChanged":
        return { ...state, biddingTurnSeat: action.payload.seat };

      case "bid:placed": {
        const bids = [...state.bids, action.payload];
        const highBid = action.payload.isPass
          ? state.highBid
          : { seat: action.payload.seat, contractCode: action.payload.contractCode! };
        return { ...state, bids, highBid };
      }

      case "bid:won":
        return { ...state, phase: "declaration", declarerSeat: action.payload.seat, contractCode: action.payload.contractCode };

      case "bid:allPassedRedeal":
        return { ...state, phase: "bidding", bids: [], highBid: null };

      case "contract:yourTurnToDeclare":
        return { ...state, eligiblePartnerCardRanks: action.payload.eligiblePartnerCardRanks };

      case "contract:declared":
        return {
          ...state,
          declarerSeat: action.payload.declarerSeat,
          contractCode: action.payload.contractCode,
          subMethod: action.payload.subMethod ?? null,
          trumpSuit: action.payload.trumpSuit ?? null,
          partnerStatus: action.payload.partnerStatus,
        };

      case "partner:youAreSecretPartner":
        return { ...state, amSecretPartner: true };

      case "partner:revealed":
        return { ...state, partnerSeat: action.payload.seat, partnerStatus: "revealed" };

      case "trump:yourTurnToReveal":
        return { ...state, phase: "trump_resolution", awaitingTipStop: true };

      case "trump:yourTurnToChoose":
        return { ...state, phase: "trump_resolution", awaitingTrumpChoice: true };

      case "trump:kittyCardRevealed":
        return { ...state, tipReveals: [...state.tipReveals, action.payload] };

      case "trump:resolved":
        return {
          ...state,
          trumpSuit: action.payload.trumpSuit ?? null,
          awaitingTipStop: false,
          awaitingTrumpChoice: false,
        };

      case "kitty:cards":
        return { ...state, phase: "kitty_exchange", kittyCards: action.payload.cards };

      case "kitty:resolved":
        return { ...state, kittyResolved: action.payload.exchanged, kittyCards: null };

      case "hand:exposed":
        return { ...state, exposedHand: action.payload, phase: "play" };

      case "play:turnChanged":
        return { ...state, playTurnSeat: action.payload.seat };

      case "play:yourTurn":
        return { ...state, phase: "play", myTurnToPlay: true, legalPlays: action.payload.legal };

      case "play:cardPlayed": {
        const trick = [...state.currentTrick, { seat: action.payload.seat, card: action.payload.card }];
        return { ...state, currentTrick: trick, myTurnToPlay: false, legalPlays: null };
      }

      case "trick:won":
        return { ...state, currentTrick: [], lastTrickWinner: action.payload };

      case "hand:complete":
        return { ...state, phase: "complete", lastHandResult: action.payload };

      case "session:complete":
        return { ...state, phase: "session_complete", sessionComplete: action.payload };

      case "table:closed":
        return { ...state, tableStatus: "finished" };

      case "error":
        return { ...state, errors: [...state.errors, action.payload.message].slice(-5) };

      default:
        return state;
    }
  };
}
