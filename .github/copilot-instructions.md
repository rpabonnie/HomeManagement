# HMS Copilot Instructions

This project is a **Modular Monolith** for household management.

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
