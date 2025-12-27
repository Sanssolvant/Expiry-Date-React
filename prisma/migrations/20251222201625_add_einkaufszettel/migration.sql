-- CreateTable
CREATE TABLE `einkaufs_gruppe` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `einkaufs_item` (
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
ALTER TABLE `einkaufs_gruppe` ADD CONSTRAINT `einkaufs_gruppe_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `einkaufs_item` ADD CONSTRAINT `einkaufs_item_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `einkaufs_item` ADD CONSTRAINT `einkaufs_item_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `einkaufs_gruppe`(`_id`) ON DELETE SET NULL ON UPDATE CASCADE;
