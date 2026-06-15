import type { PrismaClient } from "@prisma/client";

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByPublicKey(publicKey: string) {
    return this.prisma.user.findUnique({ where: { publicKey } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOrCreateByPublicKey(publicKey: string) {
    const existing = await this.findByPublicKey(publicKey);
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { publicKey } });
      await tx.wallet.create({ data: { userId: user.id, publicKey, isPrimary: true } });
      return user;
    });
  }

  updateProfile(id: string, data: { displayName?: string; currency?: string; theme?: string; email?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
