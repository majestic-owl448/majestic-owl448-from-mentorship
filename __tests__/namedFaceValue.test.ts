import { prisma } from "@/lib/db";
import {
  normalizeCountryCode,
  normalizeNamedFaceValueCode,
  resolveNamedFaceValue,
} from "@/lib/namedFaceValue";

describe("named face values", () => {
  beforeAll(async () => {
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "USD", displayName: "United States dollar" },
      ],
    });

    await prisma.valueSchedule.create({
      data: {
        id: "italy-zone-one",
        countryCode: "IT",
        currencyCode: "EUR",
        currentValue: { create: { amount: "1.35" } },
        namedFaceValues: {
          create: {
            id: "italy-b-zone-one",
            displayCode: "B Zona 1",
            normalizedCode: normalizeNamedFaceValueCode("B Zona 1"),
          },
        },
      },
    });

    await prisma.valueSchedule.create({
      data: {
        id: "us-zone-one",
        countryCode: "US",
        currencyCode: "USD",
        currentValue: { create: { amount: "0.75" } },
        namedFaceValues: {
          create: {
            id: "us-b-zone-one",
            displayCode: "B ZONA 1",
            normalizedCode: normalizeNamedFaceValueCode("B ZONA 1"),
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("normalizes country and named codes for lookup", () => {
    expect(normalizeCountryCode("  ｉｔ ")).toBe("IT");
    expect(normalizeNamedFaceValueCode("  Ｂ   Zona  1 ")).toBe("b zona 1");
  });

  it("resolves the same normalized code independently by country", async () => {
    const italian = await resolveNamedFaceValue("it", "  b   ZONA 1 ");
    const american = await resolveNamedFaceValue("US", "b zona 1");

    expect(italian.status).toBe("RESOLVED");
    expect(american.status).toBe("RESOLVED");
    if (italian.status === "RESOLVED" && american.status === "RESOLVED") {
      expect(italian.amount.toString()).toBe("1.35");
      expect(italian.currencyCode).toBe("EUR");
      expect(american.amount.toString()).toBe("0.75");
      expect(american.currencyCode).toBe("USD");
    }
  });

  it("preserves display capitalization", async () => {
    const result = await resolveNamedFaceValue("IT", "b zona 1");

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.displayCode).toBe("B Zona 1");
    }
  });

  it("rejects a duplicate country and normalized code", async () => {
    await expect(
      prisma.namedFaceValue.create({
        data: {
          countryCode: "IT",
          displayCode: "b zona 1",
          normalizedCode: normalizeNamedFaceValueCode("b zona 1"),
          valueScheduleId: "italy-zone-one",
        },
      }),
    ).rejects.toThrow();
  });

  it("reads the amount from the shared schedule", async () => {
    expect(
      await prisma.namedFaceValue.findUnique({
        where: { id: "italy-b-zone-one" },
      }),
    ).not.toHaveProperty("amount");

    await prisma.valueScheduleValue.update({
      where: { valueScheduleId: "italy-zone-one" },
      data: { amount: "1.40" },
    });

    const result = await resolveNamedFaceValue("IT", "B Zona 1");
    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.amount.toString()).toBe("1.4");
    }
  });

  it("returns a typed unresolved result when no definition exists", async () => {
    await expect(resolveNamedFaceValue("DE", "Standardbrief")).resolves.toEqual(
      {
        status: "UNRESOLVED",
        reason: "MISSING_NAMED_FACE_VALUE",
        countryCode: "DE",
        normalizedCode: "standardbrief",
      },
    );
  });

  it("returns a typed unresolved result when the schedule has no value", async () => {
    await prisma.valueSchedule.create({
      data: {
        id: "italy-unpriced",
        countryCode: "IT",
        currencyCode: "EUR",
        namedFaceValues: {
          create: {
            displayCode: "Senza prezzo",
            normalizedCode: "senza prezzo",
          },
        },
      },
    });

    await expect(resolveNamedFaceValue("IT", "Senza prezzo")).resolves.toEqual(
      {
        status: "UNRESOLVED",
        reason: "MISSING_SCHEDULE_VALUE",
        countryCode: "IT",
        normalizedCode: "senza prezzo",
      },
    );
  });

  it.each(["-1", "not-a-decimal"])(
    "rejects the invalid schedule amount %s",
    async (amount) => {
      await expect(
        prisma.valueScheduleValue.create({
          data: { valueScheduleId: "italy-unpriced", amount },
        }),
      ).rejects.toThrow();
    },
  );
});
