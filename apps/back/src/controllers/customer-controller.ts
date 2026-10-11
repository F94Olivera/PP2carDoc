import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerByIdParamsSchema,
  listCustomersQuerySchema,
} from "../schemas/customer.js";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
} from "../services/customer-service.js";

export const listCustomersController: AuthenticatedHandler = async (req, res) => {
  const parsed = listCustomersQuerySchema.safeParse(req.query);
  if (!parsed.success || !Number.isSafeInteger((parsed.data.page - 1) * parsed.data.pageSize)) {
    res.status(400).json({
      error:
        "Expected page >= 1, pageSize between 1 and 100, and includeArchived true or false; no unknown query parameters.",
    });
    return;
  }

  res.json(await listCustomers(res.locals.authorization, parsed.data));
};

export const customerByIdController: AuthenticatedHandler = async (req, res) => {
  const parsed = customerByIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Expected customerId to be an integer between 1 and 2147483647." });
    return;
  }

  const customer = await getCustomerById(res.locals.authorization, parsed.data.customerId);
  if (!customer) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }

  res.json(customer);
};

export const createCustomerController: AuthenticatedHandler = async (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid customer body or undeclared fields." });
    return;
  }
  const result = await createCustomer(res.locals.authorization, parsed.data);
  if (result.outcome === "forbidden") {
    res.status(403).json({ error: "Customer owner must be an authorized existing MECHANIC." });
    return;
  }
  res.status(201).json(result.customer);
};
export const updateCustomerController: AuthenticatedHandler = async (req, res) => {
  const params = customerByIdParamsSchema.safeParse(req.params);
  const body = updateCustomerSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid customer ID or body." });
    return;
  }
  const result = await updateCustomer(res.locals.authorization, params.data.customerId, body.data);
  if (result.outcome === "not_found") {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  res.json(result.customer);
};
export const deleteCustomerController: AuthenticatedHandler = async (req, res) => {
  const parsed = customerByIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid customer ID." });
    return;
  }
  if (!(await deleteCustomer(res.locals.authorization, parsed.data.customerId))) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  res.status(204).end();
};
