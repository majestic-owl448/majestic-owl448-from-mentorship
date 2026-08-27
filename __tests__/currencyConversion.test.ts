import { prisma } from "@/lib/db";
import { resolveCurrencyConversion } from "@/lib/currencyConversion";

describe("resolveCurrencyConversion", () => {
  beforeAll(async () => {
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "FRF", displayName: "French franc" },
        { code: "GBP", displayName: "Pound sterling" },
        { code: "ITL", displayName: "Italian lira" },
        { code: "USD", displayName: "United States dollar" },
      ],
    });

    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.000516456899089",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns an amount in the display currency unchanged", async () => {
    const result = await resolveCurrencyConversion("1.10", "EUR", "EUR");

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.source).toBe("IDENTITY");
      expect(result.amount.toString()).toBe("1.1");
      expect(result.multiplier.toString()).toBe("1");
      expect(result.currencyCode).toBe("EUR");
    }
  });

  it("multiplies an amount by the approved fixed rate exactly", async () => {
    const result = await resolveCurrencyConversion("1936.27", "ITL", "EUR");

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.source).toBe("FIXED_CONVERSION");
      expect(result.amount.toString()).toBe("0.99999999999905803");
      expect(result.multiplier.toString()).toBe("0.000516456899089");
      expect(result.currencyCode).toBe("EUR");
    }
  });

  it("does not introduce binary floating-point artifacts", async () => {
    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.2",
      },
    });

    const result = await resolveCurrencyConversion("0.1", "USD", "EUR");

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.amount.toString()).toBe("0.02");
    }
  });

  it("preserves products beyond the Decimal default precision", async () => {
    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "FRF",
        toCurrencyCode: "EUR",
        multiplier: "0.3",
      },
    });

    const result = await resolveCurrencyConversion(
      "0.123456789012345678901",
      "FRF",
      "EUR",
    );

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.amount.toString()).toBe("0.0370370367037037036703");
    }
  });

  it("preserves every stored multiplier digit", async () => {
    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "GBP",
        toCurrencyCode: "EUR",
        multiplier: "0.12345678901234567890123456789",
      },
    });

    const result = await resolveCurrencyConversion("1", "GBP", "EUR");

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.multiplier.toString()).toBe(
        "0.12345678901234567890123456789",
      );
    }
  });

  it.each(["0", "-1", "not-a-decimal"])(
    "rejects the invalid multiplier %s",
    async (multiplier) => {
      await expect(
        prisma.currencyConversion.create({
          data: {
            fromCurrencyCode: "EUR",
            toCurrencyCode: "GBP",
            multiplier,
          },
        }),
      ).rejects.toThrow();
    },
  );

  it("returns a typed unresolved result when no rate exists", async () => {
    const result = await resolveCurrencyConversion("10", "EUR", "USD");

    expect(result).toEqual({
      status: "UNRESOLVED",
      reason: "MISSING_CONVERSION",
      fromCurrencyCode: "EUR",
      toCurrencyCode: "USD",
    });
  });

  it("does not infer stamp validity", async () => {
    const result = await resolveCurrencyConversion("10", "EUR", "EUR");

    expect(result).not.toHaveProperty("valid");
    expect(result).not.toHaveProperty("expired");
  });
});
