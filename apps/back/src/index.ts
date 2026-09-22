import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import swaggerUi from "swagger-ui-express";

import { requireAuth } from "./common/middleware.js";
import { loginController, logoutController, meController } from "./controllers/auth-controller.js";
import { createBudgetPdfController } from "./controllers/budget-controller.js";
import {
  archiveCustomerController,
  createCustomerController,
  customerByIdController,
  customersController,
  deleteCustomerController,
} from "./controllers/customer-controller.js";
import { financesController } from "./controllers/finance-controller.js";
import {
  archiveVehicleController,
  createVehicleController,
  deleteVehicleController,
  replaceVehicleController,
  vehicleByIdController,
  vehicleByLicensePlateController,
  vehiclesController,
} from "./controllers/vehicle-controller.js";
import {
  createWorkOrderController,
  deleteWorkOrderController,
  workOrderByIdController,
  replaceWorkOrderController,
  workOrdersByVehicleController,
} from "./controllers/work-order-controller.js";
import { initializeDatabase } from "./database.js";
import { starterCheck } from "./starter-check.js";

starterCheck(process.env);
initializeDatabase();

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const port = process.env.PORT_BACK ?? "3001";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const openApiPath = path.join(repositoryRoot, "docs", "openapi.yaml");
const exposeApiDocs = process.env.NODE_ENV !== "production";
const loginRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 10,
  message: {
    code: "RATE_LIMITED",
    message: "Too many login attempts. Try again later.",
  },
  standardHeaders: true,
  windowMs: 3 * 60 * 60 * 1000,
});

app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

if (exposeApiDocs) {
  app.get("/openapi.yaml", (_req, res) => {
    res.sendFile(openApiPath);
  });
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/openapi.yaml",
      },
    }),
  );
}

app.post("/login", loginRateLimit, loginController);
app.post("/logout", logoutController);
app.get("/auth/me", meController);
app.post("/budgets/pdf", requireAuth, createBudgetPdfController);
app.get("/finances", requireAuth, financesController);
app.post("/customers", requireAuth, createCustomerController);
app.get("/customers", requireAuth, customersController);
app.get("/customers/:customerId", requireAuth, customerByIdController);
app.patch("/customers/:customerId/archive", requireAuth, archiveCustomerController);
app.delete("/customers/:customerId", requireAuth, deleteCustomerController);
app.post("/vehicles", requireAuth, createVehicleController);
app.get("/vehicles", requireAuth, vehiclesController);
app.get("/vehicles/license-plate/:licensePlate", requireAuth, vehicleByLicensePlateController);
app.get("/vehicles/:vehicleId", requireAuth, vehicleByIdController);
app.put("/vehicles/:vehicleId", requireAuth, replaceVehicleController);
app.patch("/vehicles/:vehicleId/archive", requireAuth, archiveVehicleController);
app.delete("/vehicles/:vehicleId", requireAuth, deleteVehicleController);
app.post("/work-orders", requireAuth, createWorkOrderController);
app.get("/work-orders/:workOrderId", requireAuth, workOrderByIdController);
app.delete("/work-orders/:workOrderId", requireAuth, deleteWorkOrderController);
app.get("/vehicles/:vehicleId/work-orders", requireAuth, workOrdersByVehicleController);
app.put("/vehicles/:vehicleId/work-orders/:workOrderId", requireAuth, replaceWorkOrderController);

app.get("/ping", (_req, res) => {
  res.send("pong");
});

app.listen(port, () => {
  logger.info(`API running on http://localhost:${port}`);
});
