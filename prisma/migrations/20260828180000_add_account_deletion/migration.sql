-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "deleting_at" DATETIME;

-- CreateTable
CREATE TABLE "account_deletion_jobs" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_currency_conversion_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitted_by_id" TEXT,
    "target_currency_conversion_id" TEXT,
    "from_currency_code" TEXT NOT NULL,
    "to_currency_code" TEXT NOT NULL,
    "multiplier" TEXT NOT NULL CHECK (
        "multiplier" GLOB '[0-9]*'
        AND "multiplier" NOT GLOB '*[^0-9.]*'
        AND "multiplier" NOT GLOB '*.*.*'
        AND "multiplier" GLOB '*[0-9]*'
        AND CAST("multiplier" AS NUMERIC) > 0
    ),
    "source_url" TEXT,
    "source_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderated_by_id" TEXT,
    "decided_at" DATETIME,
    "decision_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "currency_conversion_proposals_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_target_currency_conversion_id_fkey" FOREIGN KEY ("target_currency_conversion_id") REFERENCES "currency_conversions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_from_currency_code_fkey" FOREIGN KEY ("from_currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_to_currency_code_fkey" FOREIGN KEY ("to_currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_distinct_currencies_check" CHECK ("from_currency_code" <> "to_currency_code"),
    CONSTRAINT "currency_conversion_proposals_source_check" CHECK ("source_url" IS NOT NULL OR "source_note" IS NOT NULL)
);
INSERT INTO "new_currency_conversion_proposals" ("created_at", "decided_at", "decision_note", "from_currency_code", "id", "moderated_by_id", "multiplier", "source_note", "source_url", "status", "submitted_by_id", "target_currency_conversion_id", "to_currency_code") SELECT "created_at", "decided_at", "decision_note", "from_currency_code", "id", "moderated_by_id", "multiplier", "source_note", "source_url", "status", "submitted_by_id", "target_currency_conversion_id", "to_currency_code" FROM "currency_conversion_proposals";
DROP TABLE "currency_conversion_proposals";
ALTER TABLE "new_currency_conversion_proposals" RENAME TO "currency_conversion_proposals";
CREATE INDEX "currency_conversion_proposals_submitted_by_id_status_created_at_idx" ON "currency_conversion_proposals"("submitted_by_id", "status", "created_at");
CREATE INDEX "currency_conversion_proposals_submitted_by_id_from_currency_code_to_currency_code_status_created_at_idx" ON "currency_conversion_proposals"("submitted_by_id", "from_currency_code", "to_currency_code", "status", "created_at");
CREATE INDEX "currency_conversion_proposals_moderated_by_id_idx" ON "currency_conversion_proposals"("moderated_by_id");
CREATE TABLE "new_named_face_value_definition_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitted_by_id" TEXT,
    "target_named_face_value_id" TEXT,
    "approved_named_face_value_id" TEXT,
    "country_code" TEXT NOT NULL,
    "display_code" TEXT NOT NULL,
    "normalized_code" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "source_url" TEXT,
    "source_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderated_by_id" TEXT,
    "decided_at" DATETIME,
    "decision_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "named_face_value_definition_proposals_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_definition_proposals_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_definition_proposals_target_named_face_value_id_fkey" FOREIGN KEY ("target_named_face_value_id") REFERENCES "named_face_values" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_definition_proposals_approved_named_face_value_id_fkey" FOREIGN KEY ("approved_named_face_value_id") REFERENCES "named_face_values" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_definition_proposals_source_check" CHECK (
        "source_url" IS NOT NULL OR "source_note" IS NOT NULL
    )
);
INSERT INTO "new_named_face_value_definition_proposals" ("approved_named_face_value_id", "country_code", "created_at", "currency_code", "decided_at", "decision_note", "display_code", "id", "moderated_by_id", "normalized_code", "source_note", "source_url", "status", "submitted_by_id", "target_named_face_value_id") SELECT "approved_named_face_value_id", "country_code", "created_at", "currency_code", "decided_at", "decision_note", "display_code", "id", "moderated_by_id", "normalized_code", "source_note", "source_url", "status", "submitted_by_id", "target_named_face_value_id" FROM "named_face_value_definition_proposals";
DROP TABLE "named_face_value_definition_proposals";
ALTER TABLE "new_named_face_value_definition_proposals" RENAME TO "named_face_value_definition_proposals";
CREATE INDEX "named_face_value_definition_proposals_submitted_by_id_status_created_at_idx" ON "named_face_value_definition_proposals"("submitted_by_id", "status", "created_at");
CREATE INDEX "named_face_value_definition_proposals_country_code_normalized_code_idx" ON "named_face_value_definition_proposals"("country_code", "normalized_code");
CREATE INDEX "named_face_value_definition_proposals_moderated_by_id_idx" ON "named_face_value_definition_proposals"("moderated_by_id");
CREATE UNIQUE INDEX "named_face_value_definition_proposals_id_country_code_key" ON "named_face_value_definition_proposals"("id", "country_code");
CREATE TABLE "new_named_face_value_value_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitted_by_id" TEXT,
    "named_face_value_id" TEXT,
    "definition_proposal_id" TEXT,
    "merged_value_schedule_value_id" TEXT,
    "amount" TEXT NOT NULL CHECK (
        "amount" NOT GLOB '*[^0-9.]*'
        AND "amount" NOT GLOB '*.*.*'
        AND "amount" GLOB '*[0-9]*'
        AND CAST("amount" AS NUMERIC) >= 0
    ),
    "effective_on" TEXT,
    "eligible_on" TEXT NOT NULL,
    "source_url" TEXT,
    "source_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderated_by_id" TEXT,
    "decided_at" DATETIME,
    "decision_note" TEXT,
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "named_face_value_value_proposals_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_value_proposals_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "user_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_value_proposals_named_face_value_id_fkey" FOREIGN KEY ("named_face_value_id") REFERENCES "named_face_values" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_value_proposals_definition_proposal_id_fkey" FOREIGN KEY ("definition_proposal_id") REFERENCES "named_face_value_definition_proposals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_value_proposals_merged_value_schedule_value_id_fkey" FOREIGN KEY ("merged_value_schedule_value_id") REFERENCES "value_schedule_values" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "named_face_value_value_proposals_target_check" CHECK (
        ("named_face_value_id" IS NULL) <> ("definition_proposal_id" IS NULL)
    ),
    CONSTRAINT "named_face_value_value_proposals_source_check" CHECK (
        "source_url" IS NOT NULL OR "source_note" IS NOT NULL
    )
);
INSERT INTO "new_named_face_value_value_proposals" ("action_required", "amount", "created_at", "decided_at", "decision_note", "definition_proposal_id", "effective_on", "eligible_on", "id", "merged_value_schedule_value_id", "moderated_by_id", "named_face_value_id", "source_note", "source_url", "status", "submitted_by_id") SELECT "action_required", "amount", "created_at", "decided_at", "decision_note", "definition_proposal_id", "effective_on", "eligible_on", "id", "merged_value_schedule_value_id", "moderated_by_id", "named_face_value_id", "source_note", "source_url", "status", "submitted_by_id" FROM "named_face_value_value_proposals";
DROP TABLE "named_face_value_value_proposals";
ALTER TABLE "new_named_face_value_value_proposals" RENAME TO "named_face_value_value_proposals";
CREATE INDEX "named_face_value_value_proposals_submitted_by_id_status_created_at_idx" ON "named_face_value_value_proposals"("submitted_by_id", "status", "created_at");
CREATE INDEX "named_face_value_value_proposals_named_face_value_id_effective_on_idx" ON "named_face_value_value_proposals"("named_face_value_id", "effective_on");
CREATE INDEX "named_face_value_value_proposals_definition_proposal_id_effective_on_idx" ON "named_face_value_value_proposals"("definition_proposal_id", "effective_on");
CREATE INDEX "named_face_value_value_proposals_merged_value_schedule_value_id_idx" ON "named_face_value_value_proposals"("merged_value_schedule_value_id");
CREATE INDEX "named_face_value_value_proposals_moderated_by_id_idx" ON "named_face_value_value_proposals"("moderated_by_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
