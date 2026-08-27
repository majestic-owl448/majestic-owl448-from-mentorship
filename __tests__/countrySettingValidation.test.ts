import {
  countryOptions,
  currencyOptions,
  validateInitialCountrySetting,
} from "@/lib/countrySettingValidation";

const validInput = {
  countryCode: "IT",
  displayCurrencyCode: "EUR",
  timeZone: "Europe/Rome",
  timeZoneMode: "SYSTEM",
};

describe("country setting validation", () => {
  it("accepts every currency supported by Intl", () => {
    for (const displayCurrencyCode of Intl.supportedValuesOf("currency")) {
      expect(
        validateInitialCountrySetting({
          ...validInput,
          displayCurrencyCode,
        })
      ).toEqual({
        data: { ...validInput, displayCurrencyCode },
      });
    }
  });

  it("normalizes country and currency codes", () => {
    expect(
      validateInitialCountrySetting({
        ...validInput,
        countryCode: " it ",
        displayCurrencyCode: " eur ",
      })
    ).toEqual({ data: validInput });
  });

  it.each([
    ["countryCode", "XX", "Select a valid ISO 3166-1 country."],
    [
      "displayCurrencyCode",
      "XXX",
      "Select a currency supported by this application.",
    ],
    ["timeZone", "Mars/Olympus", "Enter a valid IANA timezone."],
    ["timeZone", "+01:00", "Enter a valid IANA timezone."],
    [
      "timeZoneMode",
      "AUTOMATIC",
      "Select system or custom timezone mode.",
    ],
  ])("returns a field error for invalid %s", (field, value, message) => {
    expect(
      validateInitialCountrySetting({ ...validInput, [field]: value })
    ).toEqual({ errors: { [field]: message } });
  });

  it("provides valid country and runtime currency options", () => {
    expect(countryOptions()).toContainEqual({ value: "IT", label: "Italy" });
    expect(countryOptions().some(({ value }) => value === "EU")).toBe(false);
    expect(countryOptions().some(({ value }) => value.startsWith("UN-"))).toBe(
      false
    );
    expect(currencyOptions()).toContainEqual({
      value: "EUR",
      label: "EUR - Euro",
    });
  });
});
