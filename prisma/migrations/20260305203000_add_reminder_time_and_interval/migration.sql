-- AlterTable
ALTER TABLE `userSettings`
    ADD COLUMN `emailReminderTime` VARCHAR(191) NOT NULL DEFAULT '08:00',
    ADD COLUMN `emailReminderIntervalValue` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `emailReminderIntervalUnit` VARCHAR(191) NOT NULL DEFAULT 'day';
