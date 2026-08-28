import { prisma } from "@/lib/db";
import {
  AccountDeletionIncompleteError,
  deleteAccount,
  isAccountDeletionPending,
  processAccountDeletionJob,
  type AccountIdentityDeletion,
} from "@/lib/accountDeletion";
import {
  AccountAccessBlockedError,
  upsertUserProfile,
} from "@/lib/userProfile";

async function clearDeletionFixtures() {
  await prisma.deletedAccountTombstone.deleteMany();
  await prisma.accountDeletionJob.deleteMany();
  await prisma.stampProposalAction.deleteMany();
  await prisma.stampInventoryEntry.deleteMany();
  await prisma.userPostalEntitySetting.deleteMany();
  await prisma.namedFaceValueValueProposal.deleteMany();
  await prisma.namedFaceValueDefinitionProposal.deleteMany();
  await prisma.currencyConversionProposal.deleteMany();
  await prisma.valueScheduleValue.deleteMany();
  await prisma.namedFaceValue.deleteMany();
  await prisma.valueSchedule.deleteMany();
  await prisma.currencyConversion.deleteMany();
  await prisma.postalEntity.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.currency.deleteMany();
}

async function seedDeletionScenario() {
  await prisma.userProfile.createMany({
    data: [
      { id: "deleting-user", email: "delete@example.com" },
      { id: "other-user", email: "other@example.com" },
    ],
  });
  await prisma.currency.createMany({
    data: [
      { code: "EUR", displayName: "Euro" },
      { code: "USD", displayName: "US dollar" },
    ],
  });

  const sharedPostalEntity = await prisma.postalEntity.create({
    data: {
      id: "shared-post",
      name: "Shared Post",
      normalizedName: "shared post",
      countryCode: "IT",
      status: "APPROVED",
      submittedById: "deleting-user",
      moderatedById: "other-user",
      sourceUrl: "https://example.com/delete@example.com",
      sourceNote: "Source supplied by deleting-user",
      decisionNote: "Approved for delete@example.com",
    },
  });
  await prisma.postalEntity.createMany({
    data: [
      {
        id: "pending-post",
        name: "Pending Post",
        normalizedName: "pending post",
        countryCode: "IT",
        status: "PENDING",
        submittedById: "deleting-user",
      },
      {
        id: "rejected-post",
        name: "Rejected Post",
        normalizedName: "rejected post",
        countryCode: "IT",
        status: "REJECTED",
        submittedById: "deleting-user",
      },
      {
        id: "other-post",
        name: "Other Post",
        normalizedName: "other post",
        countryCode: "US",
        status: "APPROVED",
        submittedById: "other-user",
        moderatedById: "other-user",
        sourceNote: "Other source mentions delete@example.com",
      },
    ],
  });

  const deletingSetting = await prisma.userPostalEntitySetting.create({
    data: {
      id: "deleting-setting",
      userId: "deleting-user",
      postalEntityId: sharedPostalEntity.id,
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      timeZoneMode: "CUSTOM",
    },
  });
  const otherSetting = await prisma.userPostalEntitySetting.create({
    data: {
      id: "other-setting",
      userId: "other-user",
      postalEntityId: "other-post",
      displayCurrencyCode: "USD",
      timeZone: "America/New_York",
      timeZoneMode: "CUSTOM",
    },
  });
  await Promise.all([
    prisma.userProfile.update({
      where: { id: "deleting-user" },
      data: { activePostalEntitySettingId: deletingSetting.id },
    }),
    prisma.userProfile.update({
      where: { id: "other-user" },
      data: { activePostalEntitySettingId: otherSetting.id },
    }),
  ]);

  const schedule = await prisma.valueSchedule.create({
    data: { id: "shared-schedule", countryCode: "IT", currencyCode: "EUR" },
  });
  const scheduleValue = await prisma.valueScheduleValue.create({
    data: {
      id: "shared-schedule-value",
      valueScheduleId: schedule.id,
      amount: "1.25",
      effectiveOn: "2026-08-28",
    },
  });
  const namedValue = await prisma.namedFaceValue.create({
    data: {
      id: "shared-named-value",
      countryCode: "IT",
      displayCode: "B",
      normalizedCode: "b",
      valueScheduleId: schedule.id,
    },
  });

  const approvedDefinition = await prisma.namedFaceValueDefinitionProposal.create({
    data: {
      id: "approved-definition",
      submittedById: "deleting-user",
      approvedNamedFaceValueId: namedValue.id,
      countryCode: "IT",
      displayCode: "B",
      normalizedCode: "b",
      currencyCode: "EUR",
      status: "APPROVED",
      sourceNote: "delete@example.com supplied this source",
      decisionNote: "Approved deleting-user",
    },
  });
  const rejectedDefinition = await prisma.namedFaceValueDefinitionProposal.create({
    data: {
      id: "rejected-definition",
      submittedById: "deleting-user",
      countryCode: "IT",
      displayCode: "X",
      normalizedCode: "x",
      currencyCode: "EUR",
      status: "REJECTED",
      sourceNote: "Rejected source",
    },
  });
  await prisma.namedFaceValueDefinitionProposal.create({
    data: {
      id: "pending-definition",
      submittedById: "deleting-user",
      countryCode: "IT",
      displayCode: "P",
      normalizedCode: "p",
      currencyCode: "EUR",
      sourceNote: "Pending source",
    },
  });

  await prisma.namedFaceValueValueProposal.createMany({
    data: [
      {
        id: "approved-schedule-proposal",
        submittedById: "deleting-user",
        namedFaceValueId: namedValue.id,
        amount: "1.25",
        effectiveOn: "2026-08-28",
        eligibleOn: "2026-08-18",
        status: "APPROVED",
        sourceNote: "delete@example.com schedule source",
      },
      {
        id: "merged-schedule-proposal",
        submittedById: "deleting-user",
        namedFaceValueId: namedValue.id,
        mergedValueScheduleValueId: scheduleValue.id,
        amount: "1.25",
        effectiveOn: "2026-08-28",
        eligibleOn: "2026-08-18",
        status: "MERGED",
        sourceNote: "Merged schedule source",
      },
      {
        id: "pending-schedule-proposal",
        submittedById: "deleting-user",
        namedFaceValueId: namedValue.id,
        amount: "1.50",
        effectiveOn: "2027-01-01",
        eligibleOn: "2026-12-22",
        status: "PENDING",
        sourceNote: "Pending schedule source",
      },
      {
        id: "rejected-schedule-proposal",
        submittedById: "deleting-user",
        namedFaceValueId: namedValue.id,
        amount: "1.75",
        effectiveOn: "2027-02-01",
        eligibleOn: "2027-01-22",
        status: "REJECTED",
        sourceNote: "Rejected schedule source",
      },
    ],
  });

  const conversion = await prisma.currencyConversion.create({
    data: {
      id: "shared-conversion",
      fromCurrencyCode: "EUR",
      toCurrencyCode: "USD",
      multiplier: "1.10",
    },
  });
  await prisma.currencyConversionProposal.createMany({
    data: [
      {
        id: "approved-conversion-proposal",
        submittedById: "deleting-user",
        targetCurrencyConversionId: conversion.id,
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        multiplier: "1.10",
        status: "APPROVED",
        sourceNote: "deleting-user conversion source",
      },
      {
        id: "merged-conversion-proposal",
        submittedById: "deleting-user",
        targetCurrencyConversionId: conversion.id,
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        multiplier: "1.10",
        status: "MERGED",
        sourceNote: "Merged conversion source",
      },
      {
        id: "pending-conversion-proposal",
        submittedById: "deleting-user",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.91",
        sourceNote: "Pending conversion source",
      },
      {
        id: "rejected-conversion-proposal",
        submittedById: "deleting-user",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.90",
        status: "REJECTED",
        sourceNote: "Rejected conversion source",
      },
      {
        id: "other-pending-conversion",
        submittedById: "other-user",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.92",
        sourceNote: "Other conversion source for deleting-user",
      },
      {
        id: "other-moderated-conversion",
        submittedById: "other-user",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.93",
        sourceNote: "Other moderated source",
        status: "REJECTED",
        moderatedById: "deleting-user",
        decisionNote: "Rejected by delete@example.com for deleting-user",
      },
    ],
  });

  const deletingStamp = await prisma.stampInventoryEntry.create({
    data: {
      id: "deleting-stamp",
      userId: "deleting-user",
      countryCode: "IT",
      postalEntityId: sharedPostalEntity.id,
      name: "Deleting stamp",
      faceAmount: "1.00",
      faceCurrencyCode: "EUR",
      quantityOwned: 1,
    },
  });
  await prisma.stampProposalAction.create({
    data: {
      id: "private-valuation-action",
      stampId: deletingStamp.id,
      namedDefinitionProposalId: rejectedDefinition.id,
    },
  });
  await prisma.stampInventoryEntry.create({
    data: {
      id: "other-stamp",
      userId: "other-user",
      countryCode: "US",
      postalEntityId: "other-post",
      name: "Other stamp",
      faceAmount: "2.00",
      faceCurrencyCode: "USD",
      quantityOwned: 2,
    },
  });

  return { approvedDefinition };
}

describe("account deletion", () => {
  beforeEach(clearDeletionFixtures);
  afterAll(clearDeletionFixtures);

  it("retries a failed identity deletion without restoring private data", async () => {
    await seedDeletionScenario();
    const revokeSessions = vi.fn(async () => undefined);
    const deleteIdentity = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("SuperTokens unavailable"))
      .mockResolvedValue(undefined);
    const identityDeletion: AccountIdentityDeletion = {
      revokeSessions,
      deleteIdentity,
    };

    await expect(
      deleteAccount("deleting-user", identityDeletion),
    ).rejects.toBeInstanceOf(AccountDeletionIncompleteError);

    await expect(isAccountDeletionPending("deleting-user")).resolves.toBe(true);
    await expect(
      upsertUserProfile("deleting-user", "restored@example.com"),
    ).rejects.toBeInstanceOf(AccountAccessBlockedError);
    await expect(
      prisma.accountDeletionJob.findUniqueOrThrow({
        where: { userId: "deleting-user" },
      }),
    ).resolves.toMatchObject({
      status: "FAILED",
      attemptCount: 1,
      lastError: "SuperTokens unavailable",
    });
    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "deleting-user" } }),
    ).resolves.toMatchObject({ deletingAt: expect.any(Date) });

    expect(
      await prisma.stampInventoryEntry.count({ where: { userId: "deleting-user" } }),
    ).toBe(0);
    expect(
      await prisma.userPostalEntitySetting.count({
        where: { userId: "deleting-user" },
      }),
    ).toBe(0);
    expect(
      await prisma.stampProposalAction.count({
        where: { id: "private-valuation-action" },
      }),
    ).toBe(0);

    const privateProposalWhere = {
      submittedById: "deleting-user",
      status: { in: ["PENDING", "REJECTED"] as const },
    };
    const privateProposalCounts = await Promise.all([
      prisma.postalEntity.count({ where: privateProposalWhere }),
      prisma.namedFaceValueDefinitionProposal.count({ where: privateProposalWhere }),
      prisma.namedFaceValueValueProposal.count({ where: privateProposalWhere }),
      prisma.currencyConversionProposal.count({ where: privateProposalWhere }),
    ]);
    expect(privateProposalCounts).toEqual([0, 0, 0, 0]);

    const preservedRecords = [
      await prisma.postalEntity.findUniqueOrThrow({ where: { id: "shared-post" } }),
      await prisma.namedFaceValueDefinitionProposal.findUniqueOrThrow({
        where: { id: "approved-definition" },
      }),
      await prisma.namedFaceValueValueProposal.findUniqueOrThrow({
        where: { id: "merged-schedule-proposal" },
      }),
      await prisma.currencyConversionProposal.findUniqueOrThrow({
        where: { id: "approved-conversion-proposal" },
      }),
    ];
    for (const record of preservedRecords) {
      expect(record.submittedById).toBeNull();
      expect(JSON.stringify(record)).not.toContain("deleting-user");
      expect(JSON.stringify(record)).not.toContain("delete@example.com");
    }
    await expect(
      prisma.namedFaceValue.findUnique({ where: { id: "shared-named-value" } }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.valueScheduleValue.findUnique({
        where: { id: "shared-schedule-value" },
      }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.currencyConversion.findUnique({ where: { id: "shared-conversion" } }),
    ).resolves.not.toBeNull();

    await processAccountDeletionJob("deleting-user", identityDeletion);

    expect(revokeSessions).toHaveBeenCalledTimes(2);
    expect(deleteIdentity).toHaveBeenCalledTimes(2);
    await expect(isAccountDeletionPending("deleting-user")).resolves.toBe(false);
    await expect(
      prisma.userProfile.findUnique({ where: { id: "deleting-user" } }),
    ).resolves.toBeNull();
    await expect(
      prisma.accountDeletionJob.findUnique({ where: { userId: "deleting-user" } }),
    ).resolves.toBeNull();
    await expect(
      upsertUserProfile("deleting-user", "recreated@example.com"),
    ).rejects.toBeInstanceOf(AccountAccessBlockedError);
    const tombstone = await prisma.deletedAccountTombstone.findFirstOrThrow();
    expect(tombstone.userIdHash).not.toContain("deleting-user");
    expect(tombstone.userIdHash).toHaveLength(64);

    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "other-user" } }),
    ).resolves.toMatchObject({
      email: "other@example.com",
      activePostalEntitySettingId: "other-setting",
    });
    await expect(
      prisma.stampInventoryEntry.findUniqueOrThrow({ where: { id: "other-stamp" } }),
    ).resolves.toMatchObject({ userId: "other-user", quantityOwned: 2 });
    await expect(
      prisma.currencyConversionProposal.findUniqueOrThrow({
        where: { id: "other-pending-conversion" },
      }),
    ).resolves.toMatchObject({
      submittedById: "other-user",
      status: "PENDING",
      multiplier: "0.92",
      sourceNote: "Other conversion source for [deleted account]",
    });
    await expect(
      prisma.postalEntity.findUniqueOrThrow({ where: { id: "other-post" } }),
    ).resolves.toMatchObject({
      submittedById: "other-user",
      moderatedById: "other-user",
      sourceNote: "Other source mentions [deleted account]",
    });
    await expect(
      prisma.currencyConversionProposal.findUniqueOrThrow({
        where: { id: "other-moderated-conversion" },
      }),
    ).resolves.toMatchObject({
      submittedById: "other-user",
      moderatedById: null,
      status: "REJECTED",
      multiplier: "0.93",
      decisionNote: "Rejected by [deleted account] for [deleted account]",
    });
  });

  it("keeps access blocked when session revocation fails before cleanup", async () => {
    await prisma.userProfile.create({
      data: { id: "blocked-user", email: "blocked@example.com" },
    });
    const identityDeletion: AccountIdentityDeletion = {
      revokeSessions: vi.fn(async () => {
        throw new Error("Session service unavailable");
      }),
      deleteIdentity: vi.fn(async () => undefined),
    };

    await expect(
      deleteAccount("blocked-user", identityDeletion),
    ).rejects.toBeInstanceOf(AccountDeletionIncompleteError);

    await expect(isAccountDeletionPending("blocked-user")).resolves.toBe(true);
    await expect(
      upsertUserProfile("blocked-user", "blocked@example.com"),
    ).rejects.toBeInstanceOf(AccountAccessBlockedError);
    expect(identityDeletion.deleteIdentity).not.toHaveBeenCalled();
  });

  it("removes a private proposal written after the first cleanup pass", async () => {
    await prisma.userProfile.create({
      data: { id: "racing-user", email: "racing@example.com" },
    });
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "USD", displayName: "US dollar" },
      ],
    });
    let identityDeletionStarted!: () => void;
    let finishIdentityDeletion!: () => void;
    const reachedIdentityDeletion = new Promise<void>((resolve) => {
      identityDeletionStarted = resolve;
    });
    const identityDeletionMayFinish = new Promise<void>((resolve) => {
      finishIdentityDeletion = resolve;
    });
    const identityDeletion: AccountIdentityDeletion = {
      revokeSessions: vi.fn(async () => undefined),
      deleteIdentity: vi.fn(async () => {
        identityDeletionStarted();
        await identityDeletionMayFinish;
      }),
    };

    const deletion = deleteAccount("racing-user", identityDeletion);
    await reachedIdentityDeletion;
    await prisma.currencyConversionProposal.create({
      data: {
        id: "late-private-proposal",
        submittedById: "racing-user",
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        multiplier: "1.1",
        sourceNote: "Late private proposal",
      },
    });
    finishIdentityDeletion();
    await deletion;

    await expect(
      prisma.currencyConversionProposal.findUnique({
        where: { id: "late-private-proposal" },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.userProfile.findUnique({ where: { id: "racing-user" } }),
    ).resolves.toBeNull();
  });
});
