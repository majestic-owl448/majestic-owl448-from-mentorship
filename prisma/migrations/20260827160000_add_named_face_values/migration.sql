-- CreateTable
CREATE TABLE "value_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country_code" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "value_schedules_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "value_schedule_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value_schedule_id" TEXT NOT NULL,
    "amount" TEXT NOT NULL CHECK (
        "amount" NOT GLOB '*[^0-9.]*'
        AND "amount" NOT GLOB '*.*.*'
        AND "amount" GLOB '*[0-9]*'
        AND CAST("amount" AS NUMERIC) >= 0
    ),
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "value_schedule_values_value_schedule_id_fkey" FOREIGN KEY ("value_schedule_id") REFERENCES "value_schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "named_face_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country_code" TEXT NOT NULL,
    "display_code" TEXT NOT NULL,
    "normalized_code" TEXT NOT NULL,
    "value_schedule_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "named_face_values_value_schedule_id_country_code_fkey" FOREIGN KEY ("value_schedule_id", "country_code") REFERENCES "value_schedules" ("id", "country_code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "value_schedules_id_country_code_key" ON "value_schedules"("id", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "value_schedule_values_value_schedule_id_key" ON "value_schedule_values"("value_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "named_face_values_country_code_normalized_code_key" ON "named_face_values"("country_code", "normalized_code");
