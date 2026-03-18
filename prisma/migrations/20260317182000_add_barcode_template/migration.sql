-- CreateTable
CREATE TABLE `barcode_template` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kategorie` VARCHAR(191) NOT NULL,
    `bildUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `einheit` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `barcode_template_userId_barcode_key`(`userId`, `barcode`),
    INDEX `barcode_template_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `barcode_template` ADD CONSTRAINT `barcode_template_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;
