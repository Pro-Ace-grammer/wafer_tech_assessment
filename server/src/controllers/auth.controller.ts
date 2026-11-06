import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { Role, UserPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_task_management_2026_dev_secure";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Utility: Generates a signed JSON Web Token (JWT) containing user identity and role.
 */
export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Controller: Handles user registration.
 * Hashes passwords with bcrypt, prevents duplicate emails, and returns a signed JWT.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    // 1. Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
      return;
    }

    // 3. Validate password strength
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
      return;
    }

    // 4. Validate and sanitize role (defaults to USER)
    let assignedRole: Role = "USER";
    if (role) {
      const upperRole = String(role).toUpperCase();
      if (upperRole === "ADMIN" || upperRole === "USER") {
        assignedRole = upperRole as Role;
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid role specified. Role must be either ADMIN or USER.",
        });
        return;
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 5. Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "A user with this email address already exists.",
      });
      return;
    }

    // 6. Hash password securely using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 7. Persist user in the database
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole,
      },
    });

    // 8. Generate JWT token
    const tokenPayload: UserPayload = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as Role,
    };

    const token = generateToken(tokenPayload);

    // 9. Respond with token and user details (omitting sensitive password)
    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred during registration.",
      error: error.message,
    });
  }
};

/**
 * Controller: Handles user login.
 * Validates credentials using constant-time bcrypt comparison and issues a signed JWT.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Validate required inputs
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // 2. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 3. Generic error to prevent account enumeration attacks
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // 4. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // 5. Generate JWT token
    const tokenPayload: UserPayload = {
      id: user.id,
      email: user.email,
      role: user.role as Role,
    };

    const token = generateToken(tokenPayload);

    // 6. Return success response (omitting password hash)
    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred during login.",
      error: error.message,
    });
  }
};

