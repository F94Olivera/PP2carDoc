import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import { customerByIdParamsSchema, listCustomersQuerySchema } from "../schemas/customer.js";
import { getCustomerById, listCustomers } from "../services/customer-service.js";

export const listCustomersController: AuthenticatedHandler = async (req, res) => {
  const parsed = listCustomersQuerySchema.safeParse(req.query);
  if (!parsed.success || !Number.isSafeInteger((parsed.data.page - 1) * parsed.data.pageSize)) {
    res.status(400).json({
      error:
        "Expected page >= 1, pageSize between 1 and 100, and includeArchived true or false; no unknown query parameters.",
    });
    return;
  }

  res.json(await listCustomers(parsed.data));
};

export const customerByIdController: AuthenticatedHandler = async (req, res) => {
  const parsed = customerByIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Expected customerId to be an integer between 1 and 2147483647." });
    return;
  }

  const customer = await getCustomerById(parsed.data.customerId);
  if (!customer) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }

  res.json(customer);
};
