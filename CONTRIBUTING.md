# Contributing to MealAgenda Web

Thank you for helping improve MealAgenda. English and Spanish are both welcome in issues and pull requests.

## Before starting

- Search existing issues before reporting a bug or proposing a feature.
- Agree on the scope of features and behavior changes in an issue first.
- Create a small branch from `develop`, for example `fix/ingredient-import-search`.
- If you do not have write access, use a fork and open the pull request against this repository's `develop` branch.
- Keep unrelated refactors out of the same pull request.

## Local setup and checks

Follow [README.md](README.md) or [README.es.md](README.es.md). Use synthetic data and local, isolated services only.

Before submitting a pull request, run:

```bash
npm run lint
npm run test:run
npm run build
```

Run Cypress only with the documented local E2E environment. Never point tests or cleanup endpoints at production or shared data.

Follow the existing TypeScript, SCSS, container/component, and import-order conventions. Add or update both English and Spanish translations for user-facing text. Add regression coverage when behavior changes.

## Bug reports

Include clear reproduction steps, expected and actual results, the affected version or commit, relevant browser/operating-system details, and redacted logs or screenshots when useful.

Do not include passwords, tokens, private configuration, database dumps, private exports, or personal recipes without the owner's permission.

## Pull request checklist

- [ ] The change is focused and links its issue.
- [ ] Tests cover changed behavior where practical.
- [ ] I listed the checks I actually ran and disclosed failures or skipped checks.
- [ ] Documentation and English/Spanish translations are updated.
- [ ] UI changes include redacted mobile/desktop and light/dark evidence when relevant.
- [ ] No credentials, private configuration, generated coverage, or real user data are committed.

## Security reports

Do not disclose a suspected vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md) and use GitHub's private vulnerability reporting.

