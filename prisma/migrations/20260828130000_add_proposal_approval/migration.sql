ALTER TABLE "named_face_value_definition_proposals"
ADD COLUMN "approved_named_face_value_id" TEXT
REFERENCES "named_face_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "named_face_value_definition_proposals"
ADD COLUMN "moderated_by_id" TEXT
REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "named_face_value_definition_proposals"
ADD COLUMN "decided_at" DATETIME;

ALTER TABLE "named_face_value_definition_proposals"
ADD COLUMN "decision_note" TEXT;

CREATE INDEX "named_face_value_definition_proposals_moderated_by_id_idx"
ON "named_face_value_definition_proposals"("moderated_by_id");

ALTER TABLE "named_face_value_value_proposals"
ADD COLUMN "moderated_by_id" TEXT
REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "named_face_value_value_proposals"
ADD COLUMN "decided_at" DATETIME;

ALTER TABLE "named_face_value_value_proposals"
ADD COLUMN "decision_note" TEXT;

CREATE INDEX "named_face_value_value_proposals_moderated_by_id_idx"
ON "named_face_value_value_proposals"("moderated_by_id");

ALTER TABLE "currency_conversion_proposals"
ADD COLUMN "moderated_by_id" TEXT
REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "currency_conversion_proposals"
ADD COLUMN "decided_at" DATETIME;

ALTER TABLE "currency_conversion_proposals"
ADD COLUMN "decision_note" TEXT;

CREATE INDEX "currency_conversion_proposals_moderated_by_id_idx"
ON "currency_conversion_proposals"("moderated_by_id");

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "approval_stamp_inventory_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "postal_entity_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year_of_issue" INTEGER,
    "face_value_type" TEXT NOT NULL DEFAULT 'MONETARY',
    "face_amount" TEXT CHECK (
        "face_amount" IS NULL OR (
            "face_amount" NOT GLOB '*[^0-9.]*'
            AND "face_amount" NOT GLOB '*.*.*'
            AND "face_amount" GLOB '*[0-9]*'
            AND CAST("face_amount" AS NUMERIC) >= 0
        )
    ),
    "face_currency_code" TEXT,
    "named_face_value_id" TEXT,
    "named_face_value_proposal_id" TEXT,
    "manual_postage_amount" TEXT CHECK (
        "manual_postage_amount" IS NULL OR (
            "manual_postage_amount" NOT GLOB '*[^0-9.]*'
            AND "manual_postage_amount" NOT GLOB '*.*.*'
            AND "manual_postage_amount" GLOB '*[0-9]*'
            AND CAST("manual_postage_amount" AS NUMERIC) >= 0
        )
    ),
    "manual_postage_currency_code" TEXT,
    "quantity_owned" INTEGER NOT NULL CHECK ("quantity_owned" > 0),
    "quantity_annulled" INTEGER NOT NULL DEFAULT 0 CHECK (
        "quantity_annulled" >= 0 AND "quantity_annulled" <= "quantity_owned"
    ),
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "stamp_inventory_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stamp_inventory_entries_postal_entity_id_country_code_fkey" FOREIGN KEY ("postal_entity_id", "country_code") REFERENCES "postal_entities" ("id", "country_code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stamp_inventory_entries_named_face_value_id_fkey" FOREIGN KEY ("named_face_value_id") REFERENCES "named_face_values" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stamp_inventory_entries_named_face_value_proposal_id_country_code_fkey" FOREIGN KEY ("named_face_value_proposal_id", "country_code") REFERENCES "named_face_value_definition_proposals" ("id", "country_code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stamp_inventory_entries_manual_postage_pair_check" CHECK (
        ("manual_postage_amount" IS NULL) = ("manual_postage_currency_code" IS NULL)
    ),
    CONSTRAINT "stamp_inventory_entries_face_value_check" CHECK (
        ("face_value_type" = 'MONETARY' AND "face_amount" IS NOT NULL AND "face_currency_code" IS NOT NULL AND "named_face_value_id" IS NULL AND "named_face_value_proposal_id" IS NULL)
        OR
        ("face_value_type" = 'NAMED' AND "face_amount" IS NULL AND "face_currency_code" IS NULL AND (("named_face_value_id" IS NULL) <> ("named_face_value_proposal_id" IS NULL)))
        OR
        ("face_value_type" = 'NONE' AND "face_amount" IS NULL AND "face_currency_code" IS NULL AND "named_face_value_id" IS NULL AND "named_face_value_proposal_id" IS NULL)
    )
);

INSERT INTO "approval_stamp_inventory_entries" (
    "country_code", "created_at", "expired", "face_amount",
    "face_currency_code", "id", "manual_postage_amount",
    "manual_postage_currency_code", "name", "named_face_value_id",
    "named_face_value_proposal_id", "postal_entity_id", "quantity_annulled",
    "quantity_owned", "updated_at", "user_id", "year_of_issue",
    "face_value_type"
)
SELECT
    "country_code", "created_at", "expired", "face_amount",
    "face_currency_code", "id", "manual_postage_amount",
    "manual_postage_currency_code", "name", "named_face_value_id",
    "named_face_value_proposal_id", "postal_entity_id", "quantity_annulled",
    "quantity_owned", "updated_at", "user_id", "year_of_issue",
    "face_value_type"
FROM "stamp_inventory_entries";

DROP TABLE "stamp_inventory_entries";
ALTER TABLE "approval_stamp_inventory_entries" RENAME TO "stamp_inventory_entries";
CREATE INDEX "stamp_inventory_entries_user_id_created_at_idx"
ON "stamp_inventory_entries"("user_id", "created_at");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
