"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRules = void 0;
const index_1 = require("../index");
const firecrawl_1 = __importDefault(require("../services/firecrawl"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Generate package rules
 */
const generateRules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        logger_1.default.info("Package rules generation request received", {
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        const { packages } = req.body;
        if (!packages || !Array.isArray(packages) || packages.length === 0) {
            logger_1.default.warn("Invalid request: Empty or invalid packages array");
            res.status(400).json({
                success: false,
                message: "Please provide an array of package names",
            });
            return;
        }
        logger_1.default.info(`Processing ${packages.length} packages`, {
            packageList: packages,
        });
        // The result array to return to the client
        const results = [];
        let successCount = 0;
        // Process each package
        for (const packageName of packages) {
            try {
                logger_1.default.debug(`Processing package: ${packageName}`);
                // Check if package rules already exist in the database
                logger_1.default.info(`Checking database for existing rules for ${packageName}...`);
                const existingRules = yield index_1.prisma.packageRule.findFirst({
                    where: { packageName },
                    include: {
                        categories: true,
                    },
                });
                if (existingRules) {
                    // Use existing rules
                    logger_1.default.info(`Found existing rules for ${packageName} in database`);
                    const formattedCategories = existingRules.categories.map((cat) => ({
                        category: cat.name,
                        instructions: cat.instructions,
                    }));
                    results.push({
                        packageName,
                        categories: formattedCategories,
                    });
                    successCount++;
                    continue;
                }
                // Fetch new rules using Firecrawl
                logger_1.default.info(`No existing rules found for ${packageName} - initiating search...`);
                // First search for documentation
                logger_1.default.info(`Searching for ${packageName} documentation resources...`);
                const searchResult = yield firecrawl_1.default.search(packageName);
                if (!(searchResult === null || searchResult === void 0 ? void 0 : searchResult.success) || !((_a = searchResult === null || searchResult === void 0 ? void 0 : searchResult.data) === null || _a === void 0 ? void 0 : _a.length)) {
                    logger_1.default.warn(`No documentation sources found for ${packageName} - skipping`);
                    continue;
                }
                // Use the first URL from search results
                const firstUrl = searchResult.data[0].url;
                logger_1.default.info(`Found documentation source for ${packageName}: ${firstUrl}`);
                // Extract rules from the documentation
                logger_1.default.info(`Extracting best practices and tips from ${packageName} documentation...`);
                const extractResult = yield firecrawl_1.default.extract(firstUrl);
                // Log the result at debug level
                logger_1.default.debug(`Raw extraction result for ${packageName}:`, extractResult);
                if (!(extractResult === null || extractResult === void 0 ? void 0 : extractResult.success)) {
                    logger_1.default.warn(`Extraction failed for ${packageName} - skipping`);
                    continue;
                }
                const data = extractResult.data;
                if (!data) {
                    logger_1.default.warn(`No data returned from extraction for ${packageName} - skipping`);
                    continue;
                }
                // Log the structure of the data object to help with debugging
                logger_1.default.debug(`Data structure keys:`, Object.keys(data));
                let processedCategories = [];
                // Check if data already contains categories in the expected format
                if (data.categories && Array.isArray(data.categories)) {
                    logger_1.default.info(`Found ${data.categories.length} categories of tips for ${packageName}`);
                    processedCategories = data.categories;
                }
                // If there's no categories array but there are individual category/instructions
                else if (data.category && (data.instructions || data.tips)) {
                    logger_1.default.info(`Found single category of tips for ${packageName}: ${data.category}`);
                    const categoryName = data.category;
                    const instructions = (data.instructions ||
                        data.tips ||
                        []);
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
                    logger_1.default.warn(`No categories or instructions found for ${packageName} - skipping`);
                    continue;
                }
                // Process the successful extraction result
                logger_1.default.info(`Successfully extracted ${processedCategories.length} categories with ${processedCategories.reduce((total, cat) => total + cat.instructions.length, 0)} tips for ${packageName}`);
                // Store in database
                logger_1.default.info(`Storing rules for ${packageName} in database...`);
                // Create the package rule with categories
                const packageRule = yield index_1.prisma.packageRule.create({
                    data: {
                        packageName,
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
                logger_1.default.info(`Successfully stored ${packageName} rules in database with ID: ${packageRule.id}`);
                // Add to results
                results.push({
                    packageName,
                    categories: processedCategories,
                });
                successCount++;
            }
            catch (packageError) {
                logger_1.default.error(`Error processing package ${packageName}:`, packageError);
                // Continue with the next package
            }
        }
        logger_1.default.info(`Processed ${successCount} out of ${packages.length} packages successfully`);
        res.status(200).json({
            success: true,
            data: results,
        });
    }
    catch (error) {
        logger_1.default.error("Error generating rules:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});
exports.generateRules = generateRules;
//# sourceMappingURL=packageRulesController.js.map