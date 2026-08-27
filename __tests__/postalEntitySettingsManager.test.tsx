import { renderToStaticMarkup } from "react-dom/server";
import { PostalEntitySettingsManager } from "@/app/components/postalEntitySettingsManager";

const settings = [
  {
    id: "italy-setting",
    userId: "first-user",
    displayCurrencyCode: "EUR",
    timeZone: "Europe/Rome",
    timeZoneMode: "SYSTEM" as const,
    postalEntity: {
      id: "italy-entity",
      name: "Poste Italiane",
      countryCode: "IT",
      status: "PENDING" as const,
    },
  },
  {
    id: "vatican-setting",
    userId: "first-user",
    displayCurrencyCode: "USD",
    timeZone: "Europe/Vatican",
    timeZoneMode: "CUSTOM" as const,
    postalEntity: {
      id: "vatican-entity",
      name: "Vatican Post",
      countryCode: "IT",
      status: "PENDING" as const,
    },
  },
];

describe("postal entity settings manager", () => {
  it("renders labelled selectors, independent editors, and textual active state", () => {
    const markup = renderToStaticMarkup(
      <PostalEntitySettingsManager
        activeSettingId="vatican-setting"
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[
          { value: "EUR", label: "EUR - Euro" },
          { value: "USD", label: "USD - US Dollar" },
        ]}
        settings={settings}
        onAdded={() => undefined}
        onActivated={() => undefined}
        onUpdated={() => undefined}
      />
    );

    expect(markup).toMatch(
      /<label[^>]+for="activePostalEntitySetting"[^>]*>Postal entity used for valuation/
    );
    expect(markup).toContain('id="activePostalEntitySetting"');
    expect(markup).toContain("Current selection: Vatican Post");
    expect(markup).toContain("Poste Italiane (IT)");
    expect(markup).toContain("Vatican Post (IT)");
    expect(markup).toContain("Poste Italiane</h3>");
    expect(markup).toContain("Vatican Post</h3>");
    expect(markup).toContain("Active for valuation.");
    expect(markup).toContain('id="setting-italy-setting-currency"');
    expect(markup).toContain('id="setting-vatican-setting-currency"');
    expect(markup).toContain('name="setting-italy-setting-timeZoneMode"');
    expect(markup).toContain('name="setting-vatican-setting-timeZoneMode"');
    expect(markup).toMatch(
      /id="setting-italy-setting-time-zone"[^>]+value="Europe\/Rome"/
    );
    expect(markup).toContain("Use current browser timezone (UTC)");
  });
});
