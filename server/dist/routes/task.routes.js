"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("../controllers/task.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
// 'mergeParams: true' is a crucial Express trick! 
// It allows this router to read the ':projectId' from the parent URL.
const router = (0, express_1.Router)({ mergeParams: true });
// POST /api/projects/:projectId/tasks - Create a new task
router.post("/", auth_middleware_1.authenticateToken, task_controller_1.createTask);
// PATCH /api/projects/:projectId/tasks/:taskId - Update a task
router.patch("/:taskId", auth_middleware_1.authenticateToken, task_controller_1.updateTask);
// PATCH /api/projects/:projectId/tasks/:taskId/reorder - Drag and drop reorder
router.patch("/:taskId/reorder", auth_middleware_1.authenticateToken, task_controller_1.reorderTask);
// DELETE /api/projects/:projectId/tasks/:taskId - Delete a task
router.delete("/:taskId", auth_middleware_1.authenticateToken, task_controller_1.deleteTask);
exports.default = router;
