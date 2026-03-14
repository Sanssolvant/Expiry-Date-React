CREATE INDEX `user_createdAt_idx` ON `user`(`createdAt`);
CREATE INDEX `user_emailVerified_idx` ON `user`(`emailVerified`);
CREATE INDEX `user_premium_idx` ON `user`(`premium`);
CREATE INDEX `user_role_idx` ON `user`(`role`);
CREATE INDEX `user_banned_banExpires_idx` ON `user`(`banned`, `banExpires`);

CREATE INDEX `session_userId_idx` ON `session`(`userId`);
CREATE INDEX `session_expiresAt_idx` ON `session`(`expiresAt`);

CREATE INDEX `account_userId_idx` ON `account`(`userId`);

CREATE INDEX `verification_identifier_idx` ON `verification`(`identifier`);
CREATE INDEX `verification_expiresAt_idx` ON `verification`(`expiresAt`);

CREATE INDEX `produkt_userId_sortOrder_idx` ON `produkt`(`userId`, `sortOrder`);
CREATE INDEX `produkt_userId_createdAt_idx` ON `produkt`(`userId`, `createdAt`);
CREATE INDEX `produkt_userId_ablaufdatum_idx` ON `produkt`(`userId`, `ablaufdatum`);

CREATE INDEX `userSettings_emailRemindersEnabled_idx` ON `userSettings`(`emailRemindersEnabled`);

CREATE INDEX `shopping_group_userId_order_idx` ON `shopping_group`(`userId`, `order`);

CREATE INDEX `shopping_item_userId_order_idx` ON `shopping_item`(`userId`, `order`);
CREATE INDEX `shopping_item_userId_groupId_order_idx` ON `shopping_item`(`userId`, `groupId`, `order`);
