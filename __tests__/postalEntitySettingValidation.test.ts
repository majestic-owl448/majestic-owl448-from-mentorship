import {
  countryOptions,
  currencyOptions,
  validateInitialPostalEntitySetting,
} from "@/lib/postalEntitySettingValidation";

const validInput = {
  postalEntityName: "Poste Italiane",
  countryCode: "IT",
  displayCurrencyCode: "EUR",
  timeZone: "Europe/Rome",
  timeZoneMode: "SYSTEM",
};

const validData = {
  ...validInput,
  normalizedPostalEntityName: "poste italiane",
};

describe("postal entity setting validation", () => {
  it("accepts every currency supported by Intl", () => {
    for (const displayCurrencyCode of Intl.supportedValuesOf("currency")) {
      expect(
        validateInitialPostalEntitySetting({
          ...validInput,
          displayCurrencyCode,
        })
      ).toEqual({
        data: { ...validData, displayCurrencyCode },
      });
    }
  });

  it("normalizes the entity name, country, and currency", () => {
    expect(
      validateInitialPostalEntitySetting({
        ...validInput,
        postalEntityName: "  Poste   Italiane  ",
        countryCode: " it ",
        displayCurrencyCode: " eur ",
      })
    ).toEqual({ data: validData });
  });

  it.each([
    ["postalEntityName", "  ", "Enter the postal entity name."],
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
      validateInitialPostalEntitySetting({ ...validInput, [field]: value })
    ).toEqual({ errors: { [field]: message } });
  });

  it("provides valid country and runtime currency options", () => {
    expect(countryOptions()).toContainEqual({ value: "IT", label: "Italy" });
    expect(countryOptions().some(({ value }) => value === "EU")).toBe(false);
    expect(currencyOptions()).toContainEqual({
      value: "EUR",
      label: "EUR - Euro",
    });
  });
});
