import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { multiplyExactDecimals } from "@/lib/decimal";

type DecimalInput = string | Prisma.Decimal;

export type ConversionResolution =
  | {
      status: "RESOLVED";
      source: "IDENTITY" | "FIXED_CONVERSION" | "PENDING_PROPOSAL";
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
  userId?: string,
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

  const [proposal, conversion] = await Promise.all([
    userId
      ? prisma.currencyConversionProposal.findFirst({
          where: {
            submittedById: userId,
            fromCurrencyCode,
            toCurrencyCode,
            status: "PENDING",
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })
      : null,
    prisma.currencyConversion.findUnique({
      where: {
        fromCurrencyCode_toCurrencyCode: {
          fromCurrencyCode,
          toCurrencyCode,
        },
      },
    }),
  ]);

  const multiplier = proposal?.multiplier ?? conversion?.multiplier;
  if (!multiplier) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_CONVERSION",
      fromCurrencyCode,
      toCurrencyCode,
    };
  }

  return {
    status: "RESOLVED",
    source: proposal ? "PENDING_PROPOSAL" : "FIXED_CONVERSION",
    amount: new Prisma.Decimal(
      multiplyExactDecimals(decimalAmount.toFixed(), multiplier),
    ),
    currencyCode: toCurrencyCode,
    multiplier: new Prisma.Decimal(multiplier),
  };
}
