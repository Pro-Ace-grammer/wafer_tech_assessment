"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Any request to POST /api/projects will trigger the createProject function.
// We pass it through authenticateToken first so req.user gets populated.
router.post("/", auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, project_controller_1.createProject);
// GET /api/projects - Get all projects for the logged-in user
router.get("/", auth_middleware_1.authenticateToken, project_controller_1.getProjects);
// GET /api/projects/:projectId - Get a single project with its tasks (Users can only view their own)
router.get("/:projectId", auth_middleware_1.authenticateToken, project_controller_1.getProjectById);
// POST /api/projects/:projectId/members - Add user to project (Admin Only)
router.post("/:projectId/members", auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, project_controller_1.addProjectMember);
router.get("/:projectId/members", auth_middleware_1.authenticateToken, project_controller_1.getProjectMembers);
exports.default = router;
