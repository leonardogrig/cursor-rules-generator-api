"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = __importDefault(require("util"));
const winston_1 = __importDefault(require("winston"));
dotenv_1.default.config();
// Determine environment
const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
// Function to safely handle large objects in logs
const safeStringify = (obj, maxLength = 10000) => {
    if (typeof obj !== "object" || obj === null) {
        return String(obj);
    }
    try {
        // Use util.inspect for better formatting with depth limitation
        const str = util_1.default.inspect(obj, {
            depth: 4,
            maxArrayLength: 50,
            breakLength: 120,
        });
        // Truncate if too long
        if (str.length > maxLength) {
            return str.substring(0, maxLength) + "... [truncated]";
        }
        return str;
    }
    catch (error) {
        return "[Object could not be stringified]";
    }
};
// Custom format to properly handle objects
const objectFormatter = winston_1.default.format((info) => {
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
const logger = winston_1.default.createLogger({
    level: isDevelopment ? "debug" : "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), objectFormatter(), winston_1.default.format.json()),
    defaultMeta: { service: "cursor-rules-generator" },
    transports: [
        // Write to console in development mode
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf((_a) => {
                var { timestamp, level, message } = _a, metadata = __rest(_a, ["timestamp", "level", "message"]);
                let metaStr = "";
                // Don't print metadata if empty or only contains service
                if (Object.keys(metadata).length > 1 ||
                    (Object.keys(metadata).length === 1 && !metadata.service)) {
                    // Filter out the service property when printing
                    const { service } = metadata, metadataWithoutService = __rest(metadata, ["service"]);
                    metaStr = Object.keys(metadataWithoutService).length
                        ? `\n${safeStringify(metadataWithoutService)}`
                        : "";
                }
                return `[${timestamp}] ${level}: ${message}${metaStr}`;
            })),
            silent: !isDevelopment, // Only show logs in development
        }),
        // Always write errors to file
        new winston_1.default.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        // Always write combined logs to file
        new winston_1.default.transports.File({
            filename: "logs/combined.log",
        }),
    ],
});
exports.default = logger;
//# sourceMappingURL=logger.js.map