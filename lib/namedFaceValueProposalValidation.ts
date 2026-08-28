import { normalizeCountryCode, normalizeNamedFaceValueCode } from "@/lib/namedFaceValue";
import { countryOptions } from "@/lib/postalEntitySettingValidation";

export type NamedFaceValueProposalField =
  | "proposalType"
  | "targetNamedFaceValueId"
  | "definitionProposalId"
  | "replacesRejectedProposalId"
  | "countryCode"
  | "displayCode"
  | "normalizedCode"
  | "currencyCode"
  | "amount"
  | "effectiveOn"
  | "sourceUrl"
  | "sourceNote";

export type DefinitionProposalInput = {
  proposalType: "DEFINITION";
  targetNamedFaceValueId: string | null;
  replacesRejectedProposalId?: string | null;
  countryCode: string;
  displayCode: string;
  normalizedCode: string;
  currencyCode: string;
  sourceUrl: string | null;
  sourceNote: string | null;
};

export type ValueProposalInput = {
  proposalType: "VALUE";
  targetNamedFaceValueId: string | null;
  definitionProposalId: string | null;
  amount: string;
  effectiveOn: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
};

export type NamedFaceValueProposalInput =
  | DefinitionProposalInput
  | ValueProposalInput;

type ValidationResult =
  | { data: NamedFaceValueProposalInput; errors?: never }
  | {
      data?: never;
      errors: Partial<Record<NamedFaceValueProposalField, string>>;
    };

const countryCodes = new Set(countryOptions().map(({ value }) => value));
const currencyCodes = new Set(Intl.supportedValuesOf("currency"));
const decimalPattern = /^\d+(?:\.\d+)?$/;

function stringValue(record: Record<string, unknown>, field: string) {
  return typeof record[field] === "string" ? record[field].trim() : "";
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function sourceValues(
  record: Record<string, unknown>,
  errors: Partial<Record<NamedFaceValueProposalField, string>>,
) {
  const sourceUrl = stringValue(record, "sourceUrl") || null;
  const sourceNote =
    stringValue(record, "sourceNote").replace(/\s+/g, " ") || null;

  if (!sourceUrl && !sourceNote) {
    errors.sourceNote = "Enter a source URL or source note.";
  }
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.sourceUrl = "Enter an HTTP or HTTPS source URL.";
      }
    } catch {
      errors.sourceUrl = "Enter a valid source URL.";
    }
  }

  return { sourceUrl, sourceNote };
}

export function validateNamedFaceValueProposal(
  input: unknown,
): ValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const proposalType = stringValue(record, "proposalType").toUpperCase();
  const errors: Partial<Record<NamedFaceValueProposalField, string>> = {};
  const source = sourceValues(record, errors);

  if (proposalType === "DEFINITION") {
    const targetNamedFaceValueId =
      stringValue(record, "targetNamedFaceValueId") || null;
    const replacesRejectedProposalId =
      stringValue(record, "replacesRejectedProposalId") || null;
    const countryCode = normalizeCountryCode(
      stringValue(record, "countryCode"),
    );
    const displayCode = stringValue(record, "displayCode").replace(/\s+/g, " ");
    const normalizedCode = normalizeNamedFaceValueCode(
      stringValue(record, "normalizedCode"),
    );
    const currencyCode = stringValue(record, "currencyCode").toUpperCase();

    if (!countryCodes.has(countryCode)) {
      errors.countryCode = "Select a valid ISO 3166-1 country.";
    }
    if (!displayCode) {
      errors.displayCode = "Enter the proposed display name or code.";
    }
    if (!normalizedCode) {
      errors.normalizedCode = "Enter the proposed normalized code.";
    }
    if (!currencyCodes.has(currencyCode)) {
      errors.currencyCode = "Select a supported schedule currency.";
    }

    if (Object.keys(errors).length > 0) {
      return { errors };
    }
    return {
      data: {
        proposalType: "DEFINITION",
        targetNamedFaceValueId,
        ...(replacesRejectedProposalId
          ? { replacesRejectedProposalId }
          : {}),
        countryCode,
        displayCode,
        normalizedCode,
        currencyCode,
        ...source,
      },
    };
  }

  if (proposalType === "VALUE") {
    const targetNamedFaceValueId =
      stringValue(record, "targetNamedFaceValueId") || null;
    const definitionProposalId =
      stringValue(record, "definitionProposalId") || null;
    const amount = stringValue(record, "amount");
    const effectiveOn = stringValue(record, "effectiveOn") || null;

    if ((targetNamedFaceValueId === null) === (definitionProposalId === null)) {
      errors.targetNamedFaceValueId =
        "Select one approved or pending named definition.";
    }
    if (!decimalPattern.test(amount)) {
      errors.amount = "Enter a non-negative decimal amount.";
    }
    if (effectiveOn && !isCalendarDate(effectiveOn)) {
      errors.effectiveOn = "Enter a valid effective date.";
    }

    if (Object.keys(errors).length > 0) {
      return { errors };
    }
    return {
      data: {
        proposalType: "VALUE",
        targetNamedFaceValueId,
        definitionProposalId,
        amount,
        effectiveOn,
        ...source,
      },
    };
  }

  errors.proposalType = "Select a definition or schedule value proposal.";
  return { errors };
}
