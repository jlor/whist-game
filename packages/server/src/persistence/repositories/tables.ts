import { and, eq } from "drizzle-orm";
import { customAlphabet, nanoid } from "nanoid";
import { db } from "../../db/client.js";
import { tables, tableSeats } from "../../db/schema.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export interface TableRecord {
  id: string;
  code: string;
  name: string;
  status: "lobby" | "active" | "finished";
  bidFloorRank: number;
  createdBy: string;
}

export function createTable(name: string, createdBy: string): TableRecord {
  const record: TableRecord = {
    id: nanoid(),
    code: generateCode(),
    name,
    status: "lobby",
    bidFloorRank: 2,
    createdBy,
  };
  db.insert(tables).values(record).run();
  for (let seatIndex = 0; seatIndex < 4; seatIndex++) {
    db.insert(tableSeats).values({ tableId: record.id, seatIndex, userId: null }).run();
  }
  return record;
}

export function findTableByCode(code: string): TableRecord | undefined {
  return db.select().from(tables).where(eq(tables.code, code.toUpperCase())).get();
}

export function findTableById(id: string): TableRecord | undefined {
  return db.select().from(tables).where(eq(tables.id, id)).get();
}

export function listTables(): TableRecord[] {
  return db.select().from(tables).all();
}

export function setTableStatus(id: string, status: TableRecord["status"]): void {
  db.update(tables).set({ status }).where(eq(tables.id, id)).run();
}

export function getSeats(tableId: string): { seatIndex: number; userId: string | null }[] {
  return db
    .select({ seatIndex: tableSeats.seatIndex, userId: tableSeats.userId })
    .from(tableSeats)
    .where(eq(tableSeats.tableId, tableId))
    .all();
}

export function setSeat(tableId: string, seatIndex: number, userId: string | null): void {
  db.update(tableSeats)
    .set({ userId })
    .where(and(eq(tableSeats.tableId, tableId), eq(tableSeats.seatIndex, seatIndex)))
    .run();
}
