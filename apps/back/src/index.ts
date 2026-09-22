import express from "express";

const app = express();
const port = process.env.PORT_BACK ?? "3001";

// app.post("/login", loginRateLimit, loginController);
// app.post("/logout", logoutController);
// app.get("/auth/me", meController);
// app.post("/budgets/pdf", requireAuth, createBudgetPdfController);
// app.get("/finances", requireAuth, financesController);
// app.post("/customers", requireAuth, createCustomerController);
// app.get("/customers", requireAuth, customersController);
// app.get("/customers/:customerId", requireAuth, customerByIdController);
// app.patch("/customers/:customerId/archive", requireAuth, archiveCustomerController);
// app.delete("/customers/:customerId", requireAuth, deleteCustomerController);
// app.post("/vehicles", requireAuth, createVehicleController);
// app.get("/vehicles", requireAuth, vehiclesController);
// app.get("/vehicles/license-plate/:licensePlate", requireAuth, vehicleByLicensePlateController);
// app.get("/vehicles/:vehicleId", requireAuth, vehicleByIdController);
// app.put("/vehicles/:vehicleId", requireAuth, replaceVehicleController);
// app.patch("/vehicles/:vehicleId/archive", requireAuth, archiveVehicleController);
// app.delete("/vehicles/:vehicleId", requireAuth, deleteVehicleController);
// app.post("/work-orders", requireAuth, createWorkOrderController);
// app.get("/work-orders/:workOrderId", requireAuth, workOrderByIdController);
// app.delete("/work-orders/:workOrderId", requireAuth, deleteWorkOrderController);
// app.get("/vehicles/:vehicleId/work-orders", requireAuth, workOrdersByVehicleController);
// app.put("/vehicles/:vehicleId/work-orders/:workOrderId", requireAuth, replaceWorkOrderController);

app.get("/ping", (_req, res) => {
    res.json({ pong: true });
});

app.listen(port);
