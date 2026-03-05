-- AlterTable
ALTER TABLE `userSettings`
    ADD COLUMN `emailRemindersEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailReminderFrequencyDays` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `emailReminderHour` INTEGER NOT NULL DEFAULT 8,
    ADD COLUMN `emailReminderTimeZone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Zurich',
    ADD COLUMN `emailReminderLastSentAt` DATETIME(3) NULL;
