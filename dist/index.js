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
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const packageRules_1 = __importDefault(require("./routes/packageRules"));
const logger_1 = __importDefault(require("./utils/logger"));
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(process.cwd(), "logs");
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir);
    logger_1.default.debug(`Created logs directory at ${logsDir}`);
}
// Load environment variables
dotenv_1.default.config();
// Set NODE_ENV default if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
    logger_1.default.debug("NODE_ENV not set, defaulting to development");
}
logger_1.default.info(`Starting application in ${process.env.NODE_ENV} mode`);
// Initialize Prisma client
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
logger_1.default.debug("Prisma client initialized");
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(express_1.default.json());
logger_1.default.debug("Express middleware configured");
// Request logging middleware
app.use((req, res, next) => {
    logger_1.default.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        query: req.query,
        body: req.method !== "GET" ? req.body : undefined,
    });
    // Capture response time
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger_1.default.debug(`${req.method} ${req.path} completed in ${duration}ms with status ${res.statusCode}`);
    });
    next();
});
// Base API endpoint
app.get("/", (req, res) => {
    logger_1.default.debug("Base API endpoint accessed");
    res.json({ message: "Cursor Rules Generator API" });
});
// Routes
app.use("/api/package-rules", packageRules_1.default);
logger_1.default.debug("Routes configured");
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.default.error("Unhandled error", err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});
// Start server
app.listen(PORT, () => {
    logger_1.default.info(`Server is running on port ${PORT}`);
});
// Handle shutdown
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info("Shutting down application");
    yield prisma.$disconnect();
    logger_1.default.info("Disconnected from database");
    process.exit(0);
}));
//# sourceMappingURL=index.js.map