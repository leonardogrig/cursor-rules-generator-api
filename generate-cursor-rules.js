#!/usr/bin/env node

/**
 * Cursor Rules Generator Script
 *
 * This script:
 * 1. Checks if specific packages were provided as command-line arguments
 *    - If yes, generates rules only for those packages
 *    - If no, reads package.json to extract all dependencies
 * 2. Calls the Cursor Rules Generator API to get rules for those packages
 * 3. Creates .mdc files in the .cursor/rules directory
 */

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.API_URL || "http://localhost:3001";
const API_ENDPOINT = "/api/package-rules/generate";
const RULES_DIR = path.join(".cursor", "rules");

/**
 * Display usage information
 */
function displayUsage() {
  console.log(`
Usage:
  node generate-cursor-rules.js [package1] [package2] [...]

  If no packages are specified, all dependencies from package.json will be used.
  `);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("\n🚀 Starting Cursor Rules generation process...\n");

    // Check if help is requested
    if (process.argv.includes("--help") || process.argv.includes("-h")) {
      displayUsage();
      return;
    }

    // Ensure the rules directory exists
    console.log("📁 Checking rules directory...");
    await ensureDirectoryExists(RULES_DIR);

    // Get command-line arguments (skip first two: node and script name)
    const cliPackages = process.argv.slice(2);
    let dependencies = [];

    // If packages are specified via command line, use those
    if (cliPackages.length > 0) {
      console.log("🔍 Using packages specified via command line...");
      dependencies = cliPackages;
      console.log(`✅ Found ${dependencies.length} packages to process:`);
      console.log(`   ${dependencies.join(", ")}`);
    } else {
      // Read package.json and extract dependencies
      console.log("📦 Reading package.json...");
      const packageJson = await readPackageJson();

      // Extract all dependencies
      console.log("🔍 Extracting dependencies from package.json...");
      dependencies = extractDependencies(packageJson);
      console.log(`✅ Found ${dependencies.length} packages in your project:`);
      if (dependencies.length <= 10) {
        console.log(`   ${dependencies.join(", ")}`);
      } else {
        console.log(
          `   ${dependencies.slice(0, 5).join(", ")} and ${
            dependencies.length - 5
          } more...`
        );
      }
    }

    if (dependencies.length === 0) {
      console.log("❌ No dependencies found. Exiting.");
      if (cliPackages.length > 0) {
        console.log(
          "   Please check the package names you specified and try again."
        );
        console.log("   Example: node generate-cursor-rules.js axios react");
      } else {
        console.log(
          "   Your package.json file doesn't contain any dependencies."
        );
        console.log(
          "   You can specify packages directly: node generate-cursor-rules.js axios"
        );
      }
      displayUsage();
      return;
    }

    // Fetch rules from API
    console.log("\n📡 Connecting to rules API...");
    console.log(`   URL: ${API_URL}${API_ENDPOINT}`);
    console.log("\n⏳ Fetching package rules... (this may take some time)");
    console.log("   The system will either:");
    console.log("   - Use existing rules from the database");
    console.log("   - Search for package documentation");
    console.log("   - Extract best practices from documentation\n");

    const startTime = Date.now();
    const rules = await fetchRules(dependencies);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!rules.length) {
      console.log(
        "❌ No rules could be generated. Check the API server logs for details."
      );
      return;
    }

    // If specific packages were requested, verify they were generated
    if (cliPackages.length > 0) {
      const foundPackageNames = rules.map((rule) => rule.packageName);
      const missingPackages = cliPackages.filter(
        (pkg) => !foundPackageNames.includes(pkg)
      );

      if (missingPackages.length > 0) {
        console.log(
          `⚠️ Warning: No rules could be generated for the following packages:`
        );
        console.log(`   ${missingPackages.join(", ")}`);
        console.log(
          "   This could be due to missing documentation or API limitations."
        );
      }
    }

    console.log(
      `\n✅ Successfully received rules for ${rules.length} packages in ${duration}s`
    );

    // Generate .mdc files
    console.log("\n📝 Generating Cursor rule files...");
    await generateMdcFiles(rules);

    console.log("\n🎉 Cursor Rules generation completed successfully!");
    console.log(
      `   ${rules.length} rule files have been created in ${RULES_DIR}`
    );
    if (cliPackages.length > 0) {
      console.log(
        `   Rules were generated for the specified packages: ${cliPackages.join(
          ", "
        )}`
      );
    } else {
      console.log(
        `   Rules were generated for dependencies from your package.json`
      );
    }
    console.log("   Restart Cursor to apply these rules to your project.\n");
  } catch (error) {
    console.error("\n❌ Error generating Cursor Rules:", error.message);
    if (error.response && error.response.data) {
      console.error("   API Error Details:", error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Ensure the target directory exists
 */
async function ensureDirectoryExists(directory) {
  try {
    await fs.mkdir(directory, { recursive: true });
    console.log(`✅ Directory ${directory} is ready`);
  } catch (error) {
    console.error(`❌ Error creating directory ${directory}:`, error);
    throw error;
  }
}

/**
 * Read the package.json file
 */
async function readPackageJson() {
  try {
    const data = await fs.readFile("package.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Error reading package.json:", error);
    throw error;
  }
}

/**
 * Extract dependencies from package.json
 */
function extractDependencies(packageJson) {
  const dependencies = [];

  // Regular dependencies
  if (packageJson.dependencies) {
    dependencies.push(...Object.keys(packageJson.dependencies));
  }

  // Dev dependencies
  if (packageJson.devDependencies) {
    dependencies.push(...Object.keys(packageJson.devDependencies));
  }

  // Remove duplicates
  return [...new Set(dependencies)];
}

/**
 * Fetch rules from the API
 */
async function fetchRules(packages) {
  try {
    console.log(`📤 Sending request for ${packages.length} packages...`);

    const response = await axios.post(`${API_URL}${API_ENDPOINT}`, {
      packages,
    });

    if (
      response.data &&
      response.data.success &&
      Array.isArray(response.data.data)
    ) {
      return response.data.data;
    }

    console.error("❌ API response format not as expected:");
    console.error(
      `   Success: ${response.data?.success}, Data: ${
        response.data?.data ? "Present" : "Missing"
      }`
    );
    console.error(
      `   Message: ${response.data?.message || "No error message provided"}`
    );
    return [];
  } catch (error) {
    console.error("❌ Error fetching rules from API:", error.message);
    if (error.response) {
      console.error("   API error response:", error.response.data);
    } else if (error.request) {
      console.error("   No response received from API. Is the server running?");
    } else {
      console.error("   Error setting up the request:", error.message);
    }
    throw error;
  }
}

/**
 * Generate .mdc files for each package
 */
async function generateMdcFiles(rules) {
  let created = 0;
  let errors = 0;

  for (const rule of rules) {
    try {
      const { packageName, description, categories } = rule;

      process.stdout.write(`   Creating rule for ${packageName}... `);

      // Format the filename
      // Replace '/' with '-' (for scoped packages like @prisma/client)
      const fileName = `${packageName.replace(/\//g, "-")}-rule.mdc`;
      const filePath = path.join(RULES_DIR, fileName);

      // Create the .mdc content
      const content = formatMdcContent(categories, description);

      // Write the file with LF line endings
      await writeFileWithLfEndings(filePath, content);

      console.log(`✅ Done`);
      created++;
    } catch (error) {
      console.log(`❌ Error`);
      console.error(
        `   Error creating rule file for ${rule.packageName}:`,
        error.message
      );
      errors++;
    }
  }

  console.log(`\n📊 Summary: ${created} files created, ${errors} errors`);
}

/**
 * Format the .mdc content according to the required structure with category headings
 */
function formatMdcContent(categories, description) {
  // Get package name from the first category if available
  const packageNameHint =
    categories?.[0]?.category?.match(/for\s+([a-zA-Z0-9_\-@/]+)/i)?.[1] ||
    "this package";

  // Use the provided description or fallback to standardized format
  const mdcDescription =
    description || `${packageNameHint} configuration and usage guidelines`;

  // Create the .mdc content with the required structure
  const content = [
    "---",
    `description: ${mdcDescription}`,
    "globs: ",
    "---",
    "",
  ];

  // Add each category with its instructions
  if (Array.isArray(categories) && categories.length > 0) {
    categories.forEach((categoryData) => {
      // Add category heading
      content.push(`# ${categoryData.category}`);
      content.push("");

      // Add instructions under the heading
      if (
        Array.isArray(categoryData.instructions) &&
        categoryData.instructions.length > 0
      ) {
        categoryData.instructions.forEach((instruction) => {
          content.push(`- ${instruction}`);
        });
        // Add extra line between categories
        content.push("");
      } else {
        content.push("- No specific instructions available for this category");
        content.push("");
      }
    });
  } else {
    content.push("# General Tips");
    content.push("");
    content.push("- You can @ files here");
    content.push("- You can use markdown but dont have to");
    content.push("");
  }

  return content.join("\n");
}

/**
 * Write file with Unix (LF) line endings
 */
async function writeFileWithLfEndings(filePath, content) {
  // Ensure content has LF endings by replacing CRLF with LF
  const normalizedContent = content.replace(/\r\n/g, "\n");
  await fs.writeFile(filePath, normalizedContent, { encoding: "utf8" });
}

// Run the script
main();
