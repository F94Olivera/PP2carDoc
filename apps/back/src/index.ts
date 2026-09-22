import express from "express";

const app = express();
const port = process.env.PORT_BACK ?? "3001";

// app.post("/login", loginController);
// app.post("/logout", logoutController);
// app.get("/auth/me", meController);
// app.post("/customers", createCustomerController);
// app.get("/customers", customersController);
// app.post("/vehicles", createVehicleController);
// app.get("/vehicles", vehiclesController);
// app.post("/work-orders", createWorkOrderController);

app.get("/ping", (_req, res) => {
  res.json({ pong: true });
});

app.listen(port);
