import express, { Application } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./utils/swagger";
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.route";
import departmentRouter from "./routes/department.route";
import divisionRouter from "./routes/division.route";
import roleRouter from "./routes/role.route";
import taskRouter from "./routes/task.route";

const app: Application = express();

// 1. CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://kinerjahub-fe.vercel.app",
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman, mobile apps, or curl)
      if (!origin) return callback(null, true);

      // Normalize origin: remove trailing slash for comparison
      const normalizedOrigin = origin.replace(/\/$/, "");

      if (
        allowedOrigins.some(
          (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
        )
      ) {
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
  })
);

// 2. Body Parser Middleware - CRITICAL: Must be BEFORE routes
// Standard body-parsers for JSON and form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. API Routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/divisions", divisionRouter);
app.use("/api/roles", roleRouter);
app.use("/api/tasks", taskRouter);

// 4. Utility & Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

export default app;
