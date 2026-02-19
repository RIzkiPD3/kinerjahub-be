import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/auth.controller";

import {
  verifyToken,
  authorizeRole,
} from "../middleware/auth.middleware";

const router = Router();

// Admin only
router.get("/", verifyToken, authorizeRole(["Admin"]), getAllUsers);
router.post("/", verifyToken, authorizeRole(["Admin"]), createUser);
router.delete("/:id", verifyToken, authorizeRole(["Admin"]), deleteUser);

// Logged in user
router.get("/:id", verifyToken, getUserById);
router.put("/:id", verifyToken, updateUser);

export default router;
