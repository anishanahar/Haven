import type { NotificationType, PrismaClient } from "@prisma/client";

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: { userId: string; type: NotificationType; title: string; body: string; goalId?: string }) {
    return this.prisma.notification.create({ data });
  }

  findManyForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }
}
