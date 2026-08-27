import { prisma } from "@/lib/db";

describe("prisma smoke", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("writes and reads a user profile", async () => {
    const created = await prisma.userProfile.create({
      data: { id: "smoke-profile", email: "smoke@example.com" },
    });
    expect(created.id).toBe("smoke-profile");
    expect(created.role).toBe("USER");
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
    expect(found.some((u) => u.id === created.id)).toBe(true);
  });
});
