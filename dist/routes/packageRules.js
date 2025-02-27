"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const packageRulesController_1 = require("../controllers/packageRulesController");
const router = (0, express_1.Router)();
/**
 * @route POST /api/package-rules/generate
 * @desc Generate rules for packages
 * @access Public
 */
router.post("/generate", packageRulesController_1.generateRules);
exports.default = router;
//# sourceMappingURL=packageRules.js.map