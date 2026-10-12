import { sql } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
import type { AuthorizationContext } from "../schemas/authorization.js";
import type { FinanceQuery } from "@cardoc/types";

export const sumClosedOrderItems = (context: AuthorizationContext, query: FinanceQuery) =>
  withUserDatabase(
    context,
    async (transaction) => {
      // The private aggregate preserves archived history without opening operational RLS.
      // Identity and current role are checked again in SQL, never supplied as arguments.
      const rows = await transaction.execute(sql`
      select private.finance_total(${query.startDate}::date, ${query.endDate}::date) as total
    `);
      return rows[0]?.total;
    },
    true,
  );
