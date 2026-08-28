ALTER TABLE "named_face_value_value_proposals"
ADD COLUMN "merged_value_schedule_value_id" TEXT
REFERENCES "value_schedule_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "named_face_value_value_proposals_merged_value_schedule_value_id_idx"
ON "named_face_value_value_proposals"("merged_value_schedule_value_id");
