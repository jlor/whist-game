import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { scoreLedger } from "../../db/schema.js";

export function getUserStats(userId: string) {
  const row = db
    .select({
      handsPlayed: sql<number>`COUNT(*)`,
      totalPoints: sql<number>`COALESCE(SUM(${scoreLedger.pointsDelta}), 0)`,
    })
    .from(scoreLedger)
    .where(eq(scoreLedger.userId, userId))
    .get();
  return row ?? { handsPlayed: 0, totalPoints: 0 };
}
