import { Router } from "express";
import { getAllUsers } from "../controllers/user.controller";
import { authenticateToken, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Fetch a list of all users
 * @access  Private (Admin only)
 */
router.get("/", authenticateToken, requireAdmin, getAllUsers);

export default router;

