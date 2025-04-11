-- CreateTable
CREATE TABLE `user` (
    `_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` VARCHAR(191) NULL,
    `premium` BOOLEAN NOT NULL DEFAULT false,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `banned` BOOLEAN NOT NULL DEFAULT false,
    `banReason` VARCHAR(191) NULL,
    `banExpires` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `impersonatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(191) NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `idToken` TEXT NULL,

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification` (
    `_id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produkt` (
    `_id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `menge` DOUBLE NOT NULL,
    `einheit` VARCHAR(191) NOT NULL,
    `ablaufdatum` DATETIME(3) NOT NULL,
    `erfasstAm` DATETIME(3) NOT NULL,
    `kategorie` VARCHAR(191) NOT NULL,
    `bildUrl` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userSettings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `warnLevelBald` INTEGER NOT NULL DEFAULT 3,
    `warnLevelExpired` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `userSettings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produkt` ADD CONSTRAINT `produkt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userSettings` ADD CONSTRAINT `userSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`_id`) ON DELETE CASCADE ON UPDATE CASCADE;
