import type { FastifyReply, FastifyRequest } from "fastify";
import { NotificationService } from "@/services/notification.service.js";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const unreadOnly = (request.query as { unreadOnly?: string }).unreadOnly === "true";
    const [notifications, unreadCount] = await Promise.all([
      this.notificationService.list(request.currentUser!.id, unreadOnly),
      this.notificationService.unreadCount(request.currentUser!.id),
    ]);
    reply.send({ notifications, unreadCount });
  };

  markRead = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    await this.notificationService.markRead(request.currentUser!.id, id);
    reply.status(204).send();
  };

  markAllRead = async (request: FastifyRequest, reply: FastifyReply) => {
    await this.notificationService.markAllRead(request.currentUser!.id);
    reply.status(204).send();
  };
}
