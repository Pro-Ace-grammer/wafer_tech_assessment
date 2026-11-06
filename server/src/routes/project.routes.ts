import { Router } from "express";
import { createProject, getProjects, addProjectMember, getProjectById, getProjectMembers } from "../controllers/project.controller";
import { authenticateToken, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Any request to POST /api/projects will trigger the createProject function.
// We pass it through authenticateToken first so req.user gets populated.
router.post("/", authenticateToken, requireAdmin, createProject);

// GET /api/projects - Get all projects for the logged-in user
router.get("/", authenticateToken, getProjects);

// GET /api/projects/:projectId - Get a single project with its tasks (Users can only view their own)
router.get("/:projectId", authenticateToken, getProjectById);

// POST /api/projects/:projectId/members - Add user to project (Admin Only)
router.post("/:projectId/members", authenticateToken, requireAdmin, addProjectMember);

router.get("/:projectId/members", authenticateToken, getProjectMembers);

export default router;