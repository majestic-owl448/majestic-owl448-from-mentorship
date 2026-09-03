// @vitest-environment jsdom
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PostalEntitySettingsManager,
} from "@/app/components/postalEntitySettingsManager";
import type { SavedPostalEntitySetting } from "@/app/components/initialPostalEntitySettingForm";

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

  it("labels approved-entity selection and rejected-reference replacement controls", () => {
    const rejected = {
      ...settings[0],
      postalEntity: {
        ...settings[0].postalEntity,
        issuingAuthority: "Unknown",
        scope: "Italy",
        status: "REJECTED" as const,
      },
    };
    const markup = renderToStaticMarkup(
      <PostalEntitySettingsManager
        activeSettingId={null}
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
        settings={[rejected]}
        availablePostalEntities={[
          {
            id: "approved-entity",
            name: "Approved Post",
            countryCode: "IT",
            issuingAuthority: "Italy",
            scope: "Italy",
            status: "APPROVED",
          },
        ]}
        onAdded={() => undefined}
        onActivated={() => undefined}
        onUpdated={() => undefined}
      />,
    );
    expect(markup).toContain("Use an approved postal entity");
    expect(markup).toContain("This submission was rejected.");
    expect(markup).toContain("Replacement method");
    expect(markup).toContain("Use an available postal entity");
    expect(markup).toContain("Resubmit corrected entity information");
    expect(markup).toContain("Replace references");
  });

  it("keeps creation closed when an available postal entity can be selected", () => {
    const markup = renderToStaticMarkup(
      <PostalEntitySettingsManager
        activeSettingId={null}
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
        settings={[]}
        availablePostalEntities={[
          {
            id: "approved-entity",
            name: "Approved Post",
            countryCode: "IT",
            status: "APPROVED",
          },
        ]}
        onAdded={() => undefined}
        onActivated={() => undefined}
        onUpdated={() => undefined}
      />,
    );

    expect(markup).toContain("Postal entity option");
    expect(markup).toContain("Choose an available postal entity");
    expect(markup).toContain("Create a postal entity");
    expect(markup).toContain("Use an approved postal entity");
    expect(markup).not.toContain('id="postalEntityName"');
  });

  it("opens creation when no postal entity is available", () => {
    const markup = renderToStaticMarkup(
      <PostalEntitySettingsManager
        activeSettingId={null}
        countries={[{ value: "IT", label: "Italy" }]}
        currencies={[{ value: "EUR", label: "EUR - Euro" }]}
        settings={[]}
        onAdded={() => undefined}
        onActivated={() => undefined}
        onUpdated={() => undefined}
      />,
    );

    expect(markup).toContain('id="postalEntityName"');
  });

  it("opens creation after selecting the final available entity", async () => {
    const user = userEvent.setup();
    const entity = {
      id: "approved-entity",
      name: "Approved Post",
      countryCode: "IT",
      status: "APPROVED" as const,
    };
    function ManagerHarness() {
      const [saved, setSaved] = useState<SavedPostalEntitySetting[]>([]);
      return <PostalEntitySettingsManager activeSettingId={null} countries={[{ value: "IT", label: "Italy" }]} currencies={[{ value: "EUR", label: "EUR - Euro" }]} settings={saved} availablePostalEntities={[entity]} onAdded={(added) => setSaved((current) => [...current, added])} onActivated={() => undefined} onUpdated={() => undefined} />;
    }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ postalEntitySetting: { id: "added-setting", userId: "first-user", displayCurrencyCode: "EUR", timeZone: "UTC", timeZoneMode: "SYSTEM", postalEntity: entity } })));

    render(<ManagerHarness />);
    await user.selectOptions(screen.getByLabelText("Approved postal entity"), "approved-entity");
    await user.selectOptions(screen.getByLabelText("Display currency"), "EUR");
    await user.click(screen.getByRole("button", { name: "Add approved entity" }));

    await waitFor(() => expect(screen.getByLabelText("Postal entity")).toBeTruthy());
  });
});
