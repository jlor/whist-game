import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createUser, findUserByUsername } from "../persistence/repositories/users.js";
import { verifyPassword } from "./password.js";
import { signToken, verifyToken } from "./token.js";

const CredentialsSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
});

const RegisterSchema = CredentialsSchema.extend({
  displayName: z.string().min(1).max(60).optional(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/register", async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    let user;
    try {
      user = await createUser(body.username, body.password, body.displayName);
    } catch {
      return reply.code(409).send({ error: "username already taken" });
    }
    const token = signToken({ userId: user.id, username: user.username });
    reply.setCookie("token", token, { path: "/", httpOnly: true, sameSite: "lax" });
    return { userId: user.id, username: user.username, displayName: user.displayName };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = CredentialsSchema.parse(req.body);
    const user = findUserByUsername(body.username);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "invalid username or password" });
    }
    const token = signToken({ userId: user.id, username: user.username });
    reply.setCookie("token", token, { path: "/", httpOnly: true, sameSite: "lax" });
    return { userId: user.id, username: user.username, displayName: user.displayName };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie("token", { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const token = req.cookies.token;
    if (!token) return reply.code(401).send({ error: "not authenticated" });
    try {
      return verifyToken(token);
    } catch {
      return reply.code(401).send({ error: "not authenticated" });
    }
  });
}
