import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    /** Role name dari JWT, e.g. "Admin", "Koordinator", "Staff" */
    role: string;
    /** Role UUID — stored for forward-compatibility */
    role_id: string;
    organization_id: string;
    department_id: string;
  };
}

// ─────────────────────────────────────────────
// requireAuth  (alias: verifyToken)
// Memverifikasi JWT dan mengisi req.user.
// Gunakan di setiap route yang butuh autentikasi.
// ─────────────────────────────────────────────

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthRequest["user"];

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
  }
};

// ─────────────────────────────────────────────
// requireRole(...roles)
// Middleware factory — menerima satu atau beberapa role name.
// Case-insensitive. Harus dipasang SETELAH requireAuth.
//
// Contoh:
//   router.post("/", requireAuth, requireRole("Admin"), createUser);
//   router.patch("/", requireAuth, requireRole("Admin", "Koordinator"), updateTask);
// ─────────────────────────────────────────────

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = req.user.role?.toLowerCase();
    const allowed = roles.map((r) => r.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        message: "Forbidden - Insufficient permissions",
        required_roles: roles,
        your_role: req.user.role,
      });
    }

    next();
  };
};

// ─────────────────────────────────────────────
// requireAdmin
// Shorthand untuk requireRole("Admin").
// Gunakan pada route POST / PUT / DELETE yang
// hanya boleh diakses Admin.
//
// Contoh:
//   router.post("/", requireAuth, requireAdmin, createDivision);
// ─────────────────────────────────────────────

export const requireAdmin = requireRole("Admin");

// ─────────────────────────────────────────────
// Backward-compatible aliases
// Routes yang sudah ada menggunakan verifyToken & authorizeRole —
// tidak perlu diubah, keduanya sekarang mengarah ke implementasi baru.
// ─────────────────────────────────────────────

/** @deprecated Gunakan `requireAuth` */
export const verifyToken = requireAuth;

/** @deprecated Gunakan `requireRole` */
export const authorizeRole = (roles: string[]) => requireRole(...roles);

