"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_task_management_2026_dev_secure";
/**
 * Middleware: Verifies the JSON Web Token (JWT) sent in the Authorization header.
 * Attaches the decoded user payload (id, email, role) to `req.user`.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            message: "Access token required. Please provide a Bearer token in Authorization header.",
        });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({
            success: false,
            message: "Invalid or expired token.",
            error: error.message,
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware: Enforces that the authenticated user possesses the 'ADMIN' role.
 * Must be placed after `authenticateToken` in the route definition.
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required before role verification.",
        });
        return;
    }
    if (req.user.role !== "ADMIN") {
        res.status(403).json({
            success: false,
            message: "Access denied. Admin role required to perform this action.",
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Reusable RBAC helper: Enforces that the user has at least one of the specified roles.
 * Example usage: `requireRoles('ADMIN', 'USER')`
 */
const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required before role verification.",
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}].`,
            });
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
