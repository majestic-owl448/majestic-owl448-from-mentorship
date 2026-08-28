import countries from "i18n-iso-countries";
import englishCountries from "i18n-iso-countries/langs/en.json";
import type {
  NewPostalEntitySettingInput,
  PostalEntitySettingValues,
} from "@/lib/postalEntitySettings";

countries.registerLocale(englishCountries);

export type PostalEntitySettingField =
  | "postalEntityName"
  | "countryCode"
  | "issuingAuthority"
  | "scope"
  | "sourceUrl"
  | "sourceNote"
  | "displayCurrencyCode"
  | "timeZoneMode"
  | "timeZone";

export type PostalEntitySettingFieldErrors = Partial<
  Record<PostalEntitySettingField, string>
>;

type ValidationResult =
  | { data: NewPostalEntitySettingInput; errors?: never }
  | { data?: never; errors: PostalEntitySettingFieldErrors };

type ValuesValidationResult =
  | { data: PostalEntitySettingValues; errors?: never }
  | { data?: never; errors: PostalEntitySettingFieldErrors };

const supportedCurrencies = new Set(
  Intl.supportedValuesOf("currency").map((code) => code.toUpperCase())
);

function cleanText(record: Record<string, unknown>, field: string) {
  return typeof record[field] === "string"
    ? record[field].trim().replace(/\s+/g, " ")
    : "";
}

function validSourceUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

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
  const postalEntityName = cleanText(record, "postalEntityName");
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
  const issuingAuthority = cleanText(record, "issuingAuthority");
  const scope = cleanText(record, "scope");
  const sourceUrl = cleanText(record, "sourceUrl");
  const sourceNote = cleanText(record, "sourceNote");

  if (!postalEntityName) {
    errors.postalEntityName = "Enter the postal entity name.";
  } else if (postalEntityName.length > 200) {
    errors.postalEntityName = "Enter at most 200 characters.";
  }
  const isIsoCountry =
    /^[A-Z]{2}$/.test(countryCode) &&
    countryCode !== "XK" &&
    countries.isValid(countryCode);
  if (!isIsoCountry) {
    errors.countryCode = "Select a valid ISO 3166-1 country.";
  }
  if (!issuingAuthority) {
    errors.issuingAuthority = "Enter the issuing authority.";
  } else if (issuingAuthority.length > 200) {
    errors.issuingAuthority = "Enter at most 200 characters.";
  }
  if (!scope) {
    errors.scope = "Enter the geographic or office scope.";
  } else if (scope.length > 500) {
    errors.scope = "Enter at most 500 characters.";
  }
  if (!validSourceUrl(sourceUrl)) {
    errors.sourceUrl = "Enter an HTTP or HTTPS URL.";
  } else if (sourceUrl.length > 2000) {
    errors.sourceUrl = "Enter at most 2,000 characters.";
  }
  if (sourceNote.length > 2000) {
    errors.sourceNote = "Enter at most 2,000 characters.";
  }
  if ((!sourceUrl || !validSourceUrl(sourceUrl)) && !sourceNote) {
    errors.sourceNote = "Enter a source URL or source note.";
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
      issuingAuthority,
      scope,
      sourceUrl: sourceUrl || null,
      sourceNote: sourceNote || null,
      displayCurrencyCode,
      timeZone,
      timeZoneMode: timeZoneMode as "SYSTEM" | "CUSTOM",
    },
  };
}

export function validatePostalEntitySettingValues(
  input: unknown
): ValuesValidationResult {
  const validation = validateInitialPostalEntitySetting({
    ...(typeof input === "object" && input !== null ? input : {}),
    postalEntityName: "Existing entity",
    countryCode: "US",
    issuingAuthority: "Existing authority",
    scope: "Existing scope",
    sourceNote: "Existing source",
  });

  if (validation.errors) {
    return { errors: validation.errors };
  }

  return {
    data: {
      displayCurrencyCode: validation.data.displayCurrencyCode,
      timeZone: validation.data.timeZone,
      timeZoneMode: validation.data.timeZoneMode,
    },
  };
}

export function validatePostalEntitySubmission(input: unknown) {
  const validation = validateInitialPostalEntitySetting({
    ...(typeof input === "object" && input !== null ? input : {}),
    displayCurrencyCode: "USD",
    timeZoneMode: "SYSTEM",
    timeZone: "UTC",
  });
  if (validation.errors) return { errors: validation.errors };
  return {
    data: {
      postalEntityName: validation.data.postalEntityName,
      normalizedPostalEntityName:
        validation.data.normalizedPostalEntityName,
      countryCode: validation.data.countryCode,
      issuingAuthority: validation.data.issuingAuthority ?? "",
      scope: validation.data.scope ?? "",
      sourceUrl: validation.data.sourceUrl ?? null,
      sourceNote: validation.data.sourceNote ?? null,
    },
  };
}
