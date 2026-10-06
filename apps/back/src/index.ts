import express from "express";
import pino from "pino";

import { loginController, logoutController, meController } from "./controllers/auth-controller.js";

import {
  customerByIdController,
  listCustomersController,
} from "./controllers/customer-controller.js";

import { requireAuth } from "./middlewares/auth-middleware.js";

import { corsMiddleware } from "./middlewares/cors-middleware.js";
import { errorMiddleware } from "./middlewares/error-middleware.js";

const app = express();
const router = express.Router();
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

app.disable("x-powered-by");
app.use(corsMiddleware);

router.post("/login", express.json({ limit: "8kb" }), loginController);
router.get("/ping", (_req, res) => {
  res.json({ pong: true });
});

const protectedRouter = express.Router();
protectedRouter.use(requireAuth);
protectedRouter.post("/logout", logoutController);
protectedRouter.get("/auth/me", meController);
// protectedRouter.post("/budgets/pdf", createBudgetPdfController);
// protectedRouter.get("/finances", financesController);
// protectedRouter.post("/customers", createCustomerController);
protectedRouter.get("/customers", listCustomersController);
protectedRouter.get("/customers/:customerId", customerByIdController);
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

router.use(protectedRouter);
app.use("/api", router);
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});
app.use(errorMiddleware);

// Supabase owns the worker lifecycle; do not install Node process signal handlers.
app.listen(8000, "0.0.0.0", () => {
  logger.info("carDoc Edge API listening");
});
