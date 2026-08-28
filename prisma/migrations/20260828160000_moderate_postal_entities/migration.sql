-- RedefineTable
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_postal_entities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT '',
    "source_url" TEXT,
    "source_note" TEXT,
    "submitted_name" TEXT NOT NULL DEFAULT '',
    "submitted_normalized_name" TEXT NOT NULL DEFAULT '',
    "submitted_country_code" TEXT NOT NULL DEFAULT '',
    "submitted_issuing_authority" TEXT NOT NULL DEFAULT '',
    "submitted_scope" TEXT NOT NULL DEFAULT '',
    "submitted_source_url" TEXT,
    "submitted_source_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_by_id" TEXT,
    "moderated_by_id" TEXT,
    "decided_at" DATETIME,
    "decision_note" TEXT,
    "merged_into_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "postal_entities_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "postal_entities_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "postal_entities_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "postal_entities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_postal_entities" (
    "country_code", "created_at", "id", "name", "normalized_name",
    "status", "submitted_by_id", "submitted_name",
    "submitted_normalized_name", "submitted_country_code", "updated_at"
)
SELECT
    "country_code", "created_at", "id", "name", "normalized_name",
    "status", "submitted_by_id", "name", "normalized_name", "country_code",
    "updated_at"
FROM "postal_entities";
DROP TABLE "postal_entities";
ALTER TABLE "new_postal_entities" RENAME TO "postal_entities";
CREATE INDEX "postal_entities_country_code_normalized_name_idx" ON "postal_entities"("country_code", "normalized_name");
CREATE INDEX "postal_entities_status_created_at_idx" ON "postal_entities"("status", "created_at");
CREATE INDEX "postal_entities_moderated_by_id_idx" ON "postal_entities"("moderated_by_id");
CREATE INDEX "postal_entities_merged_into_id_idx" ON "postal_entities"("merged_into_id");
CREATE UNIQUE INDEX "postal_entities_id_country_code_key" ON "postal_entities"("id", "country_code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
