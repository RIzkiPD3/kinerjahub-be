"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./utils/swagger"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const department_route_1 = __importDefault(require("./routes/department.route"));
const division_route_1 = __importDefault(require("./routes/division.route"));
const role_route_1 = __importDefault(require("./routes/role.route"));
const task_route_1 = __importDefault(require("./routes/task.route"));
const project_route_1 = __importDefault(require("./routes/project.route"));
const attendance_route_1 = __importDefault(require("./routes/attendance.route"));
const app = (0, express_1.default)();
// 1. CORS Configuration
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://kinerjahub-fe.vercel.app",
    "https://kinerjahub-29exjilty-rizkipd3s-projects.vercel.app",
    ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : []),
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like Postman, mobile apps, or curl)
        if (!origin)
            return callback(null, true);
        // Normalize origin: remove trailing slash for comparison
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.some((allowed) => allowed.replace(/\/$/, "") === normalizedOrigin)) {
            return callback(null, true);
        }
        console.error(`[CORS Blocked] Origin: ${origin}`);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // 24 hours
}));
// 2. Body Parser Middleware - CRITICAL: Must be BEFORE routes
// Standard body-parsers for JSON and form-data
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 3. API Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", user_route_1.default);
app.use("/api/departments", department_route_1.default);
app.use("/api/divisions", division_route_1.default);
app.use("/api/roles", role_route_1.default);
app.use("/api/tasks", task_route_1.default);
app.use("/api/projects", project_route_1.default);
app.use("/api/attendances", attendance_route_1.default);
// 4. Utility & Documentation
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
    });
});
app.get("/", (req, res) => {
    res.send("API running...");
});
exports.default = app;
