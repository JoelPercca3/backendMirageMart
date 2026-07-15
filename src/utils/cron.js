import cron from "node-cron";
import { autoConfirmDeliveries } from "../services/order.service.js";

export const startCronJobs = () => {
  // Todos los días a las 3:00 AM (hora del servidor)
  cron.schedule("0 3 * * *", async () => {
    console.log("🕒 Ejecutando auto-confirmación de entregas...");
    try {
      const result = await autoConfirmDeliveries(5);
      console.log(
        `✅ Auto-confirmación completada: ${result.procesados} pedido(s) procesado(s)`,
      );
    } catch (err) {
      console.error("❌ Error en cron de auto-confirmación:", err);
    }
  });

  console.log("⏰ Cron jobs iniciados");
};
