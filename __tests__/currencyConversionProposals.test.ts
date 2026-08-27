import { prisma } from "@/lib/db";
import { resolveCurrencyConversion } from "@/lib/currencyConversion";
import { createCurrencyConversionProposal } from "@/lib/currencyConversionProposals";
import { validateCurrencyConversionProposal } from "@/lib/currencyConversionProposalValidation";

const source = { sourceUrl: null, sourceNote: "National postal tariff" };

describe("fixed-conversion proposals", () => {
  beforeEach(async () => {
    await prisma.currencyConversionProposal.deleteMany();
    await prisma.currencyConversion.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.currency.deleteMany();
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "GBP", displayName: "Pound sterling" },
        { code: "ITL", displayName: "Italian lira" },
      ],
    });
    await prisma.userProfile.createMany({
      data: [{ id: "first-user" }, { id: "second-user" }],
    });
  });

  it("validates positive exact multipliers and requires a source", () => {
    for (const multiplier of ["", "0", "0.0", "-1", "1e2", "not-a-number"]) {
      expect(
        validateCurrencyConversionProposal({
          proposalKind: "MISSING",
          fromCurrencyCode: "ITL",
          toCurrencyCode: "EUR",
          multiplier,
          sourceNote: "Tariff",
        }),
      ).toMatchObject({
        errors: { multiplier: "Enter a positive decimal multiplier." },
      });
    }

    expect(
      validateCurrencyConversionProposal({
        proposalKind: "MISSING",
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.000516456899089",
      }),
    ).toEqual({ errors: { sourceNote: "Enter a source URL or source note." } });

    expect(
      validateCurrencyConversionProposal({
        proposalKind: "CORRECTION",
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.0005",
        sourceNote: "Tariff",
      }),
    ).toEqual({
      errors: {
        targetCurrencyConversionId:
          "Select an approved conversion to correct.",
      },
    });
  });

  it("resolves a missing conversion only for its proposer", async () => {
    await createCurrencyConversionProposal("first-user", {
      targetCurrencyConversionId: null,
      fromCurrencyCode: "ITL",
      toCurrencyCode: "EUR",
      multiplier: "0.000516456899089",
      ...source,
    });

    const proposer = await resolveCurrencyConversion(
      "1936.27",
      "ITL",
      "EUR",
      "first-user",
    );
    expect(proposer.status).toBe("RESOLVED");
    if (proposer.status === "RESOLVED") {
      expect(proposer.source).toBe("PENDING_PROPOSAL");
      expect(proposer.amount.toString()).toBe("0.99999999999905803");
    }
    await expect(
      resolveCurrencyConversion("1936.27", "ITL", "EUR", "second-user"),
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "MISSING_CONVERSION",
      fromCurrencyCode: "ITL",
      toCurrencyCode: "EUR",
    });
  });

  it("uses a pending correction for the proposer without overwriting the approved rate", async () => {
    const approved = await prisma.currencyConversion.create({
      data: {
        id: "approved-itl-eur",
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.0005",
      },
    });
    const proposal = await createCurrencyConversionProposal("first-user", {
      targetCurrencyConversionId: approved.id,
      fromCurrencyCode: "ITL",
      toCurrencyCode: "EUR",
      multiplier: "0.0006",
      ...source,
    });

    const proposer = await resolveCurrencyConversion(
      "1000",
      "ITL",
      "EUR",
      "first-user",
    );
    const otherUser = await resolveCurrencyConversion(
      "1000",
      "ITL",
      "EUR",
      "second-user",
    );
    expect(proposer.status === "RESOLVED" && proposer.amount.toString()).toBe(
      "0.6",
    );
    expect(otherUser.status === "RESOLVED" && otherUser.amount.toString()).toBe(
      "0.5",
    );
    expect(
      await prisma.currencyConversion.findUnique({ where: { id: approved.id } }),
    ).toMatchObject({ multiplier: "0.0005" });
    expect(
      await prisma.currencyConversionProposal.findUnique({
        where: { id: proposal.id },
      }),
    ).toMatchObject({ multiplier: "0.0006", status: "PENDING" });
  });

  it("keeps changed source and target currencies in the immutable proposal", async () => {
    const approved = await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.0005",
      },
    });
    const proposal = await createCurrencyConversionProposal("first-user", {
      targetCurrencyConversionId: approved.id,
      fromCurrencyCode: "GBP",
      toCurrencyCode: "EUR",
      multiplier: "1.2",
      ...source,
    });
    await prisma.currencyConversion.update({
      where: { id: approved.id },
      data: { multiplier: "0.0004" },
    });

    expect(
      await prisma.currencyConversionProposal.findUnique({
        where: { id: proposal.id },
      }),
    ).toMatchObject({
      targetCurrencyConversionId: approved.id,
      fromCurrencyCode: "GBP",
      toCurrencyCode: "EUR",
      multiplier: "1.2",
    });
    const result = await resolveCurrencyConversion(
      "2",
      "GBP",
      "EUR",
      "first-user",
    );
    expect(result.status === "RESOLVED" && result.amount.toString()).toBe("2.4");
  });
});
