/*
  Warnings:

  - You are about to drop the `einkaufs_gruppe` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `einkaufs_item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `einkaufs_gruppe` DROP FOREIGN KEY `einkaufs_gruppe_userId_fkey`;

-- DropForeignKey
ALTER TABLE `einkaufs_item` DROP FOREIGN KEY `einkaufs_item_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `einkaufs_item` DROP FOREIGN KEY `einkaufs_item_userId_fkey`;

-- DropTable
DROP TABLE `einkaufs_gruppe`;

-- DropTable
DROP TABLE `einkaufs_item`;

-- CreateTable
CREATE TABLE `shopping_group` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shopping_item` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL DEFAULT '',
    `done` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `groupId` VARCHAR(191) NULL,

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `shopping_group` ADD CONSTRAINT `shopping_group_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_item` ADD CONSTRAINT `shopping_item_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_item` ADD CONSTRAINT `shopping_item_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `shopping_group`(`_id`) ON DELETE SET NULL ON UPDATE CASCADE;
