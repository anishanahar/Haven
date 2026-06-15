import type { PrismaClient } from "@prisma/client";
import { NotificationRepository } from "@/repositories/notification.repository.js";

const REMINDER_WINDOW_DAYS = 7;

/** Notifies owners of open goals whose deadline falls within the next week — at most once per goal per day, so it's safe to run this job repeatedly. */
export async function runDeadlineReminders(prisma: PrismaClient, log: { info: (o: unknown, msg?: string) => void }) {
  const notifications = new NotificationRepository(prisma);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 86_400_000);
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const upcoming = await prisma.goal.findMany({
    where: { closed: false, completed: false, unlockDate: { gte: now, lte: windowEnd } },
  });

  let sent = 0;
  for (const goal of upcoming) {
    const alreadySentToday = await prisma.notification.findFirst({
      where: { userId: goal.userId, goalId: goal.id, type: "DEADLINE_APPROACHING", createdAt: { gte: todayStart } },
    });
    if (alreadySentToday) continue;

    const daysLeft = Math.max(Math.ceil((goal.unlockDate.getTime() - now.getTime()) / 86_400_000), 0);
    await notifications.create({
      userId: goal.userId,
      type: "DEADLINE_APPROACHING",
      title: "Deadline approaching",
      body: `"${goal.name}" is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
      goalId: goal.id,
    });
    sent += 1;
  }

  log.info({ sent }, "jobs: deadline reminders complete");
}
