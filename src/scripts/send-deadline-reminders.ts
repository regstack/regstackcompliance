import { runDeadlineReminders } from "../modules/notifications/deadlineReminders";
import { logger } from "../utils/logger";
import { prisma } from "../db/prisma";

// Meant to run on a schedule (daily is enough — see .github/workflows/deadline-reminders.yml,
// or point any external cron / hosting-platform scheduled job at
// `npm run reminders:send` instead). There is no in-process scheduler in this backend, so this
// script is designed to run once and exit, not to stay resident.
runDeadlineReminders()
  .then((summary) => {
    logger.info(summary, "Fristen-Erinnerungslauf abgeschlossen");
  })
  .catch((err) => {
    logger.error(err, "Fristen-Erinnerungslauf fehlgeschlagen");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
