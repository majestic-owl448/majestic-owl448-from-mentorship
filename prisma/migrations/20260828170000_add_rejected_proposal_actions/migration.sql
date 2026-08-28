ALTER TABLE "named_face_value_value_proposals"
ADD COLUMN "action_required" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "stamp_proposal_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stamp_id" TEXT NOT NULL,
    "named_definition_proposal_id" TEXT,
    "named_value_proposal_id" TEXT,
    "currency_conversion_proposal_id" TEXT,
    "resolved_at" DATETIME,
    "resolution" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stamp_proposal_actions_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamp_inventory_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stamp_proposal_actions_named_definition_proposal_id_fkey" FOREIGN KEY ("named_definition_proposal_id") REFERENCES "named_face_value_definition_proposals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stamp_proposal_actions_named_value_proposal_id_fkey" FOREIGN KEY ("named_value_proposal_id") REFERENCES "named_face_value_value_proposals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stamp_proposal_actions_currency_conversion_proposal_id_fkey" FOREIGN KEY ("currency_conversion_proposal_id") REFERENCES "currency_conversion_proposals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stamp_proposal_actions_single_proposal_check" CHECK (
        ("named_definition_proposal_id" IS NOT NULL) +
        ("named_value_proposal_id" IS NOT NULL) +
        ("currency_conversion_proposal_id" IS NOT NULL) = 1
    )
);

CREATE UNIQUE INDEX "stamp_proposal_actions_stamp_id_named_definition_proposal_id_key"
ON "stamp_proposal_actions"("stamp_id", "named_definition_proposal_id");

CREATE UNIQUE INDEX "stamp_proposal_actions_stamp_id_named_value_proposal_id_key"
ON "stamp_proposal_actions"("stamp_id", "named_value_proposal_id");

CREATE UNIQUE INDEX "stamp_proposal_actions_stamp_id_currency_conversion_proposal_id_key"
ON "stamp_proposal_actions"("stamp_id", "currency_conversion_proposal_id");

CREATE INDEX "stamp_proposal_actions_stamp_id_resolved_at_idx"
ON "stamp_proposal_actions"("stamp_id", "resolved_at");
