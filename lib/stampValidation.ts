import { countryOptions } from "@/lib/postalEntitySettingValidation";

export type StampField =
  | "countryCode"
  | "postalEntityId"
  | "name"
  | "yearOfIssue"
  | "faceValueType"
  | "faceAmount"
  | "faceCurrencyCode"
  | "namedFaceValueId"
  | "namedFaceValueProposalId"
  | "manualPostageAmount"
  | "manualPostageCurrencyCode"
  | "quantityOwned"
  | "quantityAnnulled"
  | "expired";

export type NewStampInput = {
  countryCode: string;
  postalEntityId: string;
  name: string;
  yearOfIssue: number | null;
  faceValueType: "MONETARY" | "NAMED" | "NONE";
  faceAmount: string | null;
  faceCurrencyCode: string | null;
  namedFaceValueId: string | null;
  namedFaceValueProposalId: string | null;
  manualPostageAmount: string | null;
  manualPostageCurrencyCode: string | null;
  quantityOwned: number;
  quantityAnnulled: number;
  expired: boolean;
};

type ValidationResult =
  | { data: NewStampInput; errors?: never }
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

export function validateNewStamp(input: unknown): ValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const countryCode = stringValue(record, "countryCode").toUpperCase();
  const postalEntityId = stringValue(record, "postalEntityId");
  const name = stringValue(record, "name").replace(/\s+/g, " ");
  const yearValue = stringValue(record, "yearOfIssue");
  const faceValueType = stringValue(record, "faceValueType");
  const faceAmount = stringValue(record, "faceAmount");
  const faceCurrencyCode = stringValue(
    record,
    "faceCurrencyCode",
  ).toUpperCase();
  const namedFaceValueId = stringValue(record, "namedFaceValueId");
  const namedFaceValueProposalId = stringValue(
    record,
    "namedFaceValueProposalId",
  );
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
  if (
    faceValueType !== "MONETARY" &&
    faceValueType !== "NAMED" &&
    faceValueType !== "NONE"
  ) {
    errors.faceValueType = "Select a face value type.";
  } else if (faceValueType === "MONETARY") {
    if (!isDecimal(faceAmount)) {
      errors.faceAmount = "Enter a non-negative decimal amount.";
    }
    if (!currencyCodePattern.test(faceCurrencyCode)) {
      errors.faceCurrencyCode = "Enter a three-letter face currency code.";
    }
    if (namedFaceValueId) {
      errors.namedFaceValueId =
        "Do not select a named face value for a monetary stamp.";
    }
    if (namedFaceValueProposalId) {
      errors.namedFaceValueProposalId =
        "Do not select a pending named definition for a monetary stamp.";
    }
  } else if (faceValueType === "NAMED") {
    if ((namedFaceValueId === "") === (namedFaceValueProposalId === "")) {
      errors.namedFaceValueId = "Select a named face value.";
    }
    if (faceAmount) {
      errors.faceAmount = "Do not enter an amount for a named stamp.";
    }
    if (faceCurrencyCode) {
      errors.faceCurrencyCode = "Do not enter a currency for a named stamp.";
    }
  } else {
    if (faceAmount) {
      errors.faceAmount =
        "Do not enter an amount for a stamp without a face value.";
    }
    if (faceCurrencyCode) {
      errors.faceCurrencyCode =
        "Do not enter a currency for a stamp without a face value.";
    }
    if (namedFaceValueId) {
      errors.namedFaceValueId =
        "Do not select a named face value for a stamp without a face value.";
    }
    if (namedFaceValueProposalId) {
      errors.namedFaceValueProposalId =
        "Do not select a pending named definition for a stamp without a face value.";
    }
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
  if (faceValueType === "NONE") {
    if (!hasManualAmount) {
      errors.manualPostageAmount = "Enter the manual postage amount.";
    }
    if (!hasManualCurrency) {
      errors.manualPostageCurrencyCode = "Select the manual postage currency.";
    }
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
      faceValueType: faceValueType as "MONETARY" | "NAMED" | "NONE",
      faceAmount: faceValueType === "MONETARY" ? faceAmount : null,
      faceCurrencyCode: faceValueType === "MONETARY" ? faceCurrencyCode : null,
      namedFaceValueId:
        faceValueType === "NAMED" && namedFaceValueId
          ? namedFaceValueId
          : null,
      namedFaceValueProposalId:
        faceValueType === "NAMED" && namedFaceValueProposalId
          ? namedFaceValueProposalId
          : null,
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
