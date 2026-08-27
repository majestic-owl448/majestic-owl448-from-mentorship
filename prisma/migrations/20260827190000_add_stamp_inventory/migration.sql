-- CreateTable
CREATE TABLE "stamp_inventory_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year_of_issue" INTEGER,
    "face_amount" TEXT NOT NULL CHECK (
        "face_amount" NOT GLOB '*[^0-9.]*'
        AND "face_amount" NOT GLOB '*.*.*'
        AND "face_amount" GLOB '*[0-9]*'
        AND CAST("face_amount" AS NUMERIC) >= 0
    ),
    "face_currency_code" TEXT NOT NULL,
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
    CONSTRAINT "stamp_inventory_entries_manual_postage_pair_check" CHECK (
        ("manual_postage_amount" IS NULL) = ("manual_postage_currency_code" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "stamp_inventory_entries_user_id_created_at_idx" ON "stamp_inventory_entries"("user_id", "created_at");
