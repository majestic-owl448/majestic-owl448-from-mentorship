import { renderToStaticMarkup } from "react-dom/server";
import { InitialCountrySettingForm } from "@/app/components/initialCountrySettingForm";

describe("initial country setting form", () => {
  it("renders labelled keyboard controls with described validation fields", () => {
    const markup = renderToStaticMarkup(
      <InitialCountrySettingForm
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
        onSaved={() => undefined}
      />
    );

    expect(markup).toMatch(/<label[^>]+for="countryCode"/);
    expect(markup).toContain('id="countryCode"');
    expect(markup).toContain('aria-describedby="countryCode-hint"');
    expect(markup).toMatch(/<label[^>]+for="displayCurrencyCode"/);
    expect(markup).toContain('id="displayCurrencyCode"');
    expect(markup).toContain('aria-describedby="displayCurrencyCode-hint"');
    expect(markup).toContain("<legend");
    expect(markup).toContain("Timezone mode</legend>");
    expect(markup).toContain('name="timeZoneMode"');
    expect(markup).toContain('value="SYSTEM"');
    expect(markup).toContain('value="CUSTOM"');
    expect(markup).toMatch(/<label[^>]+for="timeZone"/);
    expect(markup).toContain('id="timeZone"');
    expect(markup).toContain('aria-describedby="timeZone-hint"');
    expect(markup).toContain('type="submit"');
  });
});
