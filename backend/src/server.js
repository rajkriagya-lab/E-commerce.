
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import app from "./app.js";
import { prisma } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();

    console.log("✅ Neon PostgreSQL connected successfully");

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 NeoStore server running on port ${PORT}`);
      console.log(`🌐 API: http://localhost:${PORT}/api/v1`);
      console.log(`❤️ Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down...`);

      server.close(async () => {
        await prisma.$disconnect();
        console.log("Database disconnected");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("Server startup failed:", error.message);

    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
