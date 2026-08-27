export type StampQuantityInput = {
  quantityOwned: number;
  quantityAnnulled: number;
};

export type StampQuantityErrors = Partial<
  Record<"quantityOwned" | "quantityAnnulled", string>
>;

type StampQuantityValidationResult =
  | { data: StampQuantityInput; errors?: never }
  | { data?: never; errors: StampQuantityErrors };

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

export function validateStampQuantities(
  input: unknown,
): StampQuantityValidationResult {
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const quantityOwnedValue = integerString(record, "quantityOwned");
  const quantityAnnulledValue = integerString(record, "quantityAnnulled");
  const errors: StampQuantityErrors = {};

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

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      quantityOwned: Number(ownedBigInt),
      quantityAnnulled: Number(annulledBigInt),
    },
  };
}
