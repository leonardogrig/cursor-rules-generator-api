import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import packageRulesRoutes from "./routes/packageRules";
import logger from "./utils/logger";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  logger.debug(`Created logs directory at ${logsDir}`);
}

// Load environment variables
dotenv.config();

// Set NODE_ENV default if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
  logger.debug("NODE_ENV not set, defaulting to development");
}

logger.info(`Starting application in ${process.env.NODE_ENV} mode`);

// Initialize Prisma client
const prisma = new PrismaClient();
logger.debug("Prisma client initialized");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
logger.debug("Express middleware configured");

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
  });

  // Capture response time
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.debug(
      `${req.method} ${req.path} completed in ${duration}ms with status ${res.statusCode}`
    );
  });

  next();
});

// Base API endpoint
app.get("/", (req, res) => {
  logger.debug("Base API endpoint accessed");
  res.json({ message: "Cursor Rules Generator API" });
});

// Routes
app.use("/api/package-rules", packageRulesRoutes);
logger.debug("Routes configured");

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down application");
  await prisma.$disconnect();
  logger.info("Disconnected from database");
  process.exit(0);
});

export { prisma };
