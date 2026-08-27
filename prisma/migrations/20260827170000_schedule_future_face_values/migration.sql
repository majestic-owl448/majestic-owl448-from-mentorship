PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- RedefineTable
CREATE TABLE "new_value_schedule_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value_schedule_id" TEXT NOT NULL,
    "amount" TEXT NOT NULL CHECK (
        "amount" NOT GLOB '*[^0-9.]*'
        AND "amount" NOT GLOB '*.*.*'
        AND "amount" GLOB '*[0-9]*'
        AND CAST("amount" AS NUMERIC) >= 0
    ),
    "effective_on" TEXT CHECK (
        "effective_on" IS NULL
        OR (
            "effective_on" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND date("effective_on", '+0 days') = "effective_on"
        )
    ),
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "value_schedule_values_value_schedule_id_fkey" FOREIGN KEY ("value_schedule_id") REFERENCES "value_schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_value_schedule_values" ("amount", "created_at", "id", "updated_at", "value_schedule_id")
SELECT "amount", "created_at", "id", "updated_at", "value_schedule_id" FROM "value_schedule_values";
DROP TABLE "value_schedule_values";
ALTER TABLE "new_value_schedule_values" RENAME TO "value_schedule_values";

-- One value per dated change and one undated baseline per schedule.
CREATE UNIQUE INDEX "value_schedule_values_value_schedule_id_effective_on_key" ON "value_schedule_values"("value_schedule_id", "effective_on");
CREATE UNIQUE INDEX "value_schedule_values_one_baseline_key" ON "value_schedule_values"("value_schedule_id") WHERE "effective_on" IS NULL;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
