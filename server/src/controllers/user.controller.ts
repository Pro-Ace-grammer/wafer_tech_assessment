import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../types/auth.types";

/**
 * Controller: Fetches a list of all registered users.
 * Accessible only by administrators.
 * Sensitive fields (e.g. password hashes) are explicitly excluded.
 */
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error: any) {
    console.error("Fetch all users error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving users.",
      error: error.message,
    });
  }
};

