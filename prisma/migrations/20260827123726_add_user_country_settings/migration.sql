-- CreateTable
CREATE TABLE "user_country_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "display_currency_code" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "time_zone_mode" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_country_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "active_country_setting_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_profiles_active_country_setting_id_fkey" FOREIGN KEY ("active_country_setting_id") REFERENCES "user_country_settings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_profiles" ("created_at", "email", "id", "role", "updated_at") SELECT "created_at", "email", "id", "role", "updated_at" FROM "user_profiles";
DROP TABLE "user_profiles";
ALTER TABLE "new_user_profiles" RENAME TO "user_profiles";
CREATE UNIQUE INDEX "user_profiles_active_country_setting_id_key" ON "user_profiles"("active_country_setting_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_country_settings_user_id_country_code_key" ON "user_country_settings"("user_id", "country_code");
