import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { ZodError } from "zod";
import { authRoutes } from "./auth/routes.js";
import { historyRoutes } from "./persistence/historyRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      reply.code(400).send({ error: "invalid request", details: err.issues });
      return;
    }
    app.log.error(err);
    reply.code(500).send({ error: "internal error" });
  });

  await app.register(fastifyCookie);
  await app.register(authRoutes);
  await app.register(historyRoutes);

  const clientDist = path.resolve(__dirname, "../../client/dist");
  await app.register(fastifyStatic, { root: clientDist, wildcard: false });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api/")) {
      reply.code(404).send({ error: "not found" });
      return;
    }
    reply.sendFile("index.html");
  });

  return app;
}
