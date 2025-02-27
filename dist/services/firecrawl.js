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
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
// Load environment variables
dotenv_1.default.config();
// Firecrawl API service
class FirecrawlService {
    constructor() {
        this.baseUrl = "https://api.firecrawl.dev/v1";
        // Check for API key
        if (!process.env.FIRECRAWL_API_KEY) {
            logger_1.default.error("FIRECRAWL_API_KEY is missing in environment variables");
            throw new Error("FIRECRAWL_API_KEY is required");
        }
        // Set the API key
        this.apiKey = process.env.FIRECRAWL_API_KEY;
        // Log initialization
        logger_1.default.info("FirecrawlService initialized with live API - using real Firecrawl API calls");
    }
    /**
     * Search for package documentation
     */
    search(packageName_1) {
        return __awaiter(this, arguments, void 0, function* (packageName, limit = 2) {
            var _a, _b;
            try {
                logger_1.default.debug(`Searching for "${packageName}" documentation with limit ${limit}`);
                const startTime = Date.now();
                // Use the real API
                const response = yield axios_1.default.post(`${this.baseUrl}/search`, {
                    query: `${packageName} documentation`,
                    limit,
                    scrapeOptions: {
                        formats: ["markdown"],
                    },
                }, {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                });
                const duration = Date.now() - startTime;
                logger_1.default.debug(`Search for "${packageName}" completed in ${duration}ms`);
                if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.success) {
                    logger_1.default.info(`Found ${((_b = response.data.data) === null || _b === void 0 ? void 0 : _b.length) || 0} results for "${packageName}"`);
                }
                else {
                    logger_1.default.warn(`Search for "${packageName}" was not successful`);
                }
                return response.data;
            }
            catch (error) {
                logger_1.default.error(`Error searching for ${packageName}:`, error);
                throw new Error(`API error searching for ${packageName}: ${error.message || "Unknown error"}`);
            }
        });
    }
    /**
     * Extract rules from documentation URL
     */
    extract(url) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            try {
                // Ensure URL ends with /* for comprehensive crawling
                let crawlUrl = url;
                if (!crawlUrl.endsWith("/*")) {
                    // Remove trailing slash if present to avoid //
                    crawlUrl = crawlUrl.endsWith("/") ? crawlUrl.slice(0, -1) : crawlUrl;
                    // Add /* for crawler to discover all URLs in the domain
                    crawlUrl += "/*";
                }
                logger_1.default.info(`Starting extraction process from documentation at: ${url}`);
                logger_1.default.debug(`Using crawl URL: "${crawlUrl}"`);
                const startTime = Date.now();
                // STEP 1: Initiate the extraction job
                logger_1.default.info(`Initiating AI extraction job for documentation content...`);
                const initiateResponse = yield axios_1.default.post(`${this.baseUrl}/extract`, {
                    urls: [crawlUrl],
                    prompt: `I need general tips and best practices for using this package in programming. Please extract clear, specific coding instructions that would help developers use this package effectively. Group your tips into relevant categories (like "Setup", "Usage", "Testing", etc.). 

For each category, include at least 2-5 practical tips focused on common usage patterns. Format your response as follows:

Categories:
1. Setup & Installation
   - Install using npm: npm install package-name
   - Configure with environment variables

2. Basic Usage
   - Import the package with require() or import
   - Initialize with proper configuration

Example with more categories:

Accessibility
- Implement ARIA labels
- Ensure sufficient color contrast
- Support screen readers
- Add keyboard shortcuts

Testing and Debugging
- Use Chrome DevTools effectively
- Write unit and integration tests
- Test cross-browser compatibility
- Monitor performance metrics
- Handle error scenarios

TypeScript Integration
- Use strict typing for better safety
- Define proper interfaces
- Leverage type inference where possible

Follow Official Documentation
- Refer to official documentation
- Stay updated with latest changes
- Follow recommended patterns
`,
                    schema: {
                        type: "object",
                        properties: {
                            categories: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        category: {
                                            type: "string",
                                            description: "The category or section name for a group of instructions",
                                        },
                                        instructions: {
                                            type: "array",
                                            items: {
                                                type: "string",
                                            },
                                            description: "A list of usage tips and best practices for this category",
                                        },
                                    },
                                    required: ["category", "instructions"],
                                },
                                description: "Categories of instructions with their respective tips",
                            },
                        },
                        required: ["categories"],
                    },
                    enableWebSearch: true,
                }, {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                });
                // Check if the job was successfully initiated
                if (!((_a = initiateResponse.data) === null || _a === void 0 ? void 0 : _a.success)) {
                    logger_1.default.error(`Failed to initiate extraction job for "${crawlUrl}": ${JSON.stringify(initiateResponse.data)}`);
                    throw new Error(`Failed to initiate extraction job: ${((_b = initiateResponse.data) === null || _b === void 0 ? void 0 : _b.error) || "Unknown error"}`);
                }
                // Extract the job ID
                const jobId = initiateResponse.data.id;
                if (!jobId) {
                    logger_1.default.error(`No job ID returned from extraction initiation for "${crawlUrl}"`);
                    throw new Error("No job ID returned from extraction initiation");
                }
                logger_1.default.info(`Extraction job successfully initiated with ID: ${jobId}`);
                // STEP 2: Poll the status until the job is complete
                const maxAttempts = 30; // Maximum number of polling attempts
                const pollInterval = 5000; // Poll every 5 seconds
                let attempts = 0;
                let complete = false;
                let finalResponse = null;
                logger_1.default.info(`Waiting for AI to process documentation - this may take a minute...`);
                while (!complete && attempts < maxAttempts) {
                    attempts++;
                    // Wait for the poll interval
                    yield new Promise((resolve) => setTimeout(resolve, pollInterval));
                    logger_1.default.debug(`Checking extraction job status (attempt ${attempts}/${maxAttempts})...`);
                    // Check the status
                    const statusResponse = yield axios_1.default.get(`${this.baseUrl}/extract/${jobId}`, {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                            "Content-Type": "application/json",
                        },
                    });
                    if (!((_c = statusResponse.data) === null || _c === void 0 ? void 0 : _c.success)) {
                        logger_1.default.warn(`Error checking extraction job status: ${JSON.stringify(statusResponse.data)}`);
                        continue;
                    }
                    const status = statusResponse.data.status;
                    logger_1.default.debug(`Extraction job status: ${status}`);
                    if (status === "completed") {
                        logger_1.default.info(`Documentation extraction completed successfully`);
                        finalResponse = statusResponse.data;
                        complete = true;
                    }
                    else if (status === "failed" || status === "cancelled") {
                        logger_1.default.error(`Extraction job failed or was cancelled: ${jobId}, status: ${status}`);
                        // Check specifically for OpenAI quota issues
                        const errorData = statusResponse.data.error;
                        if (errorData &&
                            (((_f = (_e = (_d = errorData.lastError) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) === null || _f === void 0 ? void 0 : _f.code) === "insufficient_quota" ||
                                ((_g = errorData.errors) === null || _g === void 0 ? void 0 : _g.some((err) => { var _a, _b; return ((_b = (_a = err.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.code) === "insufficient_quota"; })))) {
                            logger_1.default.error(`OpenAI quota exceeded during extraction`);
                            throw new Error("OpenAI quota exceeded - please try again later");
                        }
                        throw new Error(`Extraction job ${status}: ${statusResponse.data.error || "No error details"}`);
                    }
                    else {
                        logger_1.default.debug(`Extraction still in progress (${attempts}/${maxAttempts}): ${status}`);
                    }
                }
                if (!complete) {
                    logger_1.default.error(`Extraction job timed out after ${attempts} attempts`);
                    throw new Error(`Extraction job timed out after ${attempts} attempts`);
                }
                const duration = Date.now() - startTime;
                logger_1.default.info(`Extraction completed in ${(duration / 1000).toFixed(1)}s`);
                if (finalResponse === null || finalResponse === void 0 ? void 0 : finalResponse.success) {
                    const instructionsCount = ((_j = (_h = finalResponse.data) === null || _h === void 0 ? void 0 : _h.categories) === null || _j === void 0 ? void 0 : _j.reduce((total, cat) => { var _a; return total + (((_a = cat.instructions) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0)) || 0;
                    logger_1.default.info(`Successfully extracted ${instructionsCount} tips across ${((_l = (_k = finalResponse.data) === null || _k === void 0 ? void 0 : _k.categories) === null || _l === void 0 ? void 0 : _l.length) || 0} categories`);
                }
                else {
                    logger_1.default.warn(`Extraction was not successful: ${(finalResponse === null || finalResponse === void 0 ? void 0 : finalResponse.error) || "Unknown error"}`);
                }
                return finalResponse;
            }
            catch (error) {
                logger_1.default.error(`Error extracting from ${url}:`, error);
                // Extract package name from URL for more helpful error messages
                const urlParts = url.split("/");
                const packageName = urlParts[urlParts.length - 2] || "unknown";
                // Check if it's an OpenAI quota error
                const isQuotaError = ((_m = error.message) === null || _m === void 0 ? void 0 : _m.includes("insufficient_quota")) ||
                    ((_o = error.message) === null || _o === void 0 ? void 0 : _o.includes("exceeded your current quota"));
                if (isQuotaError) {
                    logger_1.default.error(`OpenAI quota exceeded during extraction from ${url}. Please try again later.`);
                    throw new Error(`OpenAI quota exceeded: ${error.message}`);
                }
                // In case of other API failures, return error response
                throw new Error(`API error during extraction: ${error.message || "Unknown error"}`);
            }
        });
    }
}
exports.default = new FirecrawlService();
//# sourceMappingURL=firecrawl.js.map