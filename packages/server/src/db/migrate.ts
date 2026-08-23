import { sqlite } from "./client.js";

/**
 * Hand-written idempotent schema creation. For a single-container hobby app
 * this is simpler and more transparent than wiring up drizzle-kit's
 * generator pipeline — schema.ts stays the source of truth for the Drizzle
 * query layer, this just needs to keep the actual tables in sync with it.
 */
export function runMigrations(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lobby',
      bid_floor_rank INTEGER NOT NULL DEFAULT 2,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS table_seats (
      table_id TEXT NOT NULL,
      seat_index INTEGER NOT NULL,
      user_id TEXT,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (table_id, seat_index)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      starting_dealer_seat INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS hands (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      hand_number INTEGER NOT NULL,
      dealer_seat INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      kitty_cards TEXT,
      redealt_from_hand_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      seat INTEGER NOT NULL,
      bid_order INTEGER NOT NULL,
      contract_code TEXT,
      sub_method TEXT,
      is_pass INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hand_contracts (
      hand_id TEXT PRIMARY KEY,
      contract_code TEXT NOT NULL,
      sub_method TEXT,
      declarer_seat INTEGER NOT NULL,
      named_partner_card_rank TEXT,
      named_partner_card_suit TEXT,
      trump_suit TEXT,
      partner_seat INTEGER,
      self_partner INTEGER NOT NULL DEFAULT 0,
      point_value_applied INTEGER NOT NULL,
      multiplier_applied INTEGER NOT NULL,
      success INTEGER,
      tricks_taken INTEGER
    );

    CREATE TABLE IF NOT EXISTS kitty_exchanges (
      hand_id TEXT PRIMARY KEY,
      performed_by_seat INTEGER NOT NULL,
      exchanged INTEGER NOT NULL,
      cards_swapped_out TEXT,
      cards_swapped_in TEXT
    );

    CREATE TABLE IF NOT EXISTS kitty_reveals (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      reveal_order INTEGER NOT NULL,
      card TEXT NOT NULL,
      stopped_here INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tricks (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      trick_number INTEGER NOT NULL,
      leader_seat INTEGER NOT NULL,
      winner_seat INTEGER
    );

    CREATE TABLE IF NOT EXISTS plays (
      id TEXT PRIMARY KEY,
      trick_id TEXT NOT NULL,
      seat INTEGER NOT NULL,
      card TEXT NOT NULL,
      play_order INTEGER NOT NULL,
      played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS score_ledger (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      seat INTEGER NOT NULL,
      points_delta INTEGER NOT NULL,
      multiplier INTEGER NOT NULL,
      running_total_after INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing("bids", "sub_method", "TEXT");
}

/** Idempotent column addition for schema changes on an existing DB —
 * CREATE TABLE IF NOT EXISTS above doesn't touch tables that already exist. */
function addColumnIfMissing(table: string, column: string, type: string): void {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
  console.log("Migrations applied.");
}
