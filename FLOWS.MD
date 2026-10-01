# Application flows

## Health check

1. A client sends `GET /ping`.
2. Express responds with JSON: `{ "pong": true }`.

## Database initialization

1. `src/index.ts` starts the backend by calling `initializeDatabase()` before `app.listen()`.
2. The database module reads `DATABASE_URL` and opens a Postgres connection. In local development, `DATABASE_URL` points to the Supabase Postgres instance at `127.0.0.1:54322` and `DATABASE_SSL=false` disables SSL for that local connection.
3. Drizzle initializes the database client with the backend models as its schema.
4. The initialized Drizzle database is available through `getDatabase()`.
5. If the database connection fails, the backend logs a fatal startup error and exits instead of listening without persistence.
6. On `SIGINT` or `SIGTERM`, the backend stops accepting HTTP requests and closes the database connection.

## Password login

1. A client sends POST /login with JSON containing only email and password.
2. Express parses JSON with an 8 KB limit. The auth controller validates the body using the shared auth schema.
3. The auth service calls the auth repository, which creates a request-specific Supabase client with SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from the root .env. Session persistence and automatic refresh are disabled on the backend.
4. Supabase Auth checks the credentials and applies its own rate limits; carDoc does not store passwords or issue its own JWT.
5. The mapper returns only the user ID/email and session tokens/expiration. Login responses use Cache-Control: no-store.
6. Invalid credentials or an unconfirmed email return a generic 401; upstream rate limiting returns 429; configuration/provider failures return 503 without exposing provider details or credentials.
7. The client owns session storage and renewal using Supabase Auth and can retrieve the current user through `GET /auth/me`.

There is no local login rate limiter. Supabase normally sees the backend IP, so its upstream limit is shared across users unless supported IP forwarding is configured.

## Current authenticated user

1. A client sends `GET /auth/me` with `Authorization: Bearer <access_token>`; no body is used.
2. The auth controller validates the authorization header with the shared auth schema. Missing or malformed headers return 401 with `WWW-Authenticate: Bearer`.
3. The auth service calls the auth repository, which creates an isolated Supabase client and calls `auth.getUser(accessToken)` to validate the token with Supabase Auth and retrieve the current user.
4. The shared user mapper returns `{ "user": { "id": "<user_id>", "email": "<email_or_null>" } }`. Session tokens and user metadata are not included.
5. Invalid or expired tokens and missing users return 401 with `WWW-Authenticate: Bearer`; provider rate limits return 429; configuration or provider failures return 503 without exposing provider details. All responses use `Cache-Control: no-store`.

## Logout

1. A client sends `POST /logout` with `Authorization: Bearer <access_token>`; no body is used.
2. The auth controller validates the authorization header with the shared auth schema. Missing or malformed headers return 401 with `WWW-Authenticate: Bearer`.
3. The auth service calls the auth repository, which creates an isolated Supabase client using the root environment configuration and calls `auth.admin.signOut(accessToken, "local")`. No service-role key is required; Supabase authorizes the request using the user's token.
4. Supabase revokes the refresh tokens for the current session only. Other sessions remain active. Success returns 204 with no body.
5. Invalid or expired tokens return 401; provider rate limits return 429; configuration or provider failures return 503 without exposing credentials or provider details. Responses use `Cache-Control: no-store`.
6. The client deletes its stored access and refresh tokens. An issued access token remains valid until expiration; logout does not immediately invalidate JWTs.
