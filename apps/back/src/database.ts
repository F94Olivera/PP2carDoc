import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import pino from "pino";
import postgres from "postgres";

import { customers } from "./models/customer.js";
import { sessions } from "./models/session.js";
import { users } from "./models/user.js";
import { vehicles } from "./models/vehicle.js";
import { workOrderItems } from "./models/work-order-item.js";
import { workOrderRecommendations } from "./models/work-order-recommendation.js";
import { workOrders } from "./models/work-order.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const schema = {
  customers,
  sessions,
  users,
  vehicles,
  workOrderItems,
  workOrderRecommendations,
  workOrders,
};

const createDatabase = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Postgres");
  }

  queryClient = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
  });

  const database = drizzle(queryClient, {
    schema,
  });
  await migrate(database, { migrationsFolder: path.join(backendDirectory, "drizzle") });
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
