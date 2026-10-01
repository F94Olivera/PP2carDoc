# Application flows

## Health check

1. A client sends `GET /ping`.
2. Express responds with JSON: `{ "pong": true }`.

## Database initialization

1. Backend code calls `initializeDatabase()`.
2. The database module reads `DATABASE_URL` and opens a Postgres connection. In local development, `DATABASE_URL` points to the Supabase Postgres instance at `127.0.0.1:54322` and `DATABASE_SSL=false` disables SSL for that local connection.
3. Drizzle initializes the database client with the backend models as its schema.
4. The initialized Drizzle database is available through `getDatabase()`.
