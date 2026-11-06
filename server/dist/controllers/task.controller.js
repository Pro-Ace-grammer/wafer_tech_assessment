"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.reorderTask = exports.updateTask = exports.createTask = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// Controller to create the Task.
// Must be created only by the user belonging to this task.
const createTask = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.user.id;
        const { name, status, assigneeId, priority, dueDate } = req.body;
        if (!name) {
            res.status(400).json({ success: false, message: "Task name is required" });
            return;
        }
        // Security Check (RBAC)
        // We are checking if the user is in the junction table for this project
        const isMember = await prisma_1.default.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: userId,
                    projectId: projectId,
                }
            }
        });
        // If they aren't a member, block them immediately..
        if (!isMember) {
            res.status(403).json({
                success: false,
                message: "Access denied. You are not a member of this project."
            });
            return;
        }
        // LexoRank Order Generation
        // Fetch the task with the highest 'order' string in this project
        const lastTask = await prisma_1.default.task.findFirst({
            where: { projectId: projectId },
            orderBy: { order: "desc" },
        });
        // Lexicographical Appending
        // If no tasks exist, start with "a". 
        // If a task exists (e.g., "a"), append "a" to make "aa". 
        // In alphabetical sorting: "a" comes before "aa", which comes before "aaa".
        const order = lastTask ? lastTask.order + "a" : "a";
        // Create the Task
        const task = await prisma_1.default.task.create({
            data: {
                name: name,
                status: status || "PENDING", // Defaults to PENDING if not provided
                order: order,
                projectId: projectId,
                assigneeId: assigneeId || null,
                priority: priority || "MEDIUM",
                dueDate: dueDate ? new Date(dueDate) : null,
            }
        });
        const io = req.app.get("io");
        io.to(projectId).emit("taskCreated", task);
        res.status(201).json({ success: true, task });
    }
    catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.createTask = createTask;
// Update an existing task
const updateTask = async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const userId = req.user.id;
        const { name, status, assigneeId, priority, dueDate } = req.body;
        if (assigneeId !== undefined && req.user.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only Admins can assign tasks." });
            return;
        }
        // Strict Security Check: Verify user belongs to the project
        const isMember = await prisma_1.default.projectMember.findUnique({
            where: {
                userId_projectId: { userId, projectId },
            },
        });
        if (!isMember) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        // Verify the task actually exists inside THIS project
        const existingTask = await prisma_1.default.task.findFirst({
            where: { id: taskId, projectId: projectId },
        });
        if (!existingTask) {
            res.status(404).json({ success: false, message: "Task not found in this project." });
            return;
        }
        // Update the task 
        const updatedTask = await prisma_1.default.task.update({
            where: { id: taskId },
            data: {
                // Only update fields if they were provided in the request body
                name: name !== undefined ? name : existingTask.name,
                status: status !== undefined ? status : existingTask.status,
                assigneeId: assigneeId !== undefined ? assigneeId : existingTask.assigneeId,
                priority: priority !== undefined ? priority : existingTask.priority,
                dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existingTask.dueDate,
            },
        });
        const io = req.app.get("io");
        io.to(projectId).emit("taskUpdated", updatedTask);
        res.status(200).json({ success: true, task: updatedTask });
    }
    catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.updateTask = updateTask;
// Naive LexoRank mid-string generator
const generateMidpoint = (prev, next) => {
    if (!prev && !next)
        return "a"; // First task ever
    if (!prev)
        return "0" + next; // Dropped at the very top
    if (!next)
        return prev + "a"; // Dropped at the very bottom
    // Dropped between two tasks (e.g., between "a" and "b" -> becomes "am")
    return prev + "m";
};
// Reorder a task (Drag and Drop)
const reorderTask = async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const userId = req.user.id;
        // The frontend will send the order string of the task ABOVE it and BELOW it
        const { status, prevOrder, nextOrder } = req.body;
        const isMember = await prisma_1.default.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } },
        });
        if (!isMember) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        // Generate the new O(1) insertion string
        const newOrder = generateMidpoint(prevOrder, nextOrder);
        const updatedTask = await prisma_1.default.task.update({
            where: { id: taskId },
            data: {
                status: status, // Update status in case it was dragged to a new column
                order: newOrder,
            },
        });
        const io = req.app.get("io");
        io.to(projectId).emit("taskUpdated", updatedTask);
        res.status(200).json({ success: true, task: updatedTask });
    }
    catch (error) {
        console.error("Error reordering task:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.reorderTask = reorderTask;
// Delete task
const deleteTask = async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const userId = req.user.id;
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ success: false, message: "Only Admins can delete tasks." });
            return;
        }
        const isMember = await prisma_1.default.projectMember.findUnique({
            where: {
                userId_projectId: { userId, projectId },
            },
        });
        if (!isMember) {
            res.status(403).json({ success: false, message: "Access denied." });
            return;
        }
        // Checking if the task exists in this Project or not
        const existingTask = await prisma_1.default.task.findFirst({
            where: { id: taskId, projectId: projectId },
        });
        if (!existingTask) {
            res.status(404).json({ success: false, message: "Task not found in this project." });
            return;
        }
        // Delete the task 
        await prisma_1.default.task.delete({
            where: { id: taskId },
        });
        const io = req.app.get("io");
        io.to(projectId).emit("taskDeleted", taskId);
        res.status(200).json({ success: true, message: "Task deleted successfully." });
    }
    catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.deleteTask = deleteTask;
