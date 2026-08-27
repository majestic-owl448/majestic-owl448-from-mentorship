import { renderToStaticMarkup } from "react-dom/server";
import {
  formatMoney,
  NamedFaceValueFields,
  StampInventory,
} from "@/app/components/stampInventory";

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
