import { renderToStaticMarkup } from "react-dom/server";
import { InitialPostalEntitySettingForm } from "@/app/components/initialPostalEntitySettingForm";

describe("initial postal entity setting form", () => {
  it("renders labelled keyboard controls with described validation fields", () => {
    const markup = renderToStaticMarkup(
      <InitialPostalEntitySettingForm
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
        onSaved={() => undefined}
      />
    );

    expect(markup).toMatch(/<label[^>]+for="postalEntityName"/);
    expect(markup).toContain('id="postalEntityName"');
    expect(markup).toContain('aria-describedby="postalEntityName-hint"');
    expect(markup).toMatch(/<label[^>]+for="issuingAuthority"[^>]*>Issuing authority/);
    expect(markup).toMatch(/<label[^>]+for="scope"[^>]*>Geographic or office scope/);
    expect(markup).toMatch(/<label[^>]+for="sourceUrl"[^>]*>Source URL/);
    expect(markup).toMatch(/<label[^>]+for="sourceNote"[^>]*>Source note/);
    expect(markup).toMatch(/<label[^>]+for="countryCode"/);
    expect(markup).toContain('id="countryCode"');
    expect(markup).toContain('aria-describedby="countryCode-hint"');
    expect(markup).toMatch(/<label[^>]+for="displayCurrencyCode"/);
    expect(markup).toContain('id="displayCurrencyCode"');
    expect(markup).toContain('aria-describedby="displayCurrencyCode-hint"');
    expect(markup).not.toContain("Timezone mode");
    expect(markup).not.toContain('name="timeZoneMode"');
    expect(markup).not.toContain('id="timeZone"');
    expect(markup).toContain('type="submit"');
  });
});
