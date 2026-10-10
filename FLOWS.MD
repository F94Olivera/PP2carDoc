# Application flows

## Runtime and configuration

1. `pnpm dev` bundles the backend and runs Supabase Edge locally. `pnpm build` builds all workspaces; generated output is ignored. `src/index.ts` registers middleware/routes and starts Express; business logic stays in services.
2. The gateway exposes `/functions/v1/api`. `/ping`, `/login` and CORS preflight are public; every registered business route and `/auth/me` and `/logout` run through `requireAuth`. Function `verify_jwt=false` allows public login; protected routes verify tokens in code.
3. Use the single root `.env`. Browser Supabase URL, API URL, Auth and Postgres must belong to the same project: hosted Auth cannot use local users/sessions or vice versa. Edge injects its project Auth configuration. `EDGE_DATABASE_URL` overrides injected `SUPABASE_DB_URL`; host-side scripts can fall back to `DATABASE_URL`.
4. Hosted access requires HTTPS and certificate-verified Postgres SSL. Loopback HTTP/SSL-disabled Postgres are development exceptions. Public/publishable keys can reach the browser; database credentials and demo passwords cannot. Neither request tokens nor passwords are logged.
5. Finite scripts close database connections. Edge owns worker lifecycle; no process signal handlers are installed. Host-side execution may use `PORT_BACK`, defaulting to Edge's internal port 8000.

6. Frontend API requests use the shared `fetchApi` transport with `x-region: us-west-2`, placing hosted Edge execution near Postgres. This header does not change direct Supabase Auth requests. CORS permits `x-region` and exposes `x-sb-edge-region` for verification; deploy the backend CORS update before publishing the frontend. Local API execution ignores regional routing. Explicit regional invocations do not automatically fail over to another region.

## Login, identity and current permissions

1. `POST /login` accepts only email/password with an 8 KB limit. Supabase Auth verifies credentials; carDoc does not mint JWTs or store application passwords.
2. The auth service verifies the resulting token with `auth.getUser`, rejects anonymous accounts, then reads identity/session claims from that already-verified JWT. Decoding alone never authenticates a caller.
3. Every protected request repeats that verification, checks that `session_id` belongs to that user and remains in `auth.sessions`, and checks `not_after` where configured.
4. Tokens are accepted for at most 900 seconds after `iat`, or their signed expiration if earlier. Local Auth also uses `jwt_expiry=900`. Hosted Auth may still emit longer JWTs; API and RLS independently enforce the 900-second limit. The browser refreshes a session before this application limit when making an API request. `user_profiles.role` is always read afresh.
5. Profiles are created as MECHANIC by a protected Auth insert trigger. Their `id` references `auth.users.id`. The only roles are GOD and MECHANIC. A profile role trigger synchronizes `app_metadata.user_role`, which is included in newly issued signed tokens. Existing token claims can be stale; they do not grant privileges. `user_metadata` is never used for authorization.
6. Login and `GET /auth/me` return the shared user contract `{ id, email, role }`. Login additionally returns the Supabase session. Responses use `Cache-Control: no-store`; errors are generic 401, upstream 429, or 503 when Auth/profile lookup is unavailable.
7. Middleware stores verified user, session token and authorization context in typed response locals. Controllers pass this context to services and repositories.
8. GOD can operate across the application dataset; MECHANIC can operate only on its own dataset. Neither role bypasses token/session checks. A stolen still-accepted bearer token impersonates its owner; HTTPS, short token lifetime and session revocation reduce this risk. MFA enrollment for GOD remains an account setup decision, not a role bypass.

## Database authorization and ownership

1. Ownership is stored only in `customers.mechanic_id`, indexed and linked to a user profile. Vehicles inherit from their customer; orders from their vehicle; items and recommendations from their order.
2. Each repository operation runs inside `withUserDatabase`: initialize the connection, begin a transaction, install verified claims using transaction-local `set_config`, and `SET LOCAL ROLE authenticated`. Session validity is checked again before the operation. Claims/role reset at transaction end, including rollback, preventing pooled-connection identity leakage.
3. Every application table has RLS. Customer policies use current profile role plus ownership. Child policies require an accessible parent both for existing rows (`USING`) and the resulting row (`WITH CHECK`), preventing cross-owner inserts, reassignment and updates. Revoked/old sessions cannot access profiles or domain rows.
4. API repositories additionally filter customer queries by the middleware context. The current database role in RLS remains authoritative if privileges change between middleware and query. GOD sees all domain rows; MECHANIC sees only its own rows, including pagination counts.
5. Anonymous roles have no application table grants. Authenticated callers can read their own profile (GOD can read all). Only GOD can update the role column through the Data API's RLS-protected profile operation; no caller can insert profiles or change their IDs/timestamps. Initial GOD provisioning uses privileged server-side tooling.
6. Private helpers read protected Auth sessions/profiles with narrow security-definer access and fixed empty search paths. They derive caller identity from `auth.uid()`, are not exposed by the Data API and revoke PUBLIC/anon execute permissions. Trigger functions cannot be invoked as public RPCs.
7. Document uniqueness is scoped by `(mechanic_id, document_number)`. Vehicle plate uniqueness is case-insensitive and trimmed per mechanic. A private derived plate index is maintained by triggers, with a database unique constraint protecting concurrent writes; `vehicles` has no duplicated owner column. Parent locks serialize vehicle assignment with customer transfers.
8. A GOD ownership transfer changes access to the entire descendant history atomically. Existing document/plate conflicts reject and roll back the transfer. Vehicle/order parent associations require access to both existing and resulting parent.
9. `supabase/schema.sql` is the single destructive demo setup, without incremental migrations. Run it manually against the intended fake-data project only when recreating the schema, then run `pnpm run seed:superheroes`. It resets carDoc tables, profiles, functions and policies atomically while preserving Supabase-managed Auth/Storage infrastructure. Existing accounts are initially MECHANIC; the seed restores the three demo roles. Neither deployment nor the seed runs this SQL automatically. Removing the former migration files does not change the deployed database or its existing history.

## Customer HTTP endpoints

1. `GET /customers` accepts page (default 1), pageSize (default 10, max 100), includeArchived (default false). Unknown/repeated parameters and unsafe offsets return 400. Count and rows share a read-only repeatable-read snapshot, ownership scope and active filter. Rows are ordered by ID; out-of-range pages return an empty array.
2. `GET /customers/:customerId` validates a positive decimal integer without leading zeros, at most 2147483647. Both missing and inaccessible customers return the same 404. Archived customers remain available by ID.
3. `POST /customers` validates only declared writable customer fields, with a 32 KB limit. It defaults ownership to the caller; assigning another owner requires GOD. The service applies that rule before the repository insert and returns 201.
4. `PATCH /customers/:customerId` requires a nonempty strictly validated partial body. MECHANIC edits its own customers; only GOD can transfer ownership. Returns the mapped customer or 404. `isActive` supports archive/unarchive.
5. `DELETE /customers/:customerId` allows MECHANIC on its own rows and GOD on all rows. Missing/inaccessible rows return 404; success returns 204. Existing vehicles block deletion via the restrictive FK.
6. Foreign-key/unique conflicts return generic 409 without leaking protected record details; RLS permission violations return 403. Unexpected errors return generic 500. Session invalidation during processing returns 401.
7. Response mappers serialize timestamps and return the shared contract including mechanicId. All changed contracts are documented in `docs/openapi.yaml`.
8. Vehicle/order HTTP endpoints remain unregistered; their persistence models and direct Data API operations are protected by the inherited RLS rules. Customer CRUD provides the API write flow used to verify cross-user authorization.

## Seed and demo accounts

1. `pnpm run seed:superheroes` delegates to `@cardoc/back`; imported dependencies live in that workspace. Set `SEED_DEMO_PASSWORD` (minimum 16 characters) in the ignored root `.env`.
2. Demo-only privileged fixture creation provisions/restores Mateo and Lucia as MECHANIC and `god.cardoc@example.test` as GOD. Their emails are `mateo.cardoc.20261006@example.test`, `lucia.cardoc.20261006@example.test`, and `god.cardoc@example.test`. All use the configured demo password; credentials are never embedded in committed files or printed.
3. Fixtures write Supabase-compatible bcrypt hashes and email identities directly through trusted database tooling to avoid SMTP requirements for reserved fake email addresses. This is demo seeding, not a production registration API. Re-running the seed revokes these fixture sessions and resets their fixture credentials/roles.
4. The seed removes previous superhero fixtures and recreates 20 customers split evenly between the two mechanics, 19 vehicles, 48 orders, 143 items and 47 recommendations. GOD has global access to this dataset.
5. Scripts use privileged database access intentionally for setup/verification. Application repositories always switch to the restricted authenticated role.

## Frontend and logout

1. Supabase SSR manages browser sessions, cookies and renewal. Next.js route guards authenticate navigation; resource authorization is enforced by the API/database.
2. `fetchAuthenticated` retrieves the current session and refreshes it before the 15-minute application token limit, then forwards Bearer authorization to the matching API. Cookies are omitted from API requests and caching is disabled. HTTP 401 notifies the existing auth guard.
3. `POST /logout` verifies the current token/session, then calls Supabase `auth.admin.signOut(token, "local")` using the caller's token. This revokes only that session. API and RLS checks reject its issued access token on subsequent requests because the session row is gone. Other sessions remain active.
4. The client also deletes its locally stored session. Logout returns 204; auth failures retain generic 401/429/503 behavior.

## Verification

1. `pnpm --filter @cardoc/back test:unit` verifies identity/session claim parsing, expiration limits, owner selection, ignored metadata and strict writable schemas. Backend typecheck includes tests and the TypeScript seed.
2. `test:auth` verifies public health/CORS, login validation, authenticated identity and immediate rejection after logout. `test:customers` compares isolated pagination/details against database results for the signed-in role.
3. `test:authorization` uses the three seeded accounts against the configured API, Supabase Auth, direct Data API and restricted Postgres transactions. It checks API CRUD, ownership/count isolation, concurrent requests, all five domain tables, cross-parent writes, role escalation attempts, stale role claims, owner transfer, concurrent plate uniqueness, token alteration, lifetime/session binding and logout.
4. Tests clean up their temporary records, restore fixture roles/metadata and revoke their test sessions. Run them against the demo dataset, with matching project configuration in root `.env`.
5. Before delivery, run focused formatting, lint, TypeScript, unit/integration tests, `pnpm build`, `git diff --check` and Supabase security advisors. No commit is required to review local changes.

## Backend utility scripts

There are five files in `apps/back/scripts`, including `seed-superheroes.ts`. The other four are:

- `edge.mjs`: esbuild bundling for Supabase Edge. `build` produces the ignored bundle; `serve` watches source changes and starts the local Edge runtime through the CLI. Used by the backend build/dev/start commands.
- `smoke-auth.mjs`: real HTTP integration checks for health, CORS, login validation, protected identity and logout/session rejection. Run with `pnpm --filter @cardoc/back test:auth`; uses the test credentials in root `.env` and revokes its test session.
- `smoke-customers.mjs`: real HTTP customer list/detail checks against direct database expectations, including owner scope, pagination, archived filtering, validation and UTC timestamps. Run with `pnpm --filter @cardoc/back test:customers`; reads customer data and revokes its test session.
- `smoke-authorization.mjs`: integration/security checks using the two demo mechanics and GOD across the HTTP API, Data API and restricted SQL transactions. Verifies cross-user denial, CRUD, inherited access, transfers, uniqueness under concurrency, role changes, token tampering and session revocation. Run with `pnpm --filter @cardoc/back test:authorization` against the demo dataset. It temporarily writes fixtures, modifies fixture roles/metadata, then cleans up records, restores roles/metadata and revokes sessions.

The smoke scripts are integration tests; unit tests live in `apps/back/tests`. They do not execute during ordinary application requests.
