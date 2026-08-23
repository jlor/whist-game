import type { Suit } from "./cards.js";

/**
 * The 16-tier bidding ladder, weakest (rank 1) to strongest (rank 16).
 *
 * This is the single source of truth for the rules engine: game logic
 * dispatches off these fields (trumpMode, winCondition, kittyExchange,
 * exposesHand) rather than branching per contract code, so a correction to
 * any one contract's behavior is a data edit here, not a rules-engine change.
 *
 * A bid normally must land on a strictly higher `ladderRank` than the
 * current high bid. The exception is `submethod_only` tiers (8+, 9+, 10+,
 * 11+, 12+, 13+): the 4 sub-methods (sans/half/tip/strong) at a given tier
 * have NO order among themselves — whoever names a DIFFERENT sub-method
 * than the one currently winning that same tier becomes the new high bid,
 * with no limit on how many times this can cycle back and forth, until
 * someone either escalates to a strictly higher tier or the table passes
 * it out. This is handled in bidding.ts, not by ladderRank alone.
 */
export type ContractCode =
  | "eight"
  | "eight_plus"
  | "nine"
  | "sol"
  | "nine_plus"
  | "ren_sol"
  | "ten"
  | "ten_plus"
  | "eleven"
  | "eleven_plus"
  | "twelve"
  | "twelve_plus"
  | "thirteen"
  | "thirteen_plus"
  | "halv_bordlaegger"
  | "bordlaegger";

export type WinCondition =
  | { type: "at_most"; tricks: number }
  | { type: "at_least"; tricks: number }
  | { type: "exact"; tricks: number };

export interface ContractDef {
  code: ContractCode;
  ladderRank: number;
  displayName: string;
  pointValue: number;
  /** Structurally solo — the partner-card mechanic never applies (unlike a
   * trick-count contract that merely *collapses* to solo at runtime). */
  isSolo: boolean;
  trumpMode: "none" | "free" | "submethod_only";
  winCondition: WinCondition;
  /** Who performs the 3-for-3 kitty exchange. For `submethod_only`
   * contracts this is decided by the chosen SubMethodDef instead. */
  kittyExchange: "declarer" | "submethod_defined";
  exposesHand: "none" | "half" | "full";
}

export const CONTRACT_LADDER: ContractDef[] = [
  {
    code: "eight",
    ladderRank: 1,
    displayName: "8",
    pointValue: 2,
    isSolo: false,
    trumpMode: "free",
    winCondition: { type: "at_least", tricks: 8 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "eight_plus",
    ladderRank: 2,
    displayName: "8+",
    pointValue: 4,
    isSolo: false,
    trumpMode: "submethod_only",
    winCondition: { type: "at_least", tricks: 8 },
    kittyExchange: "submethod_defined",
    exposesHand: "none",
  },
  {
    code: "nine",
    ladderRank: 3,
    displayName: "9",
    pointValue: 4,
    isSolo: false,
    trumpMode: "free",
    winCondition: { type: "at_least", tricks: 9 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "sol",
    ladderRank: 4,
    displayName: "Sol",
    pointValue: 10,
    isSolo: true,
    trumpMode: "none",
    winCondition: { type: "at_most", tricks: 1 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "nine_plus",
    ladderRank: 5,
    displayName: "9+",
    pointValue: 8,
    isSolo: false,
    trumpMode: "submethod_only",
    winCondition: { type: "at_least", tricks: 9 },
    kittyExchange: "submethod_defined",
    exposesHand: "none",
  },
  {
    code: "ren_sol",
    ladderRank: 6,
    displayName: "Ren sol",
    pointValue: 20,
    isSolo: true,
    trumpMode: "none",
    winCondition: { type: "exact", tricks: 0 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "ten",
    ladderRank: 7,
    displayName: "10",
    pointValue: 8,
    isSolo: false,
    trumpMode: "free",
    winCondition: { type: "at_least", tricks: 10 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "ten_plus",
    ladderRank: 8,
    displayName: "10+",
    pointValue: 16,
    isSolo: false,
    trumpMode: "submethod_only",
    winCondition: { type: "at_least", tricks: 10 },
    kittyExchange: "submethod_defined",
    exposesHand: "none",
  },
  {
    code: "eleven",
    ladderRank: 9,
    displayName: "11",
    pointValue: 16,
    isSolo: false,
    trumpMode: "free",
    winCondition: { type: "at_least", tricks: 11 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "eleven_plus",
    ladderRank: 10,
    displayName: "11+",
    pointValue: 32,
    isSolo: false,
    trumpMode: "submethod_only",
    winCondition: { type: "at_least", tricks: 11 },
    kittyExchange: "submethod_defined",
    exposesHand: "none",
  },
  {
    code: "twelve",
    ladderRank: 11,
    displayName: "12",
    pointValue: 32,
    isSolo: false,
    trumpMode: "free",
    winCondition: { type: "at_least", tricks: 12 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "twelve_plus",
    ladderRank: 12,
    displayName: "12+",
    pointValue: 64,
    isSolo: false,
    trumpMode: "submethod_only",
    winCondition: { type: "at_least", tricks: 12 },
    kittyExchange: "submethod_defined",
    exposesHand: "none",
  },
  {
    code: "thirteen",
    ladderRank: 13,
    displayName: "13",
    pointValue: 64,
    isSolo: false,
    trumpMode: "free",
    winCondition: { type: "at_least", tricks: 13 },
    kittyExchange: "declarer",
    exposesHand: "none",
  },
  {
    code: "thirteen_plus",
    ladderRank: 14,
    displayName: "13+",
    pointValue: 128,
    isSolo: false,
    trumpMode: "submethod_only",
    winCondition: { type: "at_least", tricks: 13 },
    kittyExchange: "submethod_defined",
    exposesHand: "none",
  },
  {
    code: "halv_bordlaegger",
    ladderRank: 15,
    displayName: "Halv bordlægger",
    pointValue: 40,
    isSolo: true,
    trumpMode: "none",
    // ASSUMPTION: not stated explicitly in source rules. The point value
    // (40) doubles cleanly from Ren sol (20), and "bordlægger" ("laid on
    // the table") reads as an extension of the 0-trick Sol/Ren sol line
    // with increasing hand exposure making the 0-trick task harder — not
    // an extension of the 13-trick line. One-line fix if wrong.
    winCondition: { type: "exact", tricks: 0 },
    kittyExchange: "declarer",
    exposesHand: "half",
  },
  {
    code: "bordlaegger",
    ladderRank: 16,
    displayName: "Bordlægger",
    pointValue: 80,
    isSolo: true,
    trumpMode: "none",
    // Same assumption as halv_bordlaegger above.
    winCondition: { type: "exact", tricks: 0 },
    kittyExchange: "declarer",
    exposesHand: "full",
  },
];

export function getContract(code: ContractCode): ContractDef {
  const def = CONTRACT_LADDER.find((c) => c.code === code);
  if (!def) throw new Error(`Unknown contract code: ${code}`);
  return def;
}

/** The lowest ladderRank a bid may open with. Configurable per table/session. */
export const DEFAULT_BID_FLOOR_RANK: number = getContract("nine_plus").ladderRank;

export type SubMethodCode = "sans" | "half" | "tip" | "strong";

export interface SubMethodDef {
  code: SubMethodCode;
  displayName: string;
  trumpResolution: "none" | "partner_choice" | "kitty_reveal" | "fixed";
  fixedTrumpSuit?: Suit;
  /** When the secret partner's identity becomes known to the table. */
  partnerRevealTiming: "immediate" | "on_card_played";
  kittyExchangePerformedBy: "declarer" | "partner";
}

/** No order among these — see the CONTRACT_LADDER doc comment above. */
export const SUB_METHODS: SubMethodDef[] = [
  {
    code: "sans",
    displayName: "Sans",
    trumpResolution: "none",
    partnerRevealTiming: "on_card_played",
    kittyExchangePerformedBy: "declarer",
  },
  {
    code: "half",
    displayName: "Halv",
    trumpResolution: "partner_choice",
    partnerRevealTiming: "immediate",
    kittyExchangePerformedBy: "partner",
  },
  {
    code: "tip",
    displayName: "Tip",
    trumpResolution: "kitty_reveal",
    partnerRevealTiming: "on_card_played",
    kittyExchangePerformedBy: "declarer",
  },
  {
    code: "strong",
    displayName: "Good",
    trumpResolution: "fixed",
    fixedTrumpSuit: "clubs",
    partnerRevealTiming: "on_card_played",
    kittyExchangePerformedBy: "declarer",
  },
];

export function getSubMethod(code: SubMethodCode): SubMethodDef {
  const def = SUB_METHODS.find((s) => s.code === code);
  if (!def) throw new Error(`Unknown sub-method code: ${code}`);
  return def;
}

/**
 * Partner-card rank cascade: normally an Ace, but the bidder may optionally
 * fall back to a lower rank if they hold the full set of every rank above
 * it. Always an optional choice, never mandatory — this array simply lists
 * the legal ranks in cascade order.
 */
export const PARTNER_CARD_CASCADE = ["A", "K", "Q", "J"] as const;
export type PartnerCardRank = (typeof PARTNER_CARD_CASCADE)[number];
