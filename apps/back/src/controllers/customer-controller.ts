import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import { listCustomersQuerySchema } from "../schemas/customer.js";
import { listCustomers } from "../services/customer-service.js";

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
