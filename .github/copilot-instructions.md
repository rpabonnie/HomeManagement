# HMS Copilot Instructions

This project is a **Modular Monolith** for household management.

## TDD Philosophy (MANDATORY)

This project follows **Test-Driven Development (TDD)**. When implementing any requirement:

### Workflow

1. **Clarify First** - If the requirement is too vague to write specific tests, ask the user for clarification before proceeding
2. **Plan Tests** - Outline the test cases needed (happy path, edge cases, error cases)
3. **Write Tests First** - Implement tests in this order:
   - Happy path tests (expected behavior)
   - Upper edge case tests (boundary conditions, max values)
   - Lower edge case tests (boundary conditions, min values, empty inputs)
   - Error/exception tests
4. **Minimal Implementation** - Write the minimum code necessary to make tests pass (no premature optimization)
5. **Refactor** - Once all tests pass, refactor to production-ready code while keeping tests green

### Rules

- **Never write production code without tests first**
- **Do NOT make massive code changes** - break large features into small, testable increments
- **If a requirement is ambiguous**, stop and ask for clarification
- **Each test should test ONE thing** - keep tests focused and isolated
- **Tests must be deterministic** - no flaky tests allowed

## Architecture Rules

1. **Do NOT suggest microservices patterns** - this is intentionally a monolith
2. **Use Zod for all data validation** - schemas live in `packages/validation`
3. **All database access must go through `packages/database`** - never raw SQL in app code
4. **Prefer functional programming patterns** over OOP
5. **Use strict TypeScript** - no `any` types allowed

## Code Style

- Use `hono` for API routes, not Express
- Use `drizzle-orm` for database operations
- Validate all inputs with Zod schemas before processing
- Keep business logic in pure functions when possible
- Use ISO 8601 for all datetime strings

## Security

- Never commit secrets or `.env` files
- API keys must be hashed before storage (SHA-256)
- Passwords must use Argon2id
- All endpoints require authentication except `/health`

## File Organization

- `apps/api/src/routes/` - API route handlers
- `apps/api/src/middleware/` - Hono middleware
- `apps/web/src/components/` - React components
- `packages/validation/src/` - Zod schemas (source of truth)
- `packages/database/src/` - Drizzle schemas and client
- `**/__tests__/` - Test files (colocated with source)
