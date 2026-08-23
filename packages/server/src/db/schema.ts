import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tables = sqliteTable("tables", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  status: text("status", { enum: ["lobby", "active", "finished"] }).notNull().default("lobby"),
  bidFloorRank: integer("bid_floor_rank").notNull().default(2),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tableSeats = sqliteTable("table_seats", {
  tableId: text("table_id").notNull(),
  seatIndex: integer("seat_index").notNull(),
  userId: text("user_id"),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  tableId: text("table_id").notNull(),
  startingDealerSeat: integer("starting_dealer_seat").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull().default("in_progress"),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  endedAt: text("ended_at"),
});

export const hands = sqliteTable("hands", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  handNumber: integer("hand_number").notNull(),
  dealerSeat: integer("dealer_seat").notNull(),
  status: text("status", { enum: ["in_progress", "redealt", "complete"] }).notNull().default("in_progress"),
  kittyCards: text("kitty_cards", { mode: "json" }).$type<string[]>(),
  redealtFromHandId: text("redealt_from_hand_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const bids = sqliteTable("bids", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull(),
  seat: integer("seat").notNull(),
  bidOrder: integer("bid_order").notNull(),
  contractCode: text("contract_code"),
  subMethod: text("sub_method"),
  isPass: integer("is_pass", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const handContracts = sqliteTable("hand_contracts", {
  handId: text("hand_id").primaryKey(),
  contractCode: text("contract_code").notNull(),
  subMethod: text("sub_method"),
  declarerSeat: integer("declarer_seat").notNull(),
  namedPartnerCardRank: text("named_partner_card_rank"),
  namedPartnerCardSuit: text("named_partner_card_suit"),
  trumpSuit: text("trump_suit"),
  partnerSeat: integer("partner_seat"),
  selfPartner: integer("self_partner", { mode: "boolean" }).notNull().default(false),
  pointValueApplied: integer("point_value_applied").notNull(),
  multiplierApplied: integer("multiplier_applied").notNull(),
  success: integer("success", { mode: "boolean" }),
  tricksTaken: integer("tricks_taken"),
});

export const kittyExchanges = sqliteTable("kitty_exchanges", {
  handId: text("hand_id").primaryKey(),
  performedBySeat: integer("performed_by_seat").notNull(),
  exchanged: integer("exchanged", { mode: "boolean" }).notNull(),
  cardsSwappedOut: text("cards_swapped_out", { mode: "json" }).$type<string[]>(),
  cardsSwappedIn: text("cards_swapped_in", { mode: "json" }).$type<string[]>(),
});

export const kittyReveals = sqliteTable("kitty_reveals", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull(),
  revealOrder: integer("reveal_order").notNull(),
  card: text("card").notNull(),
  stoppedHere: integer("stopped_here", { mode: "boolean" }).notNull(),
});

export const tricks = sqliteTable("tricks", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull(),
  trickNumber: integer("trick_number").notNull(),
  leaderSeat: integer("leader_seat").notNull(),
  winnerSeat: integer("winner_seat"),
});

export const plays = sqliteTable("plays", {
  id: text("id").primaryKey(),
  trickId: text("trick_id").notNull(),
  seat: integer("seat").notNull(),
  card: text("card").notNull(),
  playOrder: integer("play_order").notNull(),
  playedAt: text("played_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scoreLedger = sqliteTable("score_ledger", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull(),
  userId: text("user_id").notNull(),
  seat: integer("seat").notNull(),
  pointsDelta: integer("points_delta").notNull(),
  multiplier: integer("multiplier").notNull(),
  runningTotalAfter: integer("running_total_after").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
