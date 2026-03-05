-- Better Auth calls prisma.session.delete({ where: { token } })
-- so token must be unique in Prisma's SessionWhereUniqueInput.
-- Remove duplicate tokens first (keep the lexicographically smallest _id).
DELETE s1
FROM `session` s1
INNER JOIN `session` s2
  ON s1.`token` = s2.`token`
 AND s1.`_id` > s2.`_id`;

CREATE UNIQUE INDEX `session_token_key` ON `session`(`token`);
