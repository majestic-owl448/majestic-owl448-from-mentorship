export type CurrencyConversionProposalField =
  | "proposalKind"
  | "targetCurrencyConversionId"
  | "fromCurrencyCode"
  | "toCurrencyCode"
  | "multiplier"
  | "sourceUrl"
  | "sourceNote";

export type CurrencyConversionProposalInput = {
  targetCurrencyConversionId: string | null;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  multiplier: string;
  sourceUrl: string | null;
  sourceNote: string | null;
};

type ValidationResult =
  | { data: CurrencyConversionProposalInput; errors?: never }
  | {
      data?: never;
      errors: Partial<Record<CurrencyConversionProposalField, string>>;
    };

const currencyCodePattern = /^[A-Z]{3}$/;
const positiveDecimalPattern = /^(?:0*[1-9]\d*)(?:\.\d+)?$|^0*\.\d*[1-9]\d*$/;

function stringValue(record: Record<string, unknown>, field: string) {
  return typeof record[field] === "string" ? record[field].trim() : "";
}

export function validateCurrencyConversionProposal(
  input: unknown,
): ValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const targetCurrencyConversionId =
    stringValue(record, "targetCurrencyConversionId") || null;
  const proposalKind = stringValue(record, "proposalKind").toUpperCase();
  const fromCurrencyCode = stringValue(record, "fromCurrencyCode").toUpperCase();
  const toCurrencyCode = stringValue(record, "toCurrencyCode").toUpperCase();
  const submittedMultiplier = stringValue(record, "multiplier");
  const multiplier = submittedMultiplier.startsWith(".")
    ? `0${submittedMultiplier}`
    : submittedMultiplier;
  const sourceUrl = stringValue(record, "sourceUrl") || null;
  const sourceNote =
    stringValue(record, "sourceNote").replace(/\s+/g, " ") || null;
  const errors: Partial<Record<CurrencyConversionProposalField, string>> = {};

  if (proposalKind !== "MISSING" && proposalKind !== "CORRECTION") {
    errors.proposalKind = "Select a missing conversion or correction proposal.";
  } else if (proposalKind === "CORRECTION" && !targetCurrencyConversionId) {
    errors.targetCurrencyConversionId =
      "Select an approved conversion to correct.";
  } else if (proposalKind === "MISSING" && targetCurrencyConversionId) {
    errors.targetCurrencyConversionId =
      "Remove the approved conversion from a missing conversion proposal.";
  }

  if (!currencyCodePattern.test(fromCurrencyCode)) {
    errors.fromCurrencyCode = "Select a supported source currency.";
  }
  if (!currencyCodePattern.test(toCurrencyCode)) {
    errors.toCurrencyCode = "Select a supported target currency.";
  } else if (fromCurrencyCode === toCurrencyCode) {
    errors.toCurrencyCode = "Select a target currency different from the source.";
  }
  if (!positiveDecimalPattern.test(multiplier)) {
    errors.multiplier = "Enter a positive decimal multiplier.";
  }
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

  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  return {
    data: {
      targetCurrencyConversionId,
      fromCurrencyCode,
      toCurrencyCode,
      multiplier,
      sourceUrl,
      sourceNote,
    },
  };
}
