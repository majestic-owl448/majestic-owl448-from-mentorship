import { prisma } from "@/lib/db";

describe("prisma smoke", () => {
  it("writes and reads a user", async () => {
    const created = await prisma.user.create({
      data: { name: "smoke", email: "smoke@example.com" },
    });
    expect(created.id).toBeTypeOf("number");
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    expect(found.some((u) => u.id === created.id)).toBe(true);

    await prisma.user.delete({ where: { id: created.id } });
  });
});
