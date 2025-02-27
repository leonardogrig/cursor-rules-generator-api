import { Router } from "express";
import { generateRules } from "../controllers/packageRulesController";

const router = Router();

/**
 * @route POST /api/package-rules/generate
 * @desc Generate rules for packages
 * @access Public
 */
router.post("/generate", generateRules);

export default router;
