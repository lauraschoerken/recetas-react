# MealAgenda — Web

[Español](README.es.md)

MealAgenda is a web application for managing recipes and ingredients, planning meals, creating shopping lists, tracking household stock, and sharing selected data with a household.

This repository contains the React and TypeScript client. The REST API lives in [recetas-node](https://github.com/lauraschoerken/recetas-node). For implementation details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Requirements

- Node.js 24.14.1 and npm 11.11.0 were used for the latest local verification. Vite 7 requires Node.js 20.19+ or 22.12+.
- A local MealAgenda API for features that read or change server data.
- PostgreSQL is an API requirement, not a direct web-client dependency.

## Local development

Start the API on port `3002`, then:

```bash
git clone --branch develop https://github.com/lauraschoerken/recetas-react.git
cd recetas-react
npm ci
npm run dev
```

The development site is served at `http://localhost:3000` by default. The deployed application requires a real account and is not a test environment; never aim automated tests or local cleanup commands at it.

## Configuration

Vite reads the intentionally misspelled, legacy `enviroments/` directory. Common values live in `enviroments/.env`; mode-specific overrides live in `enviroments/dev/.env.dev` and `enviroments/prod/.env.prod`. Do not overwrite local or deployment-specific values when preparing a contribution.

All `VITE_*` values are included in browser code and must never contain passwords, tokens, or other secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Development | Target used by the Vite `/api` proxy, normally `http://localhost:3002`. It is not automatically the URL used by browser requests. |
| `VITE_DEV_PORT` | Development | Local Vite port, normally `3000`. |
| `VITE_API_MODE` | Yes | API behavior. The current application normally uses `api`; `mock` disables the base URL. |
| `VITE_API_BASE` | No | Optional browser-visible API base URL. Leave empty when using the same-origin Vite proxy. |
| `VITE_API_PREFIX` | No | API path prefix; defaults to `/api`. |
| `VITE_APP_NAME` | No | Display/build-time application name; defaults to `App`. |

After changing configuration, restart Vite.

## Checks, tests, and build

```bash
npm run lint
npm run test:run
npm run build
```

Additional commands:

```bash
npm run test:coverage
npm run preview
npm run test:e2e
npm run test:e2e:open
```

Unit tests run with Vitest. Cypress expects the frontend on port `3000` and a dedicated local test API on port `3001`, started with test endpoints enabled. Cypress cleanup routes delete test data, so never run E2E tests against production or a shared database.

### Verification status

On 6 November 2026, a dependency-free copy was validated with `npm ci`: the production build completed and all 38 unit tests passed. `npm run lint` still reports 80 errors and 21 warnings in existing application code; these are not hidden or treated as a successful check. E2E tests were not run because no isolated API/database environment was available.

## Common problems

- **The UI loads but requests fail:** check that the API responds at `http://localhost:3002/health` and that `VITE_API_URL` uses the same port.
- **Proxy or CORS errors:** use the Vite proxy for local development, or include the frontend origin in the API's `CORS_ALLOWED_ORIGINS`.
- **Port already in use:** change `VITE_DEV_PORT`, restart Vite, and update Cypress configuration if you run E2E tests.
- **Unexpected API URL:** `VITE_API_URL` configures the development proxy; `VITE_API_BASE` configures the client-visible base URL.
- **Environment changes have no effect:** confirm the active Vite mode (`dev` or `prod`) and restart the process.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. User-facing changes must keep the English and Spanish translations in sync.

## License

Copyright © 2025 Laura Schörken. The source code is available under the [MIT License](LICENSE). See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for bundled dependencies. Product names, images, recipes, and third-party material may have separate rights.
