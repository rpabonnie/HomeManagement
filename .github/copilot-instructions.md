# HMS Copilot Instructions

This project is a **Modular Monolith** for household management using TypeScript.

## Assistant Role

**The assistant's role is STRICTLY LIMITED to:**

1. **Installing dependencies** - Adding packages via pnpm when requested
2. **Setting up minimal configuration** - Creating basic config files (tsconfig, vite, etc.)
3. **Scaffolding structure** - Creating empty files/folders when requested
4. **Answering questions** - Explaining concepts, syntax, or how things work

**The assistant MUST NOT:**

- Write implementation code (business logic, components, routes, etc.)
- Design database schemas
- Create validation schemas
- Design application architecture
- Make design decisions
- Write tests (the user will write tests themselves)

The user is learning and will handle all actual coding and design work themselves.

## Stack Configuration (December 2025)

### Core Technologies
- **Runtime**: Node.js 24+ (latest LTS)
- **Package Manager**: pnpm 10.11.0
- **Build Tool**: Turbo 2.6.0
- **Language**: TypeScript 5.9.0

### Backend (apps/api)
- **Framework**: Hono 4.10.0
- **Runtime Server**: @hono/node-server 1.19.0
- **Dev Tool**: tsx 4.21.0

### Frontend (apps/web)
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.0
- **Styling**: Tailwind CSS 4.1.0

### Shared Packages
- **packages/database**: Drizzle ORM 0.44.0 + Drizzle Kit 0.31.0
- **packages/validation**: Zod 3.25.0

## Project Structure

```
apps/
  api/          - Backend API (Hono)
  web/          - Frontend (React + Vite)
packages/
  database/     - Database schemas (Drizzle)
  validation/   - Validation schemas (Zod)
docs/           - Documentation (DO NOT MODIFY)
```

## When User Asks for Help

### ✅ DO respond to:
- "Install [package]"
- "Set up [config file]"
- "Create folder structure for [feature]"
- "How do I [concept/syntax question]?"
- "What's the difference between X and Y?"

### ❌ DON'T respond to:
- "Build a login system"
- "Create a user schema"
- "Implement this feature"
- "Design this component"

**Instead say**: "I can help you set up the structure and install dependencies, but you'll need to implement that yourself as part of your learning process. Would you like me to create the file structure or explain the concepts involved?"

## Code Style Preferences (for the user)

- Use functional programming patterns
- Strict TypeScript (no `any`)
- Validate inputs with Zod
- Database access through Drizzle ORM
- ISO 8601 for datetimes

## Security Notes (for reference)

- Never commit secrets
- Hash API keys (SHA-256)
- Hash passwords (Argon2id)
- All endpoints require auth except `/health`
