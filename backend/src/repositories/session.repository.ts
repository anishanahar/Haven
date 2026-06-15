import type { PrismaClient } from "@prisma/client";

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: { userId: string; tokenHash: string; expiresAt: Date; userAgent?: string; ipAddress?: string }) {
    return this.prisma.session.create({ data });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.session.findUnique({ where: { tokenHash } });
  }

  revoke(tokenHash: string) {
    return this.prisma.session.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }
}

export class AuthChallengeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: { publicKey: string; challengeXdr: string; nonce: string; expiresAt: Date }) {
    return this.prisma.authChallenge.create({ data });
  }

  findByNonce(nonce: string) {
    return this.prisma.authChallenge.findUnique({ where: { nonce } });
  }

  markUsed(id: string) {
    return this.prisma.authChallenge.update({ where: { id }, data: { usedAt: new Date() } });
  }
}
