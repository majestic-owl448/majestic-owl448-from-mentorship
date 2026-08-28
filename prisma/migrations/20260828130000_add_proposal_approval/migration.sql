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
