import { AuthChallengeRepository, SessionRepository } from "@/repositories/session.repository.js";
import { UserRepository } from "@/repositories/user.repository.js";
import { Sep10Service } from "@/services/sep10.service.js";
import { hashToken, signSessionToken } from "@/utils/jwt.js";
import { ApiError } from "@/utils/errors.js";
import { env } from "@/config/env.js";

export class AuthService {
  constructor(
    private readonly challenges: AuthChallengeRepository,
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly sep10: Sep10Service,
  ) {}

  async issueChallenge(publicKey: string) {
    const { challengeXdr, nonce } = this.sep10.buildChallenge(publicKey);
    const expiresAt = new Date(Date.now() + env.SEP10_CHALLENGE_TTL_SECONDS * 1000);
    await this.challenges.create({ publicKey, challengeXdr, nonce, expiresAt });
    return { challengeXdr, nonce, expiresAt };
  }

  async verifyAndCreateSession(
    publicKey: string,
    nonce: string,
    signedChallengeXdr: string,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const challenge = await this.challenges.findByNonce(nonce);
    if (!challenge) {
      throw new ApiError(401, "INVALID_CHALLENGE", "No challenge found for this nonce");
    }
    if (challenge.usedAt) {
      throw new ApiError(401, "CHALLENGE_ALREADY_USED", "This challenge has already been consumed");
    }
    if (challenge.expiresAt < new Date()) {
      throw new ApiError(401, "CHALLENGE_EXPIRED", "This challenge has expired; request a new one");
    }
    if (challenge.publicKey !== publicKey) {
      throw new ApiError(401, "CHALLENGE_MISMATCH", "Challenge was not issued for this public key");
    }

    try {
      this.sep10.verifyChallenge(signedChallengeXdr, publicKey);
    } catch {
      throw new ApiError(401, "INVALID_SIGNATURE", "Challenge signature verification failed");
    }

    await this.challenges.markUsed(challenge.id);

    const user = await this.users.findOrCreateByPublicKey(publicKey);
    const token = signSessionToken({ sub: user.id, publicKey });
    const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_EXPIRES_IN));

    await this.sessions.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return { token, user, expiresAt };
  }

  async logout(token: string) {
    await this.sessions.revoke(hashToken(token));
  }
}

/** Parses simple "7d" / "12h" / "30m" style durations into milliseconds. */
function parseExpiry(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as "s" | "m" | "h" | "d"];
  return amount * unitMs;
}
