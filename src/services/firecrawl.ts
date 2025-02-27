import axios from "axios";
import dotenv from "dotenv";
import { ExtractResponse, SearchResponse } from "../types";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

// Firecrawl API service
class FirecrawlService {
  private baseUrl = "https://api.firecrawl.dev/v1";
  private apiKey: string;

  constructor() {
    // Check for API key
    if (!process.env.FIRECRAWL_API_KEY) {
      logger.error("FIRECRAWL_API_KEY is missing in environment variables");
      throw new Error("FIRECRAWL_API_KEY is required");
    }

    // Set the API key
    this.apiKey = process.env.FIRECRAWL_API_KEY;

    // Log initialization
    logger.info(
      "FirecrawlService initialized with live API - using real Firecrawl API calls"
    );
  }

  /**
   * Search for package documentation
   */
  async search(packageName: string, limit = 2): Promise<SearchResponse> {
    try {
      logger.debug(
        `Searching for "${packageName}" documentation with limit ${limit}`
      );
      const startTime = Date.now();

      // Use the real API
      const response = await axios.post(
        `${this.baseUrl}/search`,
        {
          query: `${packageName} documentation`,
          limit,
          scrapeOptions: {
            formats: ["markdown"],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const duration = Date.now() - startTime;
      logger.debug(`Search for "${packageName}" completed in ${duration}ms`);

      if (response.data?.success) {
        logger.info(
          `Found ${
            response.data.data?.length || 0
          } results for "${packageName}"`
        );
      } else {
        logger.warn(`Search for "${packageName}" was not successful`);
      }

      return response.data;
    } catch (error: any) {
      logger.error(`Error searching for ${packageName}:`, error);
      throw new Error(
        `API error searching for ${packageName}: ${
          error.message || "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract rules from documentation URL
   */
  async extract(url: string): Promise<ExtractResponse> {
    try {
      // Ensure URL ends with /* for comprehensive crawling
      let crawlUrl = url;
      if (!crawlUrl.endsWith("/*")) {
        // Remove trailing slash if present to avoid //
        crawlUrl = crawlUrl.endsWith("/") ? crawlUrl.slice(0, -1) : crawlUrl;
        // Add /* for crawler to discover all URLs in the domain
        crawlUrl += "/*";
      }

      logger.info(`Starting extraction process from documentation at: ${url}`);
      logger.debug(`Using crawl URL: "${crawlUrl}"`);
      const startTime = Date.now();

      // STEP 1: Initiate the extraction job
      logger.info(`Initiating AI extraction job for documentation content...`);
      const initiateResponse = await axios.post(
        `${this.baseUrl}/extract`,
        {
          urls: [crawlUrl],
          prompt: `I need general tips and best practices for using this package. These tips will be used as context for a code editor to generate code, this is not for a human user, so be objective and concise. Do not be verbose since it should only cover overall tips to use the specific package. Group your tips into relevant categories (like "Architecture and Best Practices", "usage guidelines", "Code style and structure", etc.). 

For each category, include at least 2-5 practical tips focused on common usage patterns. Format your response as follows:

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
                      description:
                        "The category or section name for a group of instructions",
                    },
                    instructions: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      description:
                        "A list of usage tips and best practices for this category",
                    },
                  },
                  required: ["category", "instructions"],
                },
                description:
                  "Categories of instructions with their respective tips",
              },
            },
            required: ["categories"],
          },
          enableWebSearch: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Check if the job was successfully initiated
      if (!initiateResponse.data?.success) {
        logger.error(
          `Failed to initiate extraction job for "${crawlUrl}": ${JSON.stringify(
            initiateResponse.data
          )}`
        );
        throw new Error(
          `Failed to initiate extraction job: ${
            initiateResponse.data?.error || "Unknown error"
          }`
        );
      }

      // Extract the job ID
      const jobId = initiateResponse.data.id;
      if (!jobId) {
        logger.error(
          `No job ID returned from extraction initiation for "${crawlUrl}"`
        );
        throw new Error("No job ID returned from extraction initiation");
      }

      logger.info(`Extraction job successfully initiated with ID: ${jobId}`);

      // STEP 2: Poll the status until the job is complete
      const maxAttempts = 30; // Maximum number of polling attempts
      const pollInterval = 5000; // Poll every 5 seconds
      let attempts = 0;
      let complete = false;
      let finalResponse = null;

      logger.info(
        `Waiting for AI to process documentation - this may take a minute...`
      );

      while (!complete && attempts < maxAttempts) {
        attempts++;

        // Wait for the poll interval
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        logger.debug(
          `Checking extraction job status (attempt ${attempts}/${maxAttempts})...`
        );

        // Check the status
        const statusResponse = await axios.get(
          `${this.baseUrl}/extract/${jobId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!statusResponse.data?.success) {
          logger.warn(
            `Error checking extraction job status: ${JSON.stringify(
              statusResponse.data
            )}`
          );
          continue;
        }

        const status = statusResponse.data.status;
        logger.debug(`Extraction job status: ${status}`);

        if (status === "completed") {
          logger.info(`Documentation extraction completed successfully`);
          finalResponse = statusResponse.data;
          complete = true;
        } else if (status === "failed" || status === "cancelled") {
          logger.error(
            `Extraction job failed or was cancelled: ${jobId}, status: ${status}`
          );

          // Check specifically for OpenAI quota issues
          const errorData = statusResponse.data.error;
          if (
            errorData &&
            (errorData.lastError?.data?.error?.code === "insufficient_quota" ||
              errorData.errors?.some(
                (err: any) => err.data?.error?.code === "insufficient_quota"
              ))
          ) {
            logger.error(`OpenAI quota exceeded during extraction`);
            throw new Error("OpenAI quota exceeded - please try again later");
          }

          throw new Error(
            `Extraction job ${status}: ${
              statusResponse.data.error || "No error details"
            }`
          );
        } else {
          logger.debug(
            `Extraction still in progress (${attempts}/${maxAttempts}): ${status}`
          );
        }
      }

      if (!complete) {
        logger.error(`Extraction job timed out after ${attempts} attempts`);
        throw new Error(`Extraction job timed out after ${attempts} attempts`);
      }

      const duration = Date.now() - startTime;
      logger.info(`Extraction completed in ${(duration / 1000).toFixed(1)}s`);

      if (finalResponse?.success) {
        const instructionsCount =
          finalResponse.data?.categories?.reduce(
            (total: number, cat: any) =>
              total + (cat.instructions?.length || 0),
            0
          ) || 0;

        logger.info(
          `Successfully extracted ${instructionsCount} tips across ${
            finalResponse.data?.categories?.length || 0
          } categories`
        );
      } else {
        logger.warn(
          `Extraction was not successful: ${
            finalResponse?.error || "Unknown error"
          }`
        );
      }

      return finalResponse;
    } catch (error: any) {
      logger.error(`Error extracting from ${url}:`, error);

      // Extract package name from URL for more helpful error messages
      const urlParts = url.split("/");
      const packageName = urlParts[urlParts.length - 2] || "unknown";

      // Check if it's an OpenAI quota error
      const isQuotaError =
        error.message?.includes("insufficient_quota") ||
        error.message?.includes("exceeded your current quota");

      if (isQuotaError) {
        logger.error(
          `OpenAI quota exceeded during extraction from ${url}. Please try again later.`
        );
        throw new Error(`OpenAI quota exceeded: ${error.message}`);
      }

      // In case of other API failures, return error response
      throw new Error(
        `API error during extraction: ${error.message || "Unknown error"}`
      );
    }
  }
}

export default new FirecrawlService();
