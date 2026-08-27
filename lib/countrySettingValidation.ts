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
const unPostalEntities = [
  { value: "UN-NY", label: "United Nations - New York" },
  { value: "UN-GE", label: "United Nations - Geneva" },
  { value: "UN-VI", label: "United Nations - Vienna" },
];
const unPostalEntityCodes = new Set(
  unPostalEntities.map(({ value }) => value)
);

function isTimeZone(value: string) {
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
    ...unPostalEntities,
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
  if (!isIsoCountry && !unPostalEntityCodes.has(countryCode)) {
    errors.countryCode = "Select a valid country or UN postal entity.";
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
