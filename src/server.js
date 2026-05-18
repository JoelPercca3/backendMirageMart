import app from "./app.js";
import { testConnection } from "./config/database.js";
import { PORT } from "./config/env.js";

const start = async () => {
  // 1. Verificar conexión a MySQL
  await testConnection();

  // 2. Levantar servidor HTTP
  const server = app.listen(PORT, () => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🚀  Servidor:   http://localhost:${PORT}`);
    console.log(`🏥  Health:     http://localhost:${PORT}/health`);
    console.log(`📦  API v1:     http://localhost:${PORT}/api/v1`);
    console.log(`📋  Entorno:    ${process.env.NODE_ENV}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  // 3. Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n⚠️  ${signal} recibido — cerrando servidor...`);
    server.close(() => {
      console.log("✅  Servidor cerrado correctamente.\n");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("❌  Unhandled Promise Rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("❌  Uncaught Exception:", err);
    process.exit(1);
  });
};

start();
