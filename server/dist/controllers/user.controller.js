"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Controller: Fetches a list of all registered users.
 * Accessible only by administrators.
 * Sensitive fields (e.g. password hashes) are explicitly excluded.
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    }
    catch (error) {
        console.error("Fetch all users error:", error);
        res.status(500).json({
            success: false,
            message: "An internal server error occurred while retrieving users.",
            error: error.message,
        });
    }
};
exports.getAllUsers = getAllUsers;
