# carDoc — Agent Guidelines

## Project structure

- `apps/back`: Express/TypeScript API bundled for Supabase Edge Functions.
- `apps/front`: Next.js/React frontend.
- `packages/types`: shared API contracts.
- `supabase`: Edge entrypoint, configuration and destructive demo schema.
- Root Markdown: primary project documentation.
- `docs`: OpenAPI and dated evidence reports.
- `scripts`: repository-level utility scripts.

Use the existing backend package name in pnpm commands: `@cardoc/back`.

## Commands

Run commands from the repository root with pnpm.

- `pnpm dev`: start the local Edge backend (Docker required).
- `pnpm dev:web`: start the frontend.
- `pnpm build`: build all configured workspaces.
- `pnpm build:api`: build the backend and its workspace dependencies.
- `pnpm typecheck`: run TypeScript checks.

Before creating a commit, run focused formatting, linting and TypeScript checks when those scripts exist, then run `pnpm build` and `git diff --check`. Do not create a commit if a configured check fails.

## Testing policy

- Unit tests are the default for all new tests. They must run without real Supabase/API calls or a live database; use isolated inputs or test doubles as needed.
- A generic user request such as "corre los tests", "run the tests", "verify the changes" or similar authorizes unit tests only. `pnpm test`, `pnpm test:unit` and their backend equivalents must run unit tests only.
- Keep the three existing integration tests in `apps/back/tests/integration`. NEVER execute integration tests unless the user explicitly requests them. Generic test, build, verification, commit, deployment or end-to-end-work requests are not authorization to execute integration tests.
- `test:auth`, `test:customers` and `test:authorization` are integration commands. Do not run them automatically, including as part of aggregate scripts, hooks or CI. This restriction protects the Supabase API rate limit and applies to local and remote integrations.
- If a new integration test would provide worthwhile coverage (in addition to a unit test or instead of one), stop before creating it. Tell the user: "mira que conviene sumar el test como integracion tambien", explain the concrete coverage and external-service cost, and wait for explicit approval. Approval to create an integration test does not by itself authorize executing it.
- Apply this policy to scripts and manual verification too: do not replace a prohibited integration run with equivalent ad hoc Supabase/API/database calls.

## Backend conventions

Backend source code belongs under `apps/back/src`.

Use functions instead of classes. Only introduce a class when the user explicitly requests it.

- `controllers`: translate HTTP requests and responses.
- `services`: application and business logic.
- `repositories`: persistence and external data access.
- `models`: backend domain models.
- `middlewares`: Express middleware.

Keep `src/index.ts` focused on creating the Express app, registering middleware and routes, and starting the server. Do not put business logic in the entrypoint or controllers.

Use Pino instead of `console.log` when logging is needed. Keep API contracts shared rather than duplicating them.

### Backend endpoint pattern

For new backend endpoints, follow this flow unless the user requests otherwise:

1. Controller: owns HTTP concerns only: request validation, query/params/body validation, status codes and error responses.
2. Schema: create one schema file per domain when missing; derive required and optional fields from the Drizzle model and reject undeclared body keys.
3. Service: owns application flow, calls repositories, and uses mappers when boundaries need to be explicit.
4. Repository: owns database access only. Use descriptive persistence names, such as `insertCustomer` and `findCustomerById`.
5. Mapper: create API response mappers when converting database values or keeping boundaries explicit.
6. Documentation: whenever an HTTP endpoint changes, update `docs/openapi.yaml` and keep its contracts aligned with the implementation.

Use domain-singular backend files, such as `customer-controller.ts`, `customer-service.ts`, `customer-repository.ts`, `customer-mapper.ts`, and `customer.ts` for schemas and models. Use action-oriented exported functions, such as `createCustomerController`, `createCustomer`, `insertCustomer`, and `toCustomerResponse`.

## Environment

Use the single `.env` file at the repository root. Never commit it or place real secrets in `.env.example`.

- Local public API: `http://127.0.0.1:54321/functions/v1/api`.
- Express internal port: `PORT_BACK`, default 8000; 3001 is not the standard development entrypoint.
- Backend secrets, including `JWT_SECRET`, must not be exposed to clients.

## Repository hygiene

- Keep dependencies in the workspace that imports them; reserve root dependencies for shared tooling.
- Do not edit generated output such as `dist` or `node_modules`.
- Preserve unrelated user changes.
- Update the pnpm lockfile when dependencies change.
- Do not add frameworks, linters or build tools without a concrete need.
- Whenever adding or modifying code that changes an application flow, update `REQUIREMENTS.md` in the same change. Flows are integrated there; do not recreate a separate FLOWS document.

## Documentation ownership

- `README.md`: installation, environment, commands, runtime and deployment.
- `REQUIREMENTS.md`: confirmed behavior, business rules, flows, acceptance and implemented/planned endpoint status.
- `docs/openapi.yaml`: detailed implemented HTTP contracts. Keep it aligned when code changes; do not claim planned endpoints are available.
- `STEPBYSTEP.md`: incremental delivery plan and brief verified progress.
- `TESTING.md`: commands, scenarios, execution results and verification limits. Planned coverage is not an executed test.
- `TODO.md`: unimplemented code changes, linked to the plan. Documentation work must not silently implement this backlog.
- Preserve dated evidence in `docs`; distinguish historical results from the current state. No DEFENSA document is needed.

Follow confirmed business rules in REQUIREMENTS instead of repeating them here. When code differs, document the discrepancy in TODO; never rewrite the requirement to justify the old behavior. Update the plan and recorded results after implementation.

## Layer boundaries and shared code

- Routes register paths, parsers and middleware. Small route registration may remain in `src/index.ts`; domain route modules can live under `src/routes` when useful. Do not add business logic there.
- Middleware owns token/session verification, authentication context and cross-cutting HTTP concerns. GOD still authenticates.
- Controllers validate HTTP inputs through domain schemas, call services and translate outcomes to HTTP responses.
- Services own use cases, resource permissions and coordination of atomic changes; they do not construct HTTP responses.
- Repositories own persistence and external access, using the existing transaction/authentication boundary. They never handle Express requests/responses.
- Mappers explicitly transform persistence/internal values to public contracts, selecting exposed fields and normalizing dates/enums. Never expose password hashes or verifiers.
- Domain validators live in `src/schemas`; DTO/API contracts live in `packages/types`, not duplicated per app. Derive writable fields from models and exclude generated/immutable fields.
- Central unexpected-error handling belongs in `middlewares/error-middleware.ts`; keep error contracts shared and avoid leaking database details.
- Keep existing function-based architecture. Do not split every concern into a new layer or add dependencies without a concrete need.

## Frontend conventions

- Frontend code belongs in `apps/front/app`, with navigation/session guarding in the existing Next.js structure.
- Use shared API types and the authenticated transport for private API requests. Navigation guards and hiding controls do not replace server authorization.
- Keep API I/O in the existing domain API modules and shared transport; components own display and user interaction.
- Preserve loading, empty, error and expired-session behavior. Handle complete pagination rather than assuming the first page is all records.

## Scope of verification

For Markdown-only changes, use focused formatting, local-link checks and `git diff --check`; do not start live services merely to validate documentation. Before a commit, the configured checks above still apply. Do not execute the destructive demo schema, seed or deploy as an incidental verification step.
