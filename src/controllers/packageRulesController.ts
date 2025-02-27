import { Request, Response } from "express";
import { prisma } from "../index";
import firecrawlService from "../services/firecrawl";
import { CategoryInstructions } from "../types";
import logger from "../utils/logger";

/**
 * Generate package rules
 */
export const generateRules = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    logger.info("Package rules generation request received", {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    const { packages } = req.body;

    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      logger.warn("Invalid request: Empty or invalid packages array");
      res.status(400).json({
        success: false,
        message: "Please provide an array of package names",
      });
      return;
    }

    logger.info(`Processing ${packages.length} packages`, {
      packageList: packages,
    });

    // The result array to return to the client
    const results = [];
    let successCount = 0;

    // Process each package
    for (const packageName of packages) {
      try {
        logger.debug(`Processing package: ${packageName}`);

        // Check if package rules already exist in the database
        logger.info(
          `Checking database for existing rules for ${packageName}...`
        );
        const existingRules = await prisma.packageRule.findFirst({
          where: { packageName },
          include: {
            categories: true,
          },
        });

        if (existingRules) {
          // Use existing rules
          logger.info(`Found existing rules for ${packageName} in database`);

          const formattedCategories: CategoryInstructions[] =
            existingRules.categories.map((cat) => ({
              category: cat.name,
              instructions: cat.instructions,
            }));

          results.push({
            packageName,
            description: existingRules.description,
            categories: formattedCategories,
          });

          successCount++;
          continue;
        }

        // Fetch new rules using Firecrawl
        logger.info(
          `No existing rules found for ${packageName} - initiating search...`
        );

        // First search for documentation
        logger.info(`Searching for ${packageName} documentation resources...`);
        const searchResult = await firecrawlService.search(packageName);

        if (!searchResult?.success || !searchResult?.data?.length) {
          logger.warn(
            `No documentation sources found for ${packageName} - skipping`
          );
          continue;
        }

        // Use the first URL from search results
        const firstUrl = searchResult.data[0].url;
        logger.info(
          `Found documentation source for ${packageName}: ${firstUrl}`
        );

        // Extract rules from the documentation
        logger.info(
          `Extracting best practices and tips from ${packageName} documentation...`
        );
        const extractResult = await firecrawlService.extract(
          firstUrl,
          packageName
        );

        // Log the result at debug level
        logger.debug(
          `Raw extraction result for ${packageName}:`,
          extractResult
        );

        if (!extractResult?.success) {
          logger.warn(`Extraction failed for ${packageName} - skipping`);
          continue;
        }

        const data = extractResult.data;

        if (!data) {
          logger.warn(
            `No data returned from extraction for ${packageName} - skipping`
          );
          continue;
        }

        // Log the structure of the data object to help with debugging
        logger.debug(`Data structure keys:`, Object.keys(data));

        let processedCategories: CategoryInstructions[] = [];

        // Check if data already contains categories in the expected format
        if (data.categories && Array.isArray(data.categories)) {
          logger.info(
            `Found ${data.categories.length} categories of tips for ${packageName}`
          );
          processedCategories = data.categories as CategoryInstructions[];
        }
        // If there's no categories array but there are individual category/instructions
        else if (data.category && (data.instructions || data.tips)) {
          logger.info(
            `Found single category of tips for ${packageName}: ${data.category}`
          );

          const categoryName = data.category as string;
          const instructions = (data.instructions ||
            data.tips ||
            []) as string[];

          if (Array.isArray(instructions) && instructions.length > 0) {
            processedCategories = [
              {
                category: categoryName,
                instructions,
              },
            ];
          }
        }

        // If no categories were found, skip this package
        if (processedCategories.length === 0) {
          logger.warn(
            `No categories or instructions found for ${packageName} - skipping`
          );
          continue;
        }

        // Process the successful extraction result
        logger.info(
          `Successfully extracted ${
            processedCategories.length
          } categories with ${processedCategories.reduce(
            (total, cat) => total + cat.instructions.length,
            0
          )} tips for ${packageName}`
        );

        // Generate a standardized description format
        const description = `${packageName} configuration and usage guidelines`;

        // Store in database
        logger.info(`Storing rules for ${packageName} in database...`);

        // Create the package rule with categories
        const packageRule = await prisma.packageRule.create({
          data: {
            packageName,
            description,
            categories: {
              create: processedCategories.map((cat) => ({
                name: cat.category,
                instructions: cat.instructions,
              })),
            },
          },
          include: {
            categories: true,
          },
        });

        logger.info(
          `Successfully stored ${packageName} rules in database with ID: ${packageRule.id}`
        );

        // Add to results
        results.push({
          packageName,
          description: packageRule.description,
          categories: processedCategories,
        });

        successCount++;
      } catch (packageError) {
        logger.error(`Error processing package ${packageName}:`, packageError);
        // Continue with the next package
      }
    }

    logger.info(
      `Processed ${successCount} out of ${packages.length} packages successfully`
    );
    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error("Error generating rules:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
