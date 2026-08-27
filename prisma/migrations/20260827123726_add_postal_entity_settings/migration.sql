-- CreateTable
CREATE TABLE "postal_entities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "postal_entities_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_postal_entity_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "postal_entity_id" TEXT NOT NULL,
    "display_currency_code" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "time_zone_mode" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_postal_entity_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_postal_entity_settings_postal_entity_id_fkey" FOREIGN KEY ("postal_entity_id") REFERENCES "postal_entities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "active_postal_entity_setting_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_profiles_active_postal_entity_setting_id_fkey" FOREIGN KEY ("active_postal_entity_setting_id") REFERENCES "user_postal_entity_settings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_profiles" ("created_at", "email", "id", "role", "updated_at") SELECT "created_at", "email", "id", "role", "updated_at" FROM "user_profiles";
DROP TABLE "user_profiles";
ALTER TABLE "new_user_profiles" RENAME TO "user_profiles";
CREATE UNIQUE INDEX "user_profiles_active_postal_entity_setting_id_key" ON "user_profiles"("active_postal_entity_setting_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "postal_entities_country_code_normalized_name_idx" ON "postal_entities"("country_code", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_postal_entity_settings_user_id_postal_entity_id_key" ON "user_postal_entity_settings"("user_id", "postal_entity_id");
