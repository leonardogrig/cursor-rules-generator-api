import axios from "axios";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.API_URL || "http://localhost:3001";
const ENDPOINT = "/api/package-rules/generate";
const OUTPUT_DIR = path.join(process.cwd(), "test-results");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
  console.log(`Created output directory at ${OUTPUT_DIR}`);
}

// List of packages to test (defaults, but can be overridden via command line)
let packagesToTest = ["@mendable/firecrawl-js"];

// Check for packages specified as command line arguments
if (process.argv.length > 2) {
  packagesToTest = process.argv.slice(2);
  console.log(
    `Using command line specified packages: ${packagesToTest.join(", ")}`
  );
}

/**
 * Test the package rules generator API
 */
async function testPackageRulesGenerator() {
  try {
    // Log usage information first
    logUsage();

    console.log(
      `\n🧪 Testing package rules generation for: ${packagesToTest.join(", ")}`
    );
    console.log(`📡 API URL: ${API_URL}${ENDPOINT}`);

    console.log("\n⏳ Sending request...");
    const startTime = Date.now();

    const response = await axios.post(
      `${API_URL}${ENDPOINT}`,
      {
        packages: packagesToTest,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const duration = Date.now() - startTime;
    console.log(`✅ Request completed in ${duration}ms\n`);

    // Debug: Show raw response
    console.log("🔍 Raw API Response:");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("\n");

    // Output results
    if (response.data.success) {
      console.log(
        `🎉 Success! Found rules for ${response.data.data.length} packages\n`
      );

      // Display results
      response.data.data.forEach((packageRule: any, index: number) => {
        console.log(`\n📦 Package ${index + 1}: ${packageRule.packageName}`);

        if (!packageRule.categories || packageRule.categories.length === 0) {
          console.log("   ❌ No categories found for this package");
          return;
        }

        // Output each category and its instructions
        packageRule.categories.forEach((category: any, catIndex: number) => {
          console.log(`\n   📚 Category ${catIndex + 1}: ${category.category}`);

          if (!category.instructions || category.instructions.length === 0) {
            console.log("      ℹ️ No instructions found for this category");
            return;
          }

          console.log("   Instructions:");
          category.instructions.forEach((instruction: string, i: number) => {
            console.log(`      ${i + 1}. ${instruction}`);
          });
        });
      });

      // Save results to file
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const outputFile = path.join(OUTPUT_DIR, `rules-${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2));
      console.log(`\n💾 Results saved to ${outputFile}`);
    } else {
      console.error("❌ Request failed:", response.data.message);
    }
  } catch (error) {
    console.error("❌ Error testing package rules generator:");
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`);
      console.error("   Response:", error.response?.data);
    } else {
      console.error(error);
    }
  }
}

/**
 * Log usage information
 */
function logUsage() {
  console.log(`
Usage:
  npx ts-node src/tests/test-client.ts [package1] [package2] [...]
  
  If no packages are specified, the default list will be used.
`);
}

// Run the test
testPackageRulesGenerator();
