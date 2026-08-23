import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { getSocket } from "../api/socket.js";
import { useAuth } from "./AuthContext.js";
import { createGameReducer, initialGameState, type GameState } from "./gameReducer.js";

const EVENT_NAMES = [
  "table:state",
  "hand:started",
  "hand:yourCards",
  "bid:yourTurn",
  "bid:turnChanged",
  "bid:placed",
  "bid:won",
  "bid:allPassedRedeal",
  "contract:yourTurnToDeclare",
  "contract:declared",
  "partner:youAreSecretPartner",
  "partner:revealed",
  "trump:awaiting",
  "trump:yourTurnToReveal",
  "trump:yourTurnToChoose",
  "trump:kittyCardRevealed",
  "trump:resolved",
  "kitty:awaiting",
  "kitty:resolved",
  "hand:exposed",
  "play:turnChanged",
  "play:yourTurn",
  "play:cardPlayed",
  "trick:won",
  "hand:complete",
  "session:complete",
  "table:closed",
  "error",
] as const;

interface GameContextValue {
  state: GameState;
  actions: {
    joinTable: (code: string) => Promise<{ tableId: string; code: string; seatIndex: number | null }>;
    createTable: (name: string) => Promise<{ tableId: string; code: string }>;
    takeSeat: (seatIndex: number) => void;
    leaveSeat: () => void;
    startSession: (bidFloorRank?: number) => void;
    placeBid: (contractCode: string | null, subMethod?: string) => void;
    declareContract: (input: {
      contractCode: string;
      partnerCard?: { rank: string; suit: string };
      trumpSuit?: string;
    }) => void;
    revealNextTipCard: () => void;
    stopTipReveal: () => void;
    choosePartnerTrump: (suit: string) => void;
    performKittyExchange: (discard: string[] | null) => void;
    playCard: (card: string) => void;
    hostAction: (action: "continueSession" | "closeTable", bidFloorRank?: number) => void;
  };
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const reducer = useMemo(() => createGameReducer(user?.userId ?? null), [user?.userId]);
  const [state, dispatch] = useReducer(reducer, initialGameState);

  useEffect(() => {
    const socket = getSocket();
    const handlers = EVENT_NAMES.map((name) => {
      const handler = (payload: any) => dispatch({ type: name, payload } as any);
      socket.on(name, handler);
      return [name, handler] as const;
    });
    return () => {
      handlers.forEach(([name, handler]) => socket.off(name, handler));
    };
  }, []);

  const actions: GameContextValue["actions"] = useMemo(
    () => ({
      joinTable: (code) =>
        new Promise((resolve) => getSocket().emit("lobby:joinTable", { code }, resolve)),
      createTable: (name) =>
        new Promise((resolve) => getSocket().emit("lobby:createTable", { name }, resolve)),
      takeSeat: (seatIndex) => getSocket().emit("table:takeSeat", { seatIndex }),
      leaveSeat: () => getSocket().emit("table:leaveSeat"),
      startSession: (bidFloorRank) => getSocket().emit("table:startSession", { bidFloorRank }),
      placeBid: (contractCode, subMethod) => getSocket().emit("bid:place", { contractCode, subMethod }),
      declareContract: (input) => getSocket().emit("contract:declare", input),
      revealNextTipCard: () => getSocket().emit("trump:revealNext"),
      stopTipReveal: () => getSocket().emit("trump:stopReveal"),
      choosePartnerTrump: (suit) => getSocket().emit("trump:choose", { suit }),
      performKittyExchange: (discard) =>
        getSocket().emit("kitty:decision", { exchange: discard !== null, discard: discard ?? [] }),
      playCard: (card) => getSocket().emit("play:card", { card }),
      hostAction: (action, bidFloorRank) => getSocket().emit("table:hostAction", { action, bidFloorRank }),
    }),
    []
  );

  return <GameContext.Provider value={{ state, actions }}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameStateProvider");
  return ctx;
}
