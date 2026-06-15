import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { env } from "@/config/env.js";

export interface SessionTokenPayload {
  sub: string; // user id
  publicKey: string;
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload & jwt.JwtPayload;
}

/** We never store raw JWTs — only their hash, so a leaked DB dump can't be replayed as sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
