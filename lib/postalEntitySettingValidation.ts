import countries from "i18n-iso-countries";
import englishCountries from "i18n-iso-countries/langs/en.json";
import type { InitialPostalEntitySettingInput } from "@/lib/postalEntitySettings";

countries.registerLocale(englishCountries);

export type PostalEntitySettingField =
  | "postalEntityName"
  | "countryCode"
  | "displayCurrencyCode"
  | "timeZoneMode"
  | "timeZone";

export type PostalEntitySettingFieldErrors = Partial<
  Record<PostalEntitySettingField, string>
>;

type ValidationResult =
  | { data: InitialPostalEntitySettingInput; errors?: never }
  | { data?: never; errors: PostalEntitySettingFieldErrors };

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
  return Object.entries(countries.getNames("en", { select: "official" }))
    .map(([value, label]) => ({ value, label }))
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

export function validateInitialPostalEntitySetting(
  input: unknown
): ValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const postalEntityName =
    typeof record.postalEntityName === "string"
      ? record.postalEntityName.trim().replace(/\s+/g, " ")
      : "";
  const normalizedPostalEntityName = postalEntityName
    .normalize("NFKC")
    .toLocaleLowerCase("en-US");
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
  const errors: PostalEntitySettingFieldErrors = {};

  if (!postalEntityName) {
    errors.postalEntityName = "Enter the postal entity name.";
  }
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
      postalEntityName,
      normalizedPostalEntityName,
      countryCode,
      displayCurrencyCode,
      timeZone,
      timeZoneMode: timeZoneMode as "SYSTEM" | "CUSTOM",
    },
  };
}
