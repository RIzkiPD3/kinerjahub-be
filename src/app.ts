import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.routes";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRouter);

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./utils/swagger";

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Optional: Test database connection
    // await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      message: "Service unavailable",
    });
  }
});

app.get("/", (req, res) => {
  res.send("API running...");
});

export default app;
