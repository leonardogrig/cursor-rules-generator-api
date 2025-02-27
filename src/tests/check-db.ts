import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkPackages() {
  try {
    console.log("Checking packages in database...\n");

    // Get all packages
    const packages = await prisma.packageRule.findMany({
      include: {
        categories: true,
      },
    });

    console.log(`Found ${packages.length} packages in database:\n`);

    // Display each package and its categories
    packages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.packageName}`);
      console.log(`   Created: ${pkg.createdAt.toISOString()}`);
      console.log(`   Updated: ${pkg.updatedAt.toISOString()}`);
      console.log(`   Categories: ${pkg.categories.length}`);

      pkg.categories.forEach((cat, catIndex) => {
        console.log(
          `     ${catIndex + 1}. ${cat.name} (${
            cat.instructions.length
          } instructions)`
        );
      });

      console.log("");
    });
  } catch (error) {
    console.error("Error checking packages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkPackages();
