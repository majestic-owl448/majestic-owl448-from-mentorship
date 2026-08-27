import { prisma } from "@/lib/db";
import {
  normalizeCountryCode,
  normalizeNamedFaceValueCode,
  resolveNamedFaceValue,
} from "@/lib/namedFaceValue";
import { localDateInTimeZone } from "@/lib/postalEntitySettings";

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
        values: {
          create: [
            { id: "italy-zone-one-baseline", amount: "1.35" },
            { amount: "1.40", effectiveOn: "2028-10-01" },
            { amount: "1.45", effectiveOn: "2029-01-01" },
          ],
        },
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
        values: { create: { amount: "0.75" } },
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
    const italian = await resolveNamedFaceValue(
      "it",
      "  b   ZONA 1 ",
      "2028-09-01",
    );
    const american = await resolveNamedFaceValue(
      "US",
      "b zona 1",
      "2028-09-01",
    );

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
    const result = await resolveNamedFaceValue("IT", "b zona 1", "2028-09-01");

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
      where: { id: "italy-zone-one-baseline" },
      data: { amount: "1.40" },
    });

    const result = await resolveNamedFaceValue("IT", "B Zona 1", "2028-09-01");
    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.amount.toString()).toBe("1.4");
    }

    await prisma.valueScheduleValue.update({
      where: { id: "italy-zone-one-baseline" },
      data: { amount: "1.35" },
    });
  });

  it("returns a typed unresolved result when no definition exists", async () => {
    await expect(
      resolveNamedFaceValue("DE", "Standardbrief", "2028-09-01"),
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "MISSING_NAMED_FACE_VALUE",
      countryCode: "DE",
      normalizedCode: "standardbrief",
    });
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

    await expect(
      resolveNamedFaceValue("IT", "Senza prezzo", "2028-09-01"),
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "MISSING_SCHEDULE_VALUE",
      countryCode: "IT",
      normalizedCode: "senza prezzo",
      nextChange: null,
      upcoming: null,
    });
  });

  it("returns an upcoming change when no current schedule value is eligible", async () => {
    await prisma.valueScheduleValue.create({
      data: {
        valueScheduleId: "italy-unpriced",
        amount: "1.20",
        effectiveOn: "2028-09-05",
      },
    });

    const result = await resolveNamedFaceValue(
      "IT",
      "Senza prezzo",
      "2028-09-01",
    );
    expect(result.status).toBe("UNRESOLVED");
    if (
      result.status === "UNRESOLVED" &&
      result.reason === "MISSING_SCHEDULE_VALUE"
    ) {
      expect(result.nextChange?.amount.toString()).toBe("1.2");
      expect(result.nextChange?.daysUntil).toBe(4);
      expect(result.upcoming?.effectiveOn).toBe("2028-09-05");
    }
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

  it("uses the baseline through September 30 and the scheduled value from October 1", async () => {
    const before = await resolveNamedFaceValue(
      "IT",
      "B Zona 1",
      "2028-09-30",
    );
    const effective = await resolveNamedFaceValue(
      "IT",
      "B Zona 1",
      "2028-10-01",
    );

    expect(before.status).toBe("RESOLVED");
    expect(effective.status).toBe("RESOLVED");
    if (before.status === "RESOLVED" && effective.status === "RESOLVED") {
      expect(before.amount.toString()).toBe("1.35");
      expect(before.effectiveOn).toBeNull();
      expect(effective.amount.toString()).toBe("1.4");
      expect(effective.effectiveOn).toBe("2028-10-01");
    }
  });

  it("resolves different current values at one instant across timezone boundaries", async () => {
    const instant = new Date("2028-10-01T00:30:00.000Z");
    const romeDate = localDateInTimeZone("Europe/Rome", instant);
    const losAngelesDate = localDateInTimeZone("America/Los_Angeles", instant);
    const rome = await resolveNamedFaceValue("IT", "B Zona 1", romeDate);
    const losAngeles = await resolveNamedFaceValue(
      "IT",
      "B Zona 1",
      losAngelesDate,
    );

    expect(romeDate).toBe("2028-10-01");
    expect(losAngelesDate).toBe("2028-09-30");
    expect(rome.status).toBe("RESOLVED");
    expect(losAngeles.status).toBe("RESOLVED");
    if (rome.status === "RESOLVED" && losAngeles.status === "RESOLVED") {
      expect(rome.effectiveOn).toBe("2028-10-01");
      expect(losAngeles.effectiveOn).toBeNull();
    }
  });

  it("reports the next change only during its 10-day notice window", async () => {
    const elevenDaysBefore = await resolveNamedFaceValue(
      "IT",
      "B Zona 1",
      "2028-09-20",
    );
    const tenDaysBefore = await resolveNamedFaceValue(
      "IT",
      "B Zona 1",
      "2028-09-21",
    );

    expect(elevenDaysBefore.status).toBe("RESOLVED");
    expect(tenDaysBefore.status).toBe("RESOLVED");
    if (
      elevenDaysBefore.status === "RESOLVED" &&
      tenDaysBefore.status === "RESOLVED"
    ) {
      expect(elevenDaysBefore.upcoming).toBeNull();
      expect(elevenDaysBefore.nextChange?.daysUntil).toBe(11);
      expect(elevenDaysBefore.nextChange?.effectiveOn).toBe("2028-10-01");
      expect(tenDaysBefore.upcoming?.amount.toString()).toBe("1.4");
      expect(tenDaysBefore.upcoming).toMatchObject({
        currencyCode: "EUR",
        effectiveOn: "2028-10-01",
        daysUntil: 10,
      });
      expect(tenDaysBefore.amount.toString()).toBe("1.35");
      expect(tenDaysBefore.effectiveOn).toBeNull();
    }
  });

  it("returns only the current value and next eligible change after a transition", async () => {
    const result = await resolveNamedFaceValue("IT", "B Zona 1", "2028-12-25");

    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.effectiveOn).toBe("2028-10-01");
      expect(result.upcoming?.effectiveOn).toBe("2029-01-01");
      expect(result.upcoming?.daysUntil).toBe(7);
      expect(result.nextChange?.effectiveOn).toBe("2029-01-01");
      expect(result).not.toHaveProperty("history");
      expect(result).not.toHaveProperty("values");
    }
  });

  it.each(["2028-02-30", "10/01/2028", ""])(
    "rejects the invalid local date %s",
    async (localDate) => {
      await expect(
        resolveNamedFaceValue("IT", "B Zona 1", localDate),
      ).rejects.toThrow(RangeError);
    },
  );

  it.each(["2028-02-30", "2028-1-01", "not-a-date"])(
    "rejects the invalid effective date %s",
    async (effectiveOn) => {
      await expect(
        prisma.valueScheduleValue.create({
          data: {
            valueScheduleId: "italy-unpriced",
            amount: "1",
            effectiveOn,
          },
        }),
      ).rejects.toThrow();
    },
  );

  it("rejects duplicate baseline and effective dates within a schedule", async () => {
    await expect(
      prisma.valueScheduleValue.create({
        data: { valueScheduleId: "italy-zone-one", amount: "2" },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.valueScheduleValue.create({
        data: {
          valueScheduleId: "italy-zone-one",
          amount: "2",
          effectiveOn: "2028-10-01",
        },
      }),
    ).rejects.toThrow();
  });
});
