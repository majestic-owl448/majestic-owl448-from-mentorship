/*
  Warnings:

  - You are about to drop the column `time_zone` on the `user_postal_entity_settings` table. All the data in the column will be lost.
  - You are about to drop the column `time_zone_mode` on the `user_postal_entity_settings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "time_zone" TEXT NOT NULL DEFAULT 'UTC',
    "time_zone_mode" TEXT NOT NULL DEFAULT 'SYSTEM',
    "active_postal_entity_setting_id" TEXT,
    "deleting_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_profiles_active_postal_entity_setting_id_fkey" FOREIGN KEY ("active_postal_entity_setting_id") REFERENCES "user_postal_entity_settings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_profiles" ("active_postal_entity_setting_id", "created_at", "deleting_at", "email", "id", "role", "time_zone", "time_zone_mode", "updated_at")
SELECT "active_postal_entity_setting_id", "created_at", "deleting_at", "email", "id", "role",
  COALESCE((SELECT "time_zone" FROM "user_postal_entity_settings" WHERE "id" = "user_profiles"."active_postal_entity_setting_id"), 'UTC'),
  COALESCE((SELECT "time_zone_mode" FROM "user_postal_entity_settings" WHERE "id" = "user_profiles"."active_postal_entity_setting_id"), 'SYSTEM'),
  "updated_at"
FROM "user_profiles";
DROP TABLE "user_profiles";
ALTER TABLE "new_user_profiles" RENAME TO "user_profiles";
CREATE UNIQUE INDEX "user_profiles_active_postal_entity_setting_id_key" ON "user_profiles"("active_postal_entity_setting_id");
CREATE TABLE "new_user_postal_entity_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "postal_entity_id" TEXT NOT NULL,
    "display_currency_code" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_postal_entity_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_postal_entity_settings_postal_entity_id_fkey" FOREIGN KEY ("postal_entity_id") REFERENCES "postal_entities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_user_postal_entity_settings" ("created_at", "display_currency_code", "id", "postal_entity_id", "updated_at", "user_id") SELECT "created_at", "display_currency_code", "id", "postal_entity_id", "updated_at", "user_id" FROM "user_postal_entity_settings";
DROP TABLE "user_postal_entity_settings";
ALTER TABLE "new_user_postal_entity_settings" RENAME TO "user_postal_entity_settings";
CREATE UNIQUE INDEX "user_postal_entity_settings_user_id_postal_entity_id_key" ON "user_postal_entity_settings"("user_id", "postal_entity_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
