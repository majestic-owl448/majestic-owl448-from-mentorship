import { countryOptions } from "@/lib/postalEntitySettingValidation";

export type StampField =
  | "countryCode"
  | "postalEntityId"
  | "name"
  | "yearOfIssue"
  | "faceAmount"
  | "faceCurrencyCode"
  | "manualPostageAmount"
  | "manualPostageCurrencyCode"
  | "quantityOwned"
  | "quantityAnnulled"
  | "expired";

export type NewMonetaryStampInput = {
  countryCode: string;
  postalEntityId: string;
  name: string;
  yearOfIssue: number | null;
  faceAmount: string;
  faceCurrencyCode: string;
  manualPostageAmount: string | null;
  manualPostageCurrencyCode: string | null;
  quantityOwned: number;
  quantityAnnulled: number;
  expired: boolean;
};

type ValidationResult =
  | { data: NewMonetaryStampInput; errors?: never }
  | { data?: never; errors: Partial<Record<StampField, string>> };

const countryCodes = new Set(countryOptions().map(({ value }) => value));
const decimalPattern = /^\d+(?:\.\d+)?$/;
const currencyCodePattern = /^[A-Z]{3}$/;
const zeroBigInt = BigInt(0);
const maxDatabaseInteger = BigInt("2147483647");

function stringValue(record: Record<string, unknown>, field: string) {
  return typeof record[field] === "string" ? record[field].trim() : "";
}

function isDecimal(value: string) {
  return decimalPattern.test(value);
}

export function validateNewMonetaryStamp(input: unknown): ValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const countryCode = stringValue(record, "countryCode").toUpperCase();
  const postalEntityId = stringValue(record, "postalEntityId");
  const name = stringValue(record, "name").replace(/\s+/g, " ");
  const yearValue = stringValue(record, "yearOfIssue");
  const faceAmount = stringValue(record, "faceAmount");
  const faceCurrencyCode = stringValue(
    record,
    "faceCurrencyCode",
  ).toUpperCase();
  const manualPostageAmount = stringValue(record, "manualPostageAmount");
  const manualPostageCurrencyCode = stringValue(
    record,
    "manualPostageCurrencyCode",
  ).toUpperCase();
  const quantityOwnedValue = stringValue(record, "quantityOwned");
  const quantityAnnulledValue = stringValue(record, "quantityAnnulled");
  const errors: Partial<Record<StampField, string>> = {};

  if (!countryCodes.has(countryCode)) {
    errors.countryCode = "Select a valid ISO 3166-1 country.";
  }
  if (!postalEntityId) {
    errors.postalEntityId = "Select a postal entity.";
  }
  if (!name) {
    errors.name = "Enter the stamp name.";
  }

  const parsedYear = Number(yearValue);
  const yearOfIssue = yearValue === "" ? null : parsedYear;
  if (
    yearValue !== "" &&
    (!/^\d+$/.test(yearValue) || parsedYear < 1 || parsedYear > 9999)
  ) {
    errors.yearOfIssue = "Enter a year from 1 to 9999, or leave it blank.";
  }
  if (!isDecimal(faceAmount)) {
    errors.faceAmount = "Enter a non-negative decimal amount.";
  }
  if (!currencyCodePattern.test(faceCurrencyCode)) {
    errors.faceCurrencyCode = "Enter a three-letter face currency code.";
  }

  const hasManualAmount = manualPostageAmount !== "";
  const hasManualCurrency = manualPostageCurrencyCode !== "";
  if (hasManualAmount && !isDecimal(manualPostageAmount)) {
    errors.manualPostageAmount = "Enter a non-negative decimal amount.";
  }
  if (hasManualAmount !== hasManualCurrency) {
    if (!hasManualAmount) {
      errors.manualPostageAmount = "Enter the manual postage amount.";
    }
    if (!hasManualCurrency) {
      errors.manualPostageCurrencyCode =
        "Select the manual postage currency.";
    }
  } else if (
    hasManualCurrency &&
    !currencyCodePattern.test(manualPostageCurrencyCode)
  ) {
    errors.manualPostageCurrencyCode =
      "Enter a three-letter manual postage currency code.";
  }

  const ownedIsInteger = /^\d+$/.test(quantityOwnedValue);
  const ownedBigInt = ownedIsInteger ? BigInt(quantityOwnedValue) : zeroBigInt;
  if (
    !ownedIsInteger ||
    ownedBigInt <= zeroBigInt ||
    ownedBigInt > maxDatabaseInteger
  ) {
    errors.quantityOwned =
      "Enter an owned quantity from 1 to 2,147,483,647.";
  }
  const annulledIsInteger = /^\d+$/.test(quantityAnnulledValue);
  const annulledBigInt = annulledIsInteger
    ? BigInt(quantityAnnulledValue)
    : zeroBigInt;
  if (!annulledIsInteger || annulledBigInt > maxDatabaseInteger) {
    errors.quantityAnnulled =
      "Enter an annulled quantity from 0 to 2,147,483,647.";
  } else if (!errors.quantityOwned && annulledBigInt > ownedBigInt) {
    errors.quantityAnnulled =
      "Annulled quantity cannot exceed owned quantity.";
  }
  if (typeof record.expired !== "boolean") {
    errors.expired = "Choose whether the stamp is expired.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      countryCode,
      postalEntityId,
      name,
      yearOfIssue,
      faceAmount,
      faceCurrencyCode,
      manualPostageAmount: hasManualAmount ? manualPostageAmount : null,
      manualPostageCurrencyCode: hasManualCurrency
        ? manualPostageCurrencyCode
        : null,
      quantityOwned: Number(ownedBigInt),
      quantityAnnulled: Number(annulledBigInt),
      expired: record.expired as boolean,
    },
  };
}
