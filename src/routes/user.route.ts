import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/profile", verifyToken, (req: any, res) => {
  res.json({
    message: "Access granted",
    user: req.user,
  });
});

export default router;
