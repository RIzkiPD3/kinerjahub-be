import "dotenv/config";
import app from "./app";

// Validate required environment variables before starting
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(
    `❌ Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
