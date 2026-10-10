import { drizzle } from "drizzle-orm/postgres-js";
import pino from "pino";
import postgres from "postgres";
import { supabaseDatabaseCa } from "./supabase-ca.js";

import { sql } from "drizzle-orm";
import type { VerifiedIdentity } from "./schemas/authorization.js";
import { userProfiles } from "./models/user-profile.js";
import { customers } from "./models/customer.js";
import { vehicles } from "./models/vehicle.js";
import { workOrderItems } from "./models/work-order-item.js";
import { workOrderRecommendations } from "./models/work-order-recommendation.js";
import { workOrders } from "./models/work-order.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const schema = {
  userProfiles,
  customers,
  vehicles,
  workOrderItems,
  workOrderRecommendations,
  workOrders,
};

const createDatabase = async () => {
  const databaseUrl =
    process.env.EDGE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Postgres");
  }

  queryClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : {
            ca: process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n") ?? supabaseDatabaseCa,
            rejectUnauthorized: true,
          },
  });

  const database = drizzle(queryClient, {
    schema,
  });
  logger.info("Postgres database initialized");

  return database;
};

let database: Awaited<ReturnType<typeof createDatabase>> | undefined;
let queryClient: postgres.Sql | undefined;
let initialization: ReturnType<typeof createDatabase> | undefined;

export const initializeDatabase = async () => {
  initialization ??= createDatabase();
  database = await initialization;

  return database;
};

export const getDatabase = () => {
  if (!database) {
    throw new Error("Database has not been initialized");
  }

  return database;
};

export const closeDatabase = async () => {
  await queryClient?.end();
  queryClient = undefined;
  database = undefined;
  initialization = undefined;
};

export const sessionUnavailable = () =>
  Object.assign(new Error("Session is no longer active"), { code: "SESSION_INACTIVE" });
export const isInactiveSession = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "SESSION_INACTIVE";

type DatabaseTransaction = Parameters<
  Parameters<Awaited<ReturnType<typeof initializeDatabase>>["transaction"]>[0]
>[0];

// SET LOCAL and transaction-local claims prevent leakage through the connection pool.
// The token has already been verified by Supabase; caller-supplied claims are never accepted.
export const withUserDatabase = async <T>(
  identity: VerifiedIdentity,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
  readOnly = false,
): Promise<T> => {
  const database = await initializeDatabase();
  return database.transaction(
    async (transaction) => {
      const claims = JSON.stringify({
        sub: identity.userId,
        session_id: identity.sessionId,
        iat: identity.issuedAt,
        exp: identity.expiresAt,
        role: "authenticated",
      });
      await transaction.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
      await transaction.execute(sql`set local role authenticated`);
      const result = await transaction.execute(sql`select private.session_active() as active`);
      if (!result[0]?.active) throw sessionUnavailable();
      return operation(transaction);
    },
    { isolationLevel: "repeatable read", accessMode: readOnly ? "read only" : "read write" },
  );
};
