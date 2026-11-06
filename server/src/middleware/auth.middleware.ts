import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserPayload, Role, AuthenticatedRequest } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_task_management_2026_dev_secure";

/**
 * Middleware: Verifies the JSON Web Token (JWT) sent in the Authorization header.
 * Attaches the decoded user payload (id, email, role) to `req.user`.
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
      error: error.message,
    });
  }
};

/**
 * Middleware: Enforces that the authenticated user possesses the 'ADMIN' role.
 * Must be placed after `authenticateToken` in the route definition.
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
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

/**
 * Reusable RBAC helper: Enforces that the user has at least one of the specified roles.
 * Example usage: `requireRoles('ADMIN', 'USER')`
 */
export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

