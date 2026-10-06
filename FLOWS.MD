# Application flows

## Health check

1. A client sends `GET /ping`.
2. Express responds with JSON: `{ "pong": true }`.

## Edge runtime and local development

1. `pnpm dev` (or `pnpm dev:api`) bundles `apps/back/src/index.ts` with esbuild and starts the Supabase CLI Edge runtime. Source changes rebuild the bundle automatically; the local runtime reloads it.
2. The generated `supabase/functions/api/dist/index.js` contains first-party code. npm imports use exact versions from `apps/back/package.json`; runtime dependencies execute through Deno's npm compatibility layer. Generated output is ignored by Git and rebuilt before deployment.
3. `supabase/functions/api/index.ts` loads that same bundle locally and remotely. Express listens on internal port 8000 and mounts routes under `/api`. The gateway exposes `/functions/v1/api/*`.
4. The single root `.env` provides local custom configuration. Supabase injects its own project URL, public keys and database URL; reserved `SUPABASE_*` overrides from the env file are ignored. The browser uses the externally reachable `NEXT_PUBLIC_*` values.
5. `/login`, `/ping` and CORS preflight are public. Function-level `verify_jwt=false` allows login before a session exists; `requireAuth` verifies tokens via Supabase Auth for every protected route. No admin key is used for request authentication.
6. CORS allows origins with explicit Bearer authorization and never enables cookie credentials. JSON parser errors return JSON 400/413 without logging request bodies or tokens.
7. Supabase owns worker startup and shutdown. The backend does not install process signal handlers or depend on persistent worker memory.

## Database initialization

1. Auth endpoints use Supabase Auth and do not require a Postgres connection at startup.
2. A future persistence repository must call `initializeDatabase()` before `getDatabase()`. The initialization promise is reused within a worker.
3. Connection priority is `EDGE_DATABASE_URL` (optional pooler override), runtime `SUPABASE_DB_URL`, then `DATABASE_URL` (host-side tooling such as the seed script).
4. Drizzle uses one connection per worker, `prepare: false`, a 10-second connect timeout and a 20-second idle timeout. Local `.env` sets `DATABASE_SSL=false`; hosted connections require SSL by default.
5. `closeDatabase()` remains available to finite scripts; idle connections in Edge expire without relying on Node shutdown signals.
6. Drizzle does not automatically inherit the caller's Supabase identity. Repositories/services must enforce resource authorization. Deploying the function neither migrates nor seeds database tables.

## Password login

1. A client sends POST /login with JSON containing only email and password.
2. Express parses JSON with an 8 KB limit. The auth controller validates the body using the shared auth schema.
3. The auth service calls the auth repository, which creates a request-specific Supabase client with SUPABASE_URL and the runtime-injected public key. Session persistence and automatic refresh are disabled on the backend.
4. Supabase Auth checks the credentials and applies its own rate limits; carDoc does not store passwords or issue its own JWT.
5. The mapper returns only the user ID/email and session tokens/expiration. Login responses use Cache-Control: no-store.
6. Invalid credentials or an unconfirmed email return a generic 401; upstream rate limiting returns 429; configuration/provider failures return 503 without exposing provider details or credentials.
7. The client owns session storage and renewal using Supabase Auth and can retrieve the current user through `GET /auth/me`.

There is no local login rate limiter. Supabase normally sees the backend IP, so its upstream limit is shared across users unless supported IP forwarding is configured.

## Protected routes

1. `/login` and `/ping` are registered as public routes before the protected router.
2. The protected router runs `requireAuth` before `/auth/me`, `/logout`, and every future endpoint registered in that router.
3. The middleware validates `Authorization: Bearer <access_token>` using the shared auth schema. Missing or malformed headers return 401 with `WWW-Authenticate: Bearer`.
4. The auth service calls the repository's `auth.getUser(accessToken)` with an isolated Supabase client. Invalid or expired tokens and missing users return 401; provider rate limits return 429; configuration or provider failures return 503. Protected responses use `Cache-Control: no-store`.
5. On success, the middleware stores the mapped user in typed `res.locals.user` and the token in `res.locals.accessToken`, then calls `next()`. It never logs tokens or provider details.
6. Authentication identifies the caller. Resource permissions must be enforced separately in the application services; direct Drizzle queries do not automatically inherit the Supabase user's identity.

## Current authenticated user

1. A client sends `GET /auth/me` with a Bearer access token; no body is used.
2. `requireAuth` validates the token before the controller runs.
3. The controller returns `{ "user": { "id": "<user_id>", "email": "<email_or_null>" } }` from `res.locals.user`, without a second Auth lookup. Session tokens and user metadata are not included.

## Logout

1. A client sends `POST /logout` with `Authorization: Bearer <access_token>`; no body is used.
2. `requireAuth` validates the Bearer token with Supabase Auth and stores it in `res.locals.accessToken`; the controller passes that validated token to the logout service.
3. The auth service calls the auth repository, which creates an isolated Supabase client using the runtime-injected project configuration and calls `auth.admin.signOut(accessToken, "local")`. No service-role key is required; Supabase authorizes the request using the user's token.
4. Supabase revokes the refresh tokens for the current session only. Other sessions remain active. Success returns 204 with no body.
5. Invalid or expired tokens return 401; provider rate limits return 429; configuration or provider failures return 503 without exposing credentials or provider details. Responses use `Cache-Control: no-store`.
6. The client deletes its stored access and refresh tokens. An issued access token remains valid until expiration; logout does not immediately invalidate JWTs.

## Integración del frontend

## Acceso y autenticacion

1. El frontend autentica con Supabase Auth mediante email y contraseña.
2. `/login` permite iniciar sesión; una sesión válida redirecciona a `/budget`.
3. `@supabase/ssr` guarda y renueva la sesión mediante cookies.
4. El proxy de Next.js verifica los claims del token y renueva la sesión antes de servir rutas protegidas.
5. El layout protegido vuelve a verificar los claims del usuario en el servidor.
6. El guard del navegador valida el usuario con Supabase y escucha el cierre de sesión.
7. El botón `Cerrar sesión` cierra la sesión local y redirecciona a `/login`.
8. `/ok` consulta el usuario autenticado en Supabase.
9. Clientes, vehículos, órdenes, finanzas y PDF mantienen sus integraciones anteriores; su migración a Supabase está pendiente.
10. El aislamiento de datos por taller depende del backend y sus políticas; esta integración solo implementa autenticación.

Las demás pantallas importadas conservan contratos anteriores pendientes de adaptar al backend actual.

## Deployment and authentication verification

1. Run formatting, lint, typecheck and build checks. Test the bundle using `pnpm --filter @cardoc/back test:auth` against Supabase local.
2. The smoke test reads only its credentials from the root `.env`, verifies ping, CORS, parser limits, invalid/missing credentials, successful login and `/auth/me`, then revokes its own session with `/logout` in a finally block. It never prints passwords or tokens.
3. Commit and push the source. `pnpm deploy:api --project-ref <project-ref>` rebuilds and deploys only `api`; custom secrets are configured separately. CLI login is required on the deploying machine.
4. Run the same test with `TEST_API_URL=https://<project-ref>.supabase.co/functions/v1/api` and credentials belonging to that project. Local and remote Auth users are independent.
5. Frontend deployment is separate. Its `NEXT_PUBLIC_API_URL` must point to the matching function URL and its Supabase Auth configuration to the same project.
