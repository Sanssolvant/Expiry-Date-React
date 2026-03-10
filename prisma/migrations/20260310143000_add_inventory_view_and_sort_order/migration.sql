-- AlterTable
ALTER TABLE `produkt`
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `userSettings`
    ADD COLUMN `inventoryLayoutMode` VARCHAR(191) NOT NULL DEFAULT 'cards',
    ADD COLUMN `inventorySortMode` VARCHAR(191) NOT NULL DEFAULT 'manual';
