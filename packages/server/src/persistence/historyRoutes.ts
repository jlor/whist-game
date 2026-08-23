import type { FastifyInstance } from "fastify";
import { getHandDetail, getSessionHands } from "./repositories/hands.js";
import { getUserStats } from "./repositories/stats.js";

export async function historyRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/api/sessions/:id/hands", async (req) => {
    return getSessionHands(req.params.id);
  });

  app.get<{ Params: { id: string } }>("/api/hands/:id", async (req) => {
    return getHandDetail(req.params.id);
  });

  app.get<{ Params: { id: string } }>("/api/users/:id/stats", async (req) => {
    return getUserStats(req.params.id);
  });
}
