import { renderToStaticMarkup } from "react-dom/server";
import {
  formatInventoryDate,
  formatMoney,
  NamedFaceValueFields,
  StampInventory,
  StampInventoryResults,
  type SavedStamp,
} from "@/app/components/stampInventory";

function savedStamp(
  id: string,
  source: string | null,
  amount: string | null = "1",
): SavedStamp {
  return {
    id,
    countryCode: "IT",
    postalEntityId: "italy-post",
    postalEntity: {
      id: "italy-post",
      name: "Poste Italiane",
      countryCode: "IT",
    },
    name: `Stamp ${id}`,
    yearOfIssue: null,
    faceValueType: "MONETARY",
    faceAmount: "1",
    faceCurrencyCode: "EUR",
    namedFaceValueId: null,
    namedFaceValue: null,
    manualPostageAmount: null,
    manualPostageCurrencyCode: null,
    quantityOwned: 1,
    quantityAnnulled: 0,
    usableQuantity: 1,
    expired: false,
    unitPostageValue:
      amount === null ? null : { amount, currencyCode: "EUR", source: source! },
    totalPostageValue: amount === null ? null : { amount, currencyCode: "EUR" },
    valuation:
      source === null
        ? { status: "UNRESOLVED", source: null }
        : { status: "RESOLVED", source },
    createdAt: "2026-08-27T12:00:00.000Z",
  };
}

describe("stamp inventory interface", () => {
  it("renders visible labels and native keyboard-operable controls", () => {
    const markup = renderToStaticMarkup(
      <StampInventory
        activeCountryCode="IT"
        activeDisplayCurrencyCode="EUR"
        activePostalEntityId="italy-post"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "Euro" }]}
        postalEntities={[
          { id: "italy-post", name: "Poste Italiane", countryCode: "IT" },
        ]}
      />,
    );

    for (const [label, id] of [
      ["Country", "stamp-country"],
      ["Postal entity", "stamp-postal-entity"],
      ["Stamp name", "stamp-name"],
      ["Year of issue (optional)", "stamp-year"],
      ["Face value type", "face-value-type"],
      ["Monetary face amount", "face-amount"],
      ["Face currency", "face-currency"],
      ["Owned quantity", "owned-quantity"],
      ["Annulled quantity", "annulled-quantity"],
      ["Expired", "stamp-expired"],
      ["Manual postage amount", "manual-amount"],
      ["Manual postage currency", "manual-currency"],
    ]) {
      expect(markup).toContain(`<label for="${id}"`);
      expect(markup).toContain(`id="${id}"`);
      expect(markup).toContain(label);
    }
    expect(markup).toContain('<button type="submit"');
    expect(markup).toContain('<option value="NONE">No face value</option>');
    expect(markup).not.toContain("onKeyDown");
  });

  it("formats exact decimal strings without converting them to Number", () => {
    expect(
      formatMoney({ amount: "0.99999999999905803", currencyCode: "EUR" }),
    ).toContain("0.99999999999905803");
    expect(
      formatMoney({ amount: "9007199254740993", currencyCode: "EUR" }),
    ).toContain("9,007,199,254,740,993");
    expect(
      formatMoney({
        amount: "0.123456789012345678901",
        currencyCode: "EUR",
      }),
    ).toContain("0.123456789012345678901");
  });

  it("formats inventory dates with the requested user locale", () => {
    expect(formatInventoryDate("2026-08-27T12:00:00.000Z", "en-GB")).toBe(
      "27/08/2026",
    );
  });

  it("shows the inventory total, valuation sources, zero reason, and unresolved state in text", () => {
    const markup = renderToStaticMarkup(
      <StampInventoryResults
        inventory={{
          activeCountryCode: "IT",
          displayCurrencyCode: "EUR",
          inventoryTotal: { amount: "4", currencyCode: "EUR" },
          stamps: [
            savedStamp("face", "FACE_AMOUNT"),
            savedStamp("converted", "FIXED_CONVERSION"),
            savedStamp("named", "NAMED_SCHEDULE"),
            savedStamp("manual", "MANUAL_FALLBACK"),
            savedStamp("expired", "EXPIRED", "0"),
            savedStamp("outside", "OUTSIDE_ACTIVE_COUNTRY", "0"),
            savedStamp("unresolved", null, null),
          ],
        }}
      />,
    );

    expect(markup).toContain("Inventory total:");
    for (const label of [
      "Face amount",
      "Fixed currency conversion",
      "Named/code schedule",
      "Manual postage value",
      "Expired stamp",
      "Outside active country",
      "Unresolved",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain(
      "Unresolved entries are excluded from the inventory total.",
    );
    expect(markup).toContain("Added:");
  });

  it("labels named search and selection and requires a country first", () => {
    const markup = renderToStaticMarkup(
      <NamedFaceValueFields
        countryCode=""
        query="zona"
        onQueryChange={() => undefined}
        options={[
          { id: "italy-b-zone-one", countryCode: "IT", displayCode: "B Zona 1" },
        ]}
        searchError="Named face values could not be loaded."
        selectionError="Select a named face value."
      />,
    );

    expect(markup).toContain('<label for="named-face-value-search"');
    expect(markup).toContain('<label for="named-face-value"');
    expect(markup).toContain('id="named-face-value-search"');
    expect(markup).toContain('id="named-face-value"');
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain('role="alert"');
  });
});
