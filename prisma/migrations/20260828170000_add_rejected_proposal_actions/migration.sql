ALTER TABLE "stamp_inventory_entries"
ADD COLUMN "action_required" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "named_face_value_value_proposals"
ADD COLUMN "action_required" BOOLEAN NOT NULL DEFAULT false;
