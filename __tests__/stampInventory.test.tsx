import { renderToStaticMarkup } from "react-dom/server";
import {
  applyStampUpdate,
  applyStampRemoval,
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
    namedFaceValueProposalId: null,
    namedFaceValue: null,
    upcomingNamedFaceValue: null,
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

  it("shows pending definition status and an upcoming named value in text", () => {
    const pending = savedStamp("pending", "NAMED_SCHEDULE");
    pending.faceValueType = "NAMED";
    pending.namedFaceValueId = null;
    pending.namedFaceValueProposalId = "pending-definition";
    pending.namedFaceValue = {
      id: "pending-definition",
      countryCode: "IT",
      displayCode: "B Zona 2",
      proposalStatus: "PENDING",
    };
    pending.upcomingNamedFaceValue = {
      amount: "2.20",
      currencyCode: "EUR",
      effectiveOn: "2028-10-01",
      daysUntil: 10,
    };

    const markup = renderToStaticMarkup(
      <StampInventoryResults
        inventory={{
          activeCountryCode: "IT",
          displayCurrencyCode: "EUR",
          inventoryTotal: { amount: "1", currencyCode: "EUR" },
          stamps: [pending],
        }}
      />,
    );

    expect(markup).toContain("Definition status: PENDING");
    expect(markup).toContain(
      "Upcoming named/code value: 2.20 EUR from 2028-10-01",
    );
  });

  it("renders labelled keyboard-operable quantity editors for inventory lines", () => {
    const stamp = savedStamp("editable", "FACE_AMOUNT");
    const markup = renderToStaticMarkup(
      <StampInventoryResults
        inventory={{
          activeCountryCode: "IT",
          displayCurrencyCode: "EUR",
          inventoryTotal: { amount: "1", currencyCode: "EUR" },
          stamps: [stamp],
        }}
        onStampUpdated={() => undefined}
      />,
    );

    expect(markup).toContain(
      '<label for="stamp-editable-owned-quantity"',
    );
    expect(markup).toContain(
      '<label for="stamp-editable-annulled-quantity"',
    );
    expect(markup).toMatch(/<input[^>]+type="number"[^>]+name="quantityOwned"/);
    expect(markup).toMatch(
      /<input[^>]+type="number"[^>]+name="quantityAnnulled"/,
    );
    expect(markup).toContain(
      '<label for="stamp-editable-expired">Expired</label>',
    );
    expect(markup).toContain(
      'aria-describedby="stamp-editable-expired-explanation"',
    );
    expect(markup).toContain(
      "Expired stamps have zero usable quantity and zero postage value.",
    );
    expect(markup).toContain("Save stamp");
    expect(markup).not.toContain("onKeyDown");
  });

  it("labels action-required rows and offers an explicit fallback choice", () => {
    const stamp = savedStamp("rejected", null, null);
    stamp.faceValueType = "NAMED";
    stamp.faceAmount = null;
    stamp.faceCurrencyCode = null;
    stamp.namedFaceValueProposalId = "rejected-definition";
    stamp.namedFaceValue = {
      id: "rejected-definition",
      countryCode: "IT",
      displayCode: "Rejected name",
      proposalStatus: "REJECTED",
    };
    stamp.actionRequired = true;
    stamp.availableFallback = {
      amount: "0.75",
      currencyCode: "EUR",
      source: "MANUAL_FALLBACK",
    };
    stamp.valuation = { status: "ACTION_REQUIRED", source: null };
    const markup = renderToStaticMarkup(
      <StampInventoryResults
        inventory={{
          activeCountryCode: "IT",
          displayCurrencyCode: "EUR",
          inventoryTotal: { amount: "0", currencyCode: "EUR" },
          stamps: [stamp],
        }}
        onStampUpdated={() => undefined}
      />,
    );

    expect(markup).toContain(
      "Action required: rejected proposal data is no longer used.",
    );
    expect(markup).toContain(
      '<label for="stamp-rejected-action-resolution"',
    );
    expect(markup).toContain(
      '<label for="stamp-rejected-replacement-search"',
    );
    expect(markup).toContain("Use Manual postage value:");
    expect(markup).toContain("Valuation source: Action required");
  });

  it("replaces the updated line and inventory total from an update response", () => {
    const original = savedStamp("editable", "FACE_AMOUNT");
    const unchanged = savedStamp("unchanged", "FACE_AMOUNT");
    const updated: SavedStamp = {
      ...original,
      quantityOwned: 4,
      quantityAnnulled: 1,
      usableQuantity: 3,
      totalPostageValue: { amount: "3", currencyCode: "EUR" },
    };
    const inventory = {
      activeCountryCode: "IT",
      displayCurrencyCode: "EUR",
      inventoryTotal: { amount: "2", currencyCode: "EUR" },
      stamps: [original, unchanged],
    };

    expect(
      applyStampUpdate(inventory, updated, {
        amount: "4",
        currencyCode: "EUR",
      }),
    ).toEqual({
      ...inventory,
      inventoryTotal: { amount: "4", currencyCode: "EUR" },
      stamps: [updated, unchanged],
    });
  });

  it("removes one line and replaces the inventory total from a delete response", () => {
    const removed = savedStamp("removed", "FACE_AMOUNT");
    const remaining = savedStamp("remaining", "FACE_AMOUNT");
    const inventory = {
      activeCountryCode: "IT",
      displayCurrencyCode: "EUR",
      inventoryTotal: { amount: "2", currencyCode: "EUR" },
      stamps: [removed, remaining],
    };

    expect(
      applyStampRemoval(inventory, removed.id, {
        amount: "1",
        currencyCode: "EUR",
      }),
    ).toEqual({
      ...inventory,
      inventoryTotal: { amount: "1", currencyCode: "EUR" },
      stamps: [remaining],
    });
  });

  it("renders a labelled removal confirmation with native buttons", () => {
    const stamp = savedStamp("removable", "FACE_AMOUNT");
    const markup = renderToStaticMarkup(
      <StampInventoryResults
        inventory={{
          activeCountryCode: "IT",
          displayCurrencyCode: "EUR",
          inventoryTotal: { amount: "1", currencyCode: "EUR" },
          stamps: [stamp],
        }}
        onStampRemoved={() => undefined}
      />,
    );

    expect(markup).toContain("Remove stamp");
    expect(markup).toContain("Remove Stamp removable?");
    expect(markup).toContain("Confirm removal");
    expect(markup).toContain("Cancel");
    expect(markup).toContain(
      'aria-labelledby="stamp-removable-remove-confirmation"',
    );
    expect(markup).not.toContain("onKeyDown");
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
