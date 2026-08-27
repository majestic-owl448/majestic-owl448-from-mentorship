-- CreateTable
CREATE TABLE "currency_conversion_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitted_by_id" TEXT NOT NULL,
    "target_currency_conversion_id" TEXT,
    "from_currency_code" TEXT NOT NULL,
    "to_currency_code" TEXT NOT NULL,
    "multiplier" TEXT NOT NULL CHECK (
        "multiplier" GLOB '[0-9]*'
        AND
        "multiplier" NOT GLOB '*[^0-9.]*'
        AND "multiplier" NOT GLOB '*.*.*'
        AND "multiplier" GLOB '*[0-9]*'
        AND CAST("multiplier" AS NUMERIC) > 0
    ),
    "source_url" TEXT,
    "source_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "currency_conversion_proposals_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_target_currency_conversion_id_fkey" FOREIGN KEY ("target_currency_conversion_id") REFERENCES "currency_conversions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_from_currency_code_fkey" FOREIGN KEY ("from_currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_to_currency_code_fkey" FOREIGN KEY ("to_currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversion_proposals_distinct_currencies_check" CHECK ("from_currency_code" <> "to_currency_code"),
    CONSTRAINT "currency_conversion_proposals_source_check" CHECK ("source_url" IS NOT NULL OR "source_note" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "currency_conversion_proposals_submitted_by_id_status_created_at_idx" ON "currency_conversion_proposals"("submitted_by_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "currency_conversion_proposals_submitted_by_id_from_currency_code_to_currency_code_status_created_at_idx" ON "currency_conversion_proposals"("submitted_by_id", "from_currency_code", "to_currency_code", "status", "created_at");
