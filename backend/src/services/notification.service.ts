import { NotificationRepository } from "@/repositories/notification.repository.js";
import { ApiError } from "@/utils/errors.js";

export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  list(userId: string, unreadOnly: boolean) {
    return this.notifications.findManyForUser(userId, { unreadOnly });
  }

  unreadCount(userId: string) {
    return this.notifications.unreadCount(userId);
  }

  async markRead(userId: string, id: string) {
    const result = await this.notifications.markRead(id, userId);
    if (result.count === 0) {
      throw new ApiError(404, "NOT_FOUND", "Notification not found");
    }
  }

  markAllRead(userId: string) {
    return this.notifications.markAllRead(userId);
  }
}
