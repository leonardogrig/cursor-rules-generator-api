import dotenv from "dotenv";
import util from "util";
import winston from "winston";

dotenv.config();

// Determine environment
const isDevelopment =
  process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

// Function to safely handle large objects in logs
const safeStringify = (obj: any, maxLength = 10000): string => {
  if (typeof obj !== "object" || obj === null) {
    return String(obj);
  }

  try {
    // Use util.inspect for better formatting with depth limitation
    const str = util.inspect(obj, {
      depth: 4,
      maxArrayLength: 50,
      breakLength: 120,
    });

    // Truncate if too long
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + "... [truncated]";
    }
    return str;
  } catch (error) {
    return "[Object could not be stringified]";
  }
};

// Custom format to properly handle objects
const objectFormatter = winston.format((info) => {
  // Handle nested objects properly
  for (const key in info) {
    if (typeof info[key] === "object" && info[key] !== null) {
      // Preserve the original object for JSON formatting
      info[key] = info[key];
    }
  }
  return info;
});

// Create logger with different configurations based on environment
const logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    objectFormatter(),
    winston.format.json()
  ),
  defaultMeta: { service: "cursor-rules-generator" },
  transports: [
    // Write to console in development mode
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          let metaStr = "";

          // Don't print metadata if empty or only contains service
          if (
            Object.keys(metadata).length > 1 ||
            (Object.keys(metadata).length === 1 && !metadata.service)
          ) {
            // Filter out the service property when printing
            const { service, ...metadataWithoutService } = metadata;
            metaStr = Object.keys(metadataWithoutService).length
              ? `\n${safeStringify(metadataWithoutService)}`
              : "";
          }

          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      ),
      silent: !isDevelopment, // Only show logs in development
    }),
    // Always write errors to file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    // Always write combined logs to file
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

export default logger;
