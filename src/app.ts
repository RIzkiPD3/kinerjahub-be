import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./utils/swagger";

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("API running...");
});

export default app;
