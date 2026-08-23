import { z } from "zod";

const CardCode = z
  .string()
  .regex(/^(JOKER[123]|(A|K|Q|J|10|[2-9])[CDHS])$/, "invalid card code");

const ContractCode = z.enum([
  "sol",
  "nine_plus",
  "ren_sol",
  "ten",
  "ten_plus",
  "eleven",
  "eleven_plus",
  "twelve",
  "twelve_plus",
  "thirteen",
  "thirteen_plus",
  "halv_bordlaegger",
  "bordlaegger",
]);

const SubMethodCode = z.enum(["sans", "half", "tip", "strong"]);
const Suit = z.enum(["clubs", "diamonds", "hearts", "spades"]);
const PartnerCardRank = z.enum(["A", "K", "Q", "J"]);
const SeatIndex = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

// ---- Lobby ----

export const LobbyListRequest = z.object({});
export const LobbyCreateTableRequest = z.object({ name: z.string().min(1).max(60) });
export const LobbyJoinTableRequest = z.object({ code: z.string().min(4).max(12) });

export const TableSummary = z.object({
  tableId: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(["lobby", "active", "finished"]),
  seatedCount: z.number().min(0).max(4),
});

// ---- Table room ----

export const TakeSeatRequest = z.object({ seatIndex: SeatIndex });
export const StartSessionRequest = z.object({});

export const HostAction = z.object({
  action: z.enum(["continueSession", "closeTable"]),
});

// ---- Bidding ----

export const PlaceBidRequest = z.object({
  contractCode: ContractCode.nullable(), // null = pass
});

export const BidPlacedEvent = z.object({
  seat: SeatIndex,
  contractCode: ContractCode.nullable(),
  isPass: z.boolean(),
});

// ---- Contract declaration ----

export const DeclareContractRequest = z.object({
  subMethod: SubMethodCode.optional(),
  partnerCard: z
    .object({ rank: PartnerCardRank, suit: Suit })
    .optional(),
  trumpSuit: Suit.optional(),
});

export const ContractDeclaredEvent = z.object({
  declarerSeat: SeatIndex,
  contractCode: ContractCode,
  subMethod: SubMethodCode.optional(),
  trumpSuit: Suit.optional(),
  partnerStatus: z.enum(["solo", "secret", "revealed"]),
});

// ---- Trump resolution (tip / half) ----

export const KittyCardRevealedEvent = z.object({
  card: CardCode,
  index: z.number(),
});
export const StopRevealRequest = z.object({ chosenSuit: Suit });
export const ChooseTrumpRequest = z.object({ suit: Suit });
export const TrumpResolvedEvent = z.object({ trumpSuit: Suit.optional() });

// ---- Kitty exchange ----

export const KittyCardsEvent = z.object({ cards: z.array(CardCode).length(3) });
export const KittyDecisionRequest = z.object({ exchange: z.boolean() });
export const KittyResolvedEvent = z.object({ exchanged: z.boolean() });

// ---- Play ----

export const PlayCardRequest = z.object({ card: CardCode });
export const CardPlayedEvent = z.object({
  seat: SeatIndex,
  card: CardCode,
  trickNumber: z.number(),
});
export const PartnerRevealedEvent = z.object({ seat: SeatIndex });
export const TrickWonEvent = z.object({
  winnerSeat: SeatIndex,
  trickNumber: z.number(),
});

// ---- Scoring / hand & session lifecycle ----

export const LedgerEntry = z.object({
  userId: z.string(),
  delta: z.number(),
  multiplier: z.number(),
  runningTotal: z.number(),
});

export const HandCompleteEvent = z.object({
  handId: z.string(),
  success: z.boolean(),
  tricksTaken: z.number(),
  declarerSeat: SeatIndex,
  partnerSeat: SeatIndex.nullable(),
  contractCode: ContractCode,
  pointValue: z.number(),
  ledger: z.array(LedgerEntry),
});

export const SessionCompleteEvent = z.object({
  sessionId: z.string(),
  finalTotals: z.array(z.object({ userId: z.string(), total: z.number() })),
});

export const HandStartedEvent = z.object({
  handId: z.string(),
  handNumber: z.number(),
  dealerSeat: SeatIndex,
});

export const YourCardsEvent = z.object({ cards: z.array(CardCode) });

export type LedgerEntryT = z.infer<typeof LedgerEntry>;
export type HandCompleteEventT = z.infer<typeof HandCompleteEvent>;
