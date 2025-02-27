"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Load environment variables
dotenv_1.default.config();
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
    console.log(`Using command line specified packages: ${packagesToTest.join(", ")}`);
}
/**
 * Test the package rules generator API
 */
function testPackageRulesGenerator() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log(`Testing package rules generation for: ${packagesToTest.join(", ")}`);
        console.log(`API URL: ${API_URL}${ENDPOINT}`);
        try {
            console.log("Sending request...");
            const startTime = Date.now();
            const response = yield axios_1.default.post(`${API_URL}${ENDPOINT}`, {
                packages: packagesToTest,
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const duration = Date.now() - startTime;
            console.log(`Request completed in ${duration}ms`);
            // Output results
            if (response.data.success) {
                console.log(`\n✅ Success! Found rules for ${response.data.data.length} packages\n`);
                // Display results
                response.data.data.forEach((packageRule, index) => {
                    console.log(`\n--- Package ${index + 1}: ${packageRule.packageName} ---`);
                    console.log(`Category: ${packageRule.category}`);
                    console.log("Instructions:");
                    packageRule.instructions.forEach((instruction, i) => {
                        console.log(`  ${i + 1}. ${instruction}`);
                    });
                });
                // Save results to file
                const timestamp = new Date().toISOString().replace(/:/g, "-");
                const outputFile = path.join(OUTPUT_DIR, `rules-${timestamp}.json`);
                fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2));
                console.log(`\nResults saved to ${outputFile}`);
            }
            else {
                console.error("❌ Request failed:", response.data.message);
            }
        }
        catch (error) {
            console.error("❌ Error testing package rules generator:");
            if (axios_1.default.isAxiosError(error)) {
                console.error(`Status: ${(_a = error.response) === null || _a === void 0 ? void 0 : _a.status}`);
                console.error("Response:", (_b = error.response) === null || _b === void 0 ? void 0 : _b.data);
            }
            else {
                console.error(error);
            }
        }
    });
}
// Run the test
testPackageRulesGenerator();
// Log usage information
console.log(`
Usage:
  npx ts-node src/tests/test-client.ts [package1] [package2] [...]
  
  If no packages are specified, the default list will be used.
`);
//# sourceMappingURL=test-client.js.map