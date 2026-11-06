"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/users
 * @desc    Fetch a list of all users
 * @access  Private (Admin only)
 */
router.get("/", auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, user_controller_1.getAllUsers);
exports.default = router;
