# Application flows

## Health check

1. A client sends `GET /ping`.
2. Express responds with JSON: `{ "pong": true }`.

## Database initialization

1. Backend code calls `initializeDatabase()`.
2. The database module reads `DATABASE_URL` and opens a Postgres connection.
3. Drizzle runs pending migrations from `apps/back/drizzle`.
4. The initialized Drizzle database is available through `getDatabase()`.
