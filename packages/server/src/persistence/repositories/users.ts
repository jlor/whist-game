import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { hashPassword } from "../../auth/password.js";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
}

export async function createUser(username: string, password: string, displayName?: string): Promise<UserRecord> {
  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) throw new Error("username already taken");

  const record: UserRecord = {
    id: nanoid(),
    username,
    passwordHash: await hashPassword(password),
    displayName: displayName?.trim() || username,
  };
  db.insert(users).values(record).run();
  return record;
}

export function findUserByUsername(username: string): UserRecord | undefined {
  return db.select().from(users).where(eq(users.username, username)).get();
}

export function findUserById(id: string): UserRecord | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}
