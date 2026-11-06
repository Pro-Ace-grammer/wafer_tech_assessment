"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectMembers = exports.addProjectMember = exports.getProjectById = exports.getProjects = exports.createProject = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// I am using AuthenticatedRequest so TypeScript knows req.user exists
const createProject = async (req, res) => {
    try {
        // Extractin the name of the project.
        const { name } = req.body;
        // Simple validation: if the name is empty
        if (!name) {
            res.status(400).json({ success: false, message: "Project name is required" });
            return;
        }
        // Creating the Project 
        const project = await prisma_1.default.project.create({
            data: {
                name: name,
            },
        });
        // creating project member
        await prisma_1.default.projectMember.create({
            data: {
                userId: req.user.id, // The '!' tells TypeScript we are 100% sure req.user exists here
                projectId: project.id,
            },
        });
        res.status(201).json({
            success: true,
            message: "Project created successfully",
            project: project,
        });
    }
    catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.createProject = createProject;
// Fetch all projects that the logged-in user belongs to
const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        // Here basically filtering the projects that the current logged in user belongs to.
        const projects = await prisma_1.default.project.findMany({
            where: {
                members: {
                    some: {
                        userId: userId,
                    },
                },
            },
            orderBy: {
                createdAt: "desc", // Newest projects first
            },
        });
        res.status(200).json({
            success: true,
            count: projects.length,
            projects: projects,
        });
    }
    catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getProjects = getProjects;
// Fetch a single project with all its tasks and members
const getProjectById = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.user.id;
        // Find the project, but ONLY if the logged-in user is a member of it
        const project = await prisma_1.default.project.findFirst({
            where: {
                id: projectId,
                members: {
                    some: { userId: userId }
                }
            },
            // Fetch the related data [sort of like Joins]
            include: {
                tasks: {
                    orderBy: { order: "asc" } // This will sort by our LexoRank 
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, email: true, role: true } // Explicitly exclude the password hash
                        }
                    }
                }
            }
        });
        if (!project) {
            res.status(404).json({
                success: false,
                message: "Project not found or you do not have permission to view it."
            });
            return;
        }
        res.status(200).json({ success: true, project });
    }
    catch (error) {
        console.error("Error fetching project by ID:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getProjectById = getProjectById;
// Add a user to a project (Admin Only)
const addProjectMember = async (req, res) => {
    try {
        // Get the project ID from the URL (/api/projects/:projectId/members)
        const projectId = req.params.projectId;
        // Get the email of the user we want to add from the request body
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, message: "User email is required" });
            return;
        }
        // Look up the user by their email
        const userToAdd = await prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        if (!userToAdd) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        // Creating the link in the junction table
        await prisma_1.default.projectMember.create({
            data: {
                projectId: projectId,
                userId: userToAdd.id,
            },
        });
        res.status(200).json({
            success: true,
            message: `${userToAdd.email} has been added to the project.`
        });
    }
    catch (error) {
        // P2002 is Prisma's error code for a Unique Constraint Violation.
        // Because we used @@id([userId, projectId]) in the schema, the database 
        // will throw this error if we try to add the exact same user twice.
        if (error.code === "P2002") {
            res.status(400).json({ success: false, message: "User is already a member of this project." });
            return;
        }
        console.error("Error adding member:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.addProjectMember = addProjectMember;
const getProjectMembers = async (req, res) => {
    try {
        // Explicitly cast req.params so TypeScript knows projectId is a string
        const { projectId } = req.params;
        const members = await prisma_1.default.projectMember.findMany({
            where: { projectId },
            include: {
                user: {
                    select: { id: true, email: true }
                }
            }
        });
        res.status(200).json({ success: true, members });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch project members" });
    }
};
exports.getProjectMembers = getProjectMembers;
