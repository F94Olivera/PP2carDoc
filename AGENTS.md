# carDoc — Agent Guidelines

## Project structure

- `apps/back`: Express API using TypeScript.
- `docs`: project documentation.
- `scripts`: repository-level utility scripts.

Use the existing backend package name in pnpm commands: `@cardoc/back`.

## Commands

Run commands from the repository root with pnpm.

- `pnpm dev`: start the backend.
- `pnpm build`: build the backend.
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

- Backend port: `PORT_BACK=3001`.
- Backend secrets, including `JWT_SECRET`, must not be exposed to clients.

## Repository hygiene

- Keep dependencies in the workspace that imports them; reserve root dependencies for shared tooling.
- Do not edit generated output such as `dist` or `node_modules`.
- Preserve unrelated user changes.
- Update the pnpm lockfile when dependencies change.
- Do not add frameworks, linters or build tools without a concrete need.
- Whenever adding or modifying code that changes an application flow, update `FLOWS.MD` in the same change.
