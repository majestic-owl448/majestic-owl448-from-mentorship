import { prisma } from "@/lib/db";
import { seedDevelopmentUsers } from "@/lib/developmentUserProfiles";

if (process.env.DATABASE_URL !== "file:./data.db.test-users") {
  throw new Error(
    "Refusing to reset a database other than file:./data.db.test-users.",
  );
}

seedDevelopmentUsers()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seeded the normal and moderator local test users.");
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
