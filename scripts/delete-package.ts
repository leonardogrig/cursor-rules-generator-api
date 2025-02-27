import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

async function deletePackage() {
  // Get package name from command line arguments
  const packageName = process.argv[2];

  if (!packageName) {
    console.error("Please provide a package name as an argument");
    process.exit(1);
  }

  try {
    console.log(`Attempting to delete package rule for: ${packageName}`);

    // Delete the package rule
    const result = await prisma.packageRule.delete({
      where: {
        packageName,
      },
    });

    console.log(`Successfully deleted package rule:`, result);
  } catch (error) {
    console.error(`Error deleting package rule for ${packageName}:`, error);
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the function
deletePackage().catch((e) => {
  console.error(e);
  process.exit(1);
});
