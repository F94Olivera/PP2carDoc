import type { FinanceQuery } from "@cardoc/types";
import type { AuthorizationContext } from "../schemas/authorization.js";
import { toFinanceResponse } from "../mappers/finance-mapper.js";
import { sumClosedOrderItems } from "../repositories/finance-repository.js";

export const getFinances = async (
  context: AuthorizationContext,
  query: FinanceQuery,
  dependencies = { sumClosedOrderItems },
) => toFinanceResponse(await dependencies.sumClosedOrderItems(context, query));
