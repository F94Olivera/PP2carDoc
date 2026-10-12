import type { AuthenticatedHandler } from "../middlewares/auth-middleware.js";
import { financeQuerySchema } from "../schemas/finance.js";
import * as service from "../services/finance-service.js";

export const financesController: AuthenticatedHandler = async (req, res) => {
  const query = financeQuerySchema.safeParse(req.query);
  if (!query.success) {
    res
      .status(400)
      .json({ error: "Invalid finance query. Use startDate and endDate as YYYY-MM-DD in order." });
    return;
  }
  res.json(await service.getFinances(res.locals.authorization, query.data));
};
