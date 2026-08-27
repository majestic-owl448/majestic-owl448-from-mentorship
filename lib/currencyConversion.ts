import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

type DecimalInput = string | Prisma.Decimal;

export type ConversionResolution =
  | {
      status: "RESOLVED";
      source: "IDENTITY" | "FIXED_CONVERSION";
      amount: Prisma.Decimal;
      currencyCode: string;
      multiplier: Prisma.Decimal;
    }
  | {
      status: "UNRESOLVED";
      reason: "MISSING_CONVERSION";
      fromCurrencyCode: string;
      toCurrencyCode: string;
    };

export async function resolveCurrencyConversion(
  amount: DecimalInput,
  fromCurrencyCode: string,
  toCurrencyCode: string,
): Promise<ConversionResolution> {
  const decimalAmount = new Prisma.Decimal(amount);

  if (fromCurrencyCode === toCurrencyCode) {
    return {
      status: "RESOLVED",
      source: "IDENTITY",
      amount: decimalAmount,
      currencyCode: toCurrencyCode,
      multiplier: new Prisma.Decimal(1),
    };
  }

  const conversion = await prisma.currencyConversion.findUnique({
    where: {
      fromCurrencyCode_toCurrencyCode: {
        fromCurrencyCode,
        toCurrencyCode,
      },
    },
  });

  if (!conversion) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_CONVERSION",
      fromCurrencyCode,
      toCurrencyCode,
    };
  }

  return {
    status: "RESOLVED",
    source: "FIXED_CONVERSION",
    amount: decimalAmount.mul(new Prisma.Decimal(conversion.multiplier)),
    currencyCode: toCurrencyCode,
    multiplier: new Prisma.Decimal(conversion.multiplier),
  };
}
