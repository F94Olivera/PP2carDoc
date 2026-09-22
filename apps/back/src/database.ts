import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import pino from "pino";

import { customers } from "./models/customer.js";
import { sessions } from "./models/session.js";
import { users } from "./models/user.js";
import { vehicles } from "./models/vehicle.js";
import { workOrderItems } from "./models/work-order-item.js";
import { workOrderRecommendations } from "./models/work-order-recommendation.js";
import { workOrders } from "./models/work-order.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const createDatabase = () => {
  const databasePath = path.resolve(
    backendDirectory,
    process.env.DATABASE_URL ?? "db/cardoc.sqlite",
  );
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);

  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = DELETE");

  const database = drizzle(sqlite, {
    schema: {
      customers,
      sessions,
      users,
      vehicles,
      workOrderItems,
      workOrderRecommendations,
      workOrders,
    },
  });
  migrate(database, { migrationsFolder: path.join(backendDirectory, "drizzle") });
  logger.info({ databasePath }, "Database initialized");

  return database;
};

let database: ReturnType<typeof createDatabase> | undefined;

export const initializeDatabase = () => {
  database ??= createDatabase();

  return database;
};

export const getDatabase = () => {
  if (!database) {
    throw new Error("Database has not been initialized");
  }

  return database;
};
