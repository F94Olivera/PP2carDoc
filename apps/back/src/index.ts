import express from "express";
import pino from "pino";

import { loginController, logoutController, meController } from "./controllers/auth-controller.js";

import { requireAuth } from "./middlewares/auth-middleware.js";

import { closeDatabase, initializeDatabase } from "./database.js";

const app = express();
const port = process.env.PORT_BACK ?? "3001";
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

app.post("/login", express.json({ limit: "8kb" }), loginController);
app.get("/ping", (_req, res) => {
  res.json({ pong: true });
});

const protectedRouter = express.Router();
protectedRouter.use(requireAuth);
protectedRouter.post("/logout", logoutController);
protectedRouter.get("/auth/me", meController);
// protectedRouter.post("/budgets/pdf", createBudgetPdfController);
// protectedRouter.get("/finances", financesController);
// protectedRouter.post("/customers", createCustomerController);
// protectedRouter.get("/customers", customersController);
// protectedRouter.get("/customers/:customerId", customerByIdController);
// protectedRouter.patch("/customers/:customerId/archive", archiveCustomerController);
// protectedRouter.delete("/customers/:customerId", deleteCustomerController);
// protectedRouter.post("/vehicles", createVehicleController);
// protectedRouter.get("/vehicles", vehiclesController);
// protectedRouter.get("/vehicles/license-plate/:licensePlate", vehicleByLicensePlateController);
// protectedRouter.get("/vehicles/:vehicleId", vehicleByIdController);
// protectedRouter.put("/vehicles/:vehicleId", replaceVehicleController);
// protectedRouter.patch("/vehicles/:vehicleId/archive", archiveVehicleController);
// protectedRouter.delete("/vehicles/:vehicleId", deleteVehicleController);
// protectedRouter.post("/work-orders", createWorkOrderController);
// protectedRouter.get("/work-orders/:workOrderId", workOrderByIdController);
// protectedRouter.delete("/work-orders/:workOrderId", deleteWorkOrderController);
// protectedRouter.get("/vehicles/:vehicleId/work-orders", workOrdersByVehicleController);
// protectedRouter.put("/vehicles/:vehicleId/work-orders/:workOrderId", replaceWorkOrderController);

app.use(protectedRouter);

const startServer = async () => {
  await initializeDatabase();

  const server = app.listen(port, () => {
    logger.info({ port }, "Backend server listening");
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down backend server");

    server.close((error) => {
      void (async () => {
        if (error) {
          logger.error({ error }, "Failed to close backend server");
        }

        await closeDatabase();
        process.exit(error ? 1 : 0);
      })();
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

void startServer().catch((error) => {
  logger.fatal(
    { error: error instanceof Error ? { message: error.message, stack: error.stack } : error },
    "Failed to start backend server",
  );
  process.exit(1);
});
