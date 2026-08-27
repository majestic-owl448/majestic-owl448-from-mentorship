export type StampUpdateInput = {
  quantityOwned: number;
  quantityAnnulled: number;
  expired: boolean;
};

export type StampUpdateErrors = Partial<
  Record<"quantityOwned" | "quantityAnnulled" | "expired", string>
>;

type StampUpdateValidationResult =
  | { data: StampUpdateInput; errors?: never }
  | { data?: never; errors: StampUpdateErrors };

const zeroBigInt = BigInt(0);
const maxDatabaseInteger = BigInt("2147483647");

function integerString(record: Record<string, unknown>, field: string) {
  const value = record[field];
  if (typeof value === "string") {
    return value.trim();
  }
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value.toString()
    : "";
}

export function validateStampUpdate(
  input: unknown,
): StampUpdateValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const quantityOwnedValue = integerString(record, "quantityOwned");
  const quantityAnnulledValue = integerString(record, "quantityAnnulled");
  const errors: StampUpdateErrors = {};

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
    errors.expired = "Select whether the stamp is expired.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      quantityOwned: Number(ownedBigInt),
      quantityAnnulled: Number(annulledBigInt),
      expired: record.expired as boolean,
    },
  };
}
