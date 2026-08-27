import countries from "i18n-iso-countries";
import englishCountries from "i18n-iso-countries/langs/en.json";
import type { InitialCountrySettingInput } from "@/lib/countrySettings";

countries.registerLocale(englishCountries);

export type CountrySettingField =
  | "countryCode"
  | "displayCurrencyCode"
  | "timeZoneMode"
  | "timeZone";

export type CountrySettingFieldErrors = Partial<
  Record<CountrySettingField, string>
>;

type ValidationResult =
  | { data: InitialCountrySettingInput; errors?: never }
  | { data?: never; errors: CountrySettingFieldErrors };

const supportedCurrencies = new Set(
  Intl.supportedValuesOf("currency").map((code) => code.toUpperCase())
);

function isTimeZone(value: string) {
  if (/^[+-]\d{2}(?::?\d{2})?$/.test(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function countryOptions() {
  return [
    ...Object.entries(countries.getNames("en", { select: "official" })).map(
      ([value, label]) => ({ value, label })
    ),
  ]
    .filter(({ value }) => value !== "XK")
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function currencyOptions() {
  const displayNames = new Intl.DisplayNames(["en"], { type: "currency" });

  return [...supportedCurrencies]
    .map((value) => ({
      value,
      label: `${value} - ${displayNames.of(value) ?? value}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function validateInitialCountrySetting(input: unknown): ValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const countryCode =
    typeof record.countryCode === "string"
      ? record.countryCode.trim().toUpperCase()
      : "";
  const displayCurrencyCode =
    typeof record.displayCurrencyCode === "string"
      ? record.displayCurrencyCode.trim().toUpperCase()
      : "";
  const timeZoneMode =
    typeof record.timeZoneMode === "string"
      ? record.timeZoneMode.trim().toUpperCase()
      : "";
  const timeZone =
    typeof record.timeZone === "string" ? record.timeZone.trim() : "";
  const errors: CountrySettingFieldErrors = {};

  const isIsoCountry =
    /^[A-Z]{2}$/.test(countryCode) &&
    countryCode !== "XK" &&
    countries.isValid(countryCode);
  if (!isIsoCountry) {
    errors.countryCode = "Select a valid ISO 3166-1 country.";
  }
  if (!supportedCurrencies.has(displayCurrencyCode)) {
    errors.displayCurrencyCode =
      "Select a currency supported by this application.";
  }
  if (timeZoneMode !== "SYSTEM" && timeZoneMode !== "CUSTOM") {
    errors.timeZoneMode = "Select system or custom timezone mode.";
  }
  if (!timeZone || !isTimeZone(timeZone)) {
    errors.timeZone = "Enter a valid IANA timezone.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      countryCode,
      displayCurrencyCode,
      timeZone,
      timeZoneMode: timeZoneMode as "SYSTEM" | "CUSTOM",
    },
  };
}
