import { renderToStaticMarkup } from "react-dom/server";
import {
  formatMoney,
  StampInventory,
} from "@/app/components/stampInventory";

describe("stamp inventory interface", () => {
  it("renders visible labels and native keyboard-operable controls", () => {
    const markup = renderToStaticMarkup(
      <StampInventory
        activeCountryCode="IT"
        activeDisplayCurrencyCode="EUR"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "Euro" }]}
      />,
    );

    for (const [label, id] of [
      ["Country", "stamp-country"],
      ["Stamp name", "stamp-name"],
      ["Year of issue (optional)", "stamp-year"],
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
    expect(markup).not.toContain("onKeyDown");
  });

  it("formats exact decimal strings without converting them to Number", () => {
    expect(
      formatMoney({ amount: "0.99999999999905803", currencyCode: "EUR" }),
    ).toContain("0.99999999999905803");
    expect(
      formatMoney({ amount: "9007199254740993", currencyCode: "EUR" }),
    ).toContain("9,007,199,254,740,993");
  });
});
