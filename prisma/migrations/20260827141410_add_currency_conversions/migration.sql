-- CreateTable
CREATE TABLE "currencies" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "display_name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "currency_conversions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "from_currency_code" TEXT NOT NULL,
    "to_currency_code" TEXT NOT NULL,
    "multiplier" TEXT NOT NULL CHECK (
        "multiplier" NOT GLOB '*[^0-9.]*'
        AND "multiplier" NOT GLOB '*.*.*'
        AND "multiplier" GLOB '*[0-9]*'
        AND CAST("multiplier" AS NUMERIC) > 0
    ),
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "currency_conversions_from_currency_code_fkey" FOREIGN KEY ("from_currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversions_to_currency_code_fkey" FOREIGN KEY ("to_currency_code") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "currency_conversions_distinct_currencies_check" CHECK ("from_currency_code" <> "to_currency_code")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_conversions_from_currency_code_to_currency_code_key" ON "currency_conversions"("from_currency_code", "to_currency_code");
