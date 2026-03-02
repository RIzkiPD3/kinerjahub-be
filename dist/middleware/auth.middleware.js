"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.verifyToken = exports.requireAdmin = exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// ─────────────────────────────────────────────
// requireAuth  (alias: verifyToken)
// Memverifikasi JWT dan mengisi req.user.
// Gunakan di setiap route yang butuh autentikasi.
// ─────────────────────────────────────────────
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized - No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
    }
};
exports.requireAuth = requireAuth;
// ─────────────────────────────────────────────
// requireRole(...roles)
// Middleware factory — menerima satu atau beberapa role name.
// Case-insensitive. Harus dipasang SETELAH requireAuth.
//
// Contoh:
//   router.post("/", requireAuth, requireRole("Admin"), createUser);
//   router.patch("/", requireAuth, requireRole("Admin", "Koordinator"), updateTask);
// ─────────────────────────────────────────────
const requireRole = (...roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
// ─────────────────────────────────────────────
// requireAdmin
// Shorthand untuk requireRole("Admin").
// Gunakan pada route POST / PUT / DELETE yang
// hanya boleh diakses Admin.
//
// Contoh:
//   router.post("/", requireAuth, requireAdmin, createDivision);
// ─────────────────────────────────────────────
exports.requireAdmin = (0, exports.requireRole)("Admin");
// ─────────────────────────────────────────────
// Backward-compatible aliases
// Routes yang sudah ada menggunakan verifyToken & authorizeRole —
// tidak perlu diubah, keduanya sekarang mengarah ke implementasi baru.
// ─────────────────────────────────────────────
/** @deprecated Gunakan `requireAuth` */
exports.verifyToken = exports.requireAuth;
/** @deprecated Gunakan `requireRole` */
const authorizeRole = (roles) => (0, exports.requireRole)(...roles);
exports.authorizeRole = authorizeRole;
