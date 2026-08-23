import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
  username: string;
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env var is required");
  return s;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, secret()) as TokenPayload;
}
