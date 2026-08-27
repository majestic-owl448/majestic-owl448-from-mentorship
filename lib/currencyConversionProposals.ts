import { prisma } from "@/lib/db";
import type { CurrencyConversionProposalInput } from "@/lib/currencyConversionProposalValidation";

export class CurrencyConversionProposalTargetError extends Error {
  constructor() {
    super("Select an approved conversion to correct.");
    this.name = "CurrencyConversionProposalTargetError";
  }
}

export class CurrencyConversionProposalCurrencyError extends Error {
  readonly field: "fromCurrencyCode" | "toCurrencyCode";

  constructor(field: "fromCurrencyCode" | "toCurrencyCode") {
    super(
      field === "fromCurrencyCode"
        ? "Select an available source currency."
        : "Select an available target currency.",
    );
    this.name = "CurrencyConversionProposalCurrencyError";
    this.field = field;
  }
}

export async function createCurrencyConversionProposal(
  userId: string,
  input: CurrencyConversionProposalInput,
) {
  const [fromCurrency, toCurrency, target] = await Promise.all([
    prisma.currency.findUnique({ where: { code: input.fromCurrencyCode } }),
    prisma.currency.findUnique({ where: { code: input.toCurrencyCode } }),
    input.targetCurrencyConversionId
      ? prisma.currencyConversion.findUnique({
          where: { id: input.targetCurrencyConversionId },
        })
      : null,
  ]);
  if (!fromCurrency) {
    throw new CurrencyConversionProposalCurrencyError("fromCurrencyCode");
  }
  if (!toCurrency) {
    throw new CurrencyConversionProposalCurrencyError("toCurrencyCode");
  }
  if (input.targetCurrencyConversionId && !target) {
    throw new CurrencyConversionProposalTargetError();
  }

  return prisma.currencyConversionProposal.create({
    data: { submittedById: userId, ...input },
  });
}

export async function listCurrencyConversionProposalWorkflow(userId: string) {
  const [approvedConversions, proposals] = await Promise.all([
    prisma.currencyConversion.findMany({
      orderBy: [{ fromCurrencyCode: "asc" }, { toCurrencyCode: "asc" }],
    }),
    prisma.currencyConversionProposal.findMany({
      where: { submittedById: userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);

  return {
    approvedConversions: approvedConversions.map((conversion) => ({
      ...conversion,
      createdAt: conversion.createdAt.toISOString(),
      updatedAt: conversion.updatedAt.toISOString(),
    })),
    proposals: proposals.map((proposal) => ({
      ...proposal,
      createdAt: proposal.createdAt.toISOString(),
    })),
  };
}
