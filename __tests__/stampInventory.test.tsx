import { renderToStaticMarkup } from "react-dom/server";
import { StampInventory } from "@/app/components/stampInventory";

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
});
