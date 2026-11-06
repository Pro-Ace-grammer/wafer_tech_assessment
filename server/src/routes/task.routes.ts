import { Router } from "express";
import { createTask, updateTask, reorderTask, deleteTask } from "../controllers/task.controller";
import { authenticateToken } from "../middleware/auth.middleware";

// 'mergeParams: true' is a crucial Express trick! 
// It allows this router to read the ':projectId' from the parent URL.
const router = Router({ mergeParams: true });

// POST /api/projects/:projectId/tasks - Create a new task
router.post("/", authenticateToken, createTask);

// PATCH /api/projects/:projectId/tasks/:taskId - Update a task
router.patch("/:taskId", authenticateToken, updateTask);

// PATCH /api/projects/:projectId/tasks/:taskId/reorder - Drag and drop reorder
router.patch("/:taskId/reorder", authenticateToken, reorderTask);

// DELETE /api/projects/:projectId/tasks/:taskId - Delete a task
router.delete("/:taskId", authenticateToken, deleteTask);

export default router;