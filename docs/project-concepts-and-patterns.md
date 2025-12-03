# Household Management System: Concepts, Patterns, and Technology Guide

**Document Version:** 1.0  
**Date:** December 3, 2025  
**Purpose:** Educational guide to understand the architectural decisions, patterns, and technologies used in this project

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Architectural Concepts](#core-architectural-concepts)
3. [The Technology Stack Explained](#the-technology-stack-explained)
4. [Design Patterns and Principles](#design-patterns-and-principles)
5. [Project Structure Deep Dive](#project-structure-deep-dive)
6. [Development Workflow](#development-workflow)
7. [Learning Resources](#learning-resources)

---

## Introduction

### What is the Household Management System?

The Household Management System (HMS) is a **personal application** designed to help manage two key aspects of household life:

1. **Budget Planning** - Track expenses, debts, and subscriptions with "what-if" scenario planning
2. **Generator Maintenance** - Log runtime hours and get automated maintenance reminders

### Why This Project Exists

This project serves multiple purposes:

- **Practical Use**: Solve real-world household management needs
- **Learning Exercise**: Demonstrate modern web development practices
- **Portfolio Piece**: Showcase full-stack TypeScript development skills
- **Experimentation Platform**: Try new technologies in a real-world context

---

## Core Architectural Concepts

### 1. The Modular Monolith Pattern

#### What is a Modular Monolith?

A **modular monolith** is a single application that is internally organized into distinct, loosely-coupled modules. Think of it as a house with separate rooms - it's one building, but each room has a specific purpose and its own boundaries.

```
┌─────────────────────────────────────┐
│      Modular Monolith (HMS)         │
│  ┌──────────┐      ┌─────────────┐  │
│  │  Budget  │      │  Generator  │  │
│  │  Module  │      │   Module    │  │
│  └──────────┘      └─────────────┘  │
│         │                  │         │
│  ┌──────────────────────────────┐   │
│  │    Shared Infrastructure     │   │
│  │  (Database, Auth, Validation)│   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### Why NOT Microservices?

Many modern projects jump straight to microservices, but for HMS, a monolith makes more sense:

**Advantages of Our Monolith:**
- ✅ **Simpler Deployment** - One container to deploy, not dozens
- ✅ **Easier Development** - No distributed system complexity
- ✅ **Better Performance** - No network calls between modules
- ✅ **Shared Code** - Reuse validation, types, and utilities
- ✅ **Easier Testing** - Test the whole system together
- ✅ **Lower Cost** - One server instead of many

**When Microservices Make Sense:**
- ❌ Large teams working independently
- ❌ Different scaling needs for different features
- ❌ Different technology requirements per service
- ❌ Need to deploy features independently

**For a personal household app with one developer, a monolith is the right choice.**

#### The "Pack and Redeploy" Philosophy

A key requirement for HMS is **portability** - the ability to easily move the application between:
- Your local machine
- A Raspberry Pi at home
- A cloud provider (Azure, AWS, etc.)
- A different cloud provider later

This is achieved by:
1. **Containerization** - Everything runs in Docker
2. **Minimal Dependencies** - SQLite instead of PostgreSQL/MySQL
3. **Configuration via Environment Variables** - No hardcoded settings
4. **Single Artifact** - One docker-compose file to deploy everything

### 2. Monorepo Organization

#### What is a Monorepo?

A **monorepo** is a single Git repository that contains multiple related projects. Our structure looks like this:

```
household-management/
├── apps/
│   ├── api/          # Backend REST API
│   └── web/          # Frontend PWA
├── packages/
│   ├── database/     # Database schemas and client
│   └── validation/   # Shared validation rules
```

#### Why Use a Monorepo?

**Benefits:**
1. **Shared Code** - The `packages/` folder contains code used by both frontend and backend
2. **Type Safety** - Frontend and backend share TypeScript types automatically
3. **Atomic Commits** - One commit can update API and UI together
4. **Easier Refactoring** - Change a validation rule in one place, see all impacts
5. **Simplified Versioning** - No need to publish and version shared packages

**Tools We Use:**
- **pnpm Workspaces** - Manages dependencies across packages
- **Turbo** - Builds packages in the correct order and caches results

#### The Package Dependency Graph

```
┌─────────┐
│   web   │ (React app)
└────┬────┘
     │ uses
     ▼
┌────────────┐
│ validation │ (Zod schemas)
└────────────┘
     ▲
     │ uses
┌────┴────┐
│   api   │ (Hono server)
└────┬────┘
     │ uses
     ▼
┌──────────┐
│ database │ (Drizzle schemas)
└──────────┘
```

This graph shows that:
- The web app depends on validation schemas
- The API depends on both validation and database packages
- Packages can be built independently and reused

---

## The Technology Stack Explained

### Backend Stack

#### 1. Hono - The Web Framework

**What is Hono?**

[Hono](https://hono.dev/) is a modern, lightweight web framework for building REST APIs. Think of it as a simpler, faster alternative to Express.js.

**Why Hono?**
- ⚡ **Blazing Fast** - One of the fastest JavaScript frameworks
- 📦 **Tiny Size** - ~12KB, much smaller than Express
- 🎯 **TypeScript First** - Excellent type inference out of the box
- 🌐 **Edge Compatible** - Works on Cloudflare Workers, Deno, Node.js
- 🧩 **Minimal API** - Easy to learn, similar to Express

**Example:**
```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

export default app
```

**What's Different from Express?**
- More lightweight
- Better TypeScript support
- Uses `c` (context) instead of `req, res`
- Can run on edge runtimes (not just Node.js)

#### 2. Drizzle ORM - Database Layer

**What is Drizzle?**

[Drizzle ORM](https://orm.drizzle.team/) is a TypeScript-first ORM (Object-Relational Mapping) that lets you interact with databases using JavaScript objects instead of SQL strings.

**Why Drizzle?**
- 🎯 **Type-Safe** - Catches database errors at compile time
- 🪶 **Lightweight** - Much smaller than TypeORM or Prisma
- 🚀 **Fast** - Minimal overhead, close to raw SQL performance
- 📝 **SQL-Like** - Write queries that look like SQL
- 🔧 **Schema Migrations** - Automatic migration generation

**Example:**
```typescript
// Define a table schema
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Query it with full type safety
const allUsers = await db.select().from(users)
// TypeScript knows: allUsers is Array<{ id: number, name: string, ... }>
```

**What's an ORM?**

An ORM is a tool that maps database tables to JavaScript objects:

```
Database Table (SQL)         TypeScript Object
┌──────────────────┐        ┌─────────────────┐
│ users            │   ←→   │ const users = { │
│ - id (integer)   │        │   id: number    │
│ - name (text)    │        │   name: string  │
│ - email (text)   │        │   email: string │
└──────────────────┘        └─────────────────┘
```

**Why SQLite?**

For this project, we use **SQLite** as the database:
- 📁 **File-Based** - Just one `.db` file, easy to backup
- 🚀 **No Server Needed** - No PostgreSQL/MySQL to install
- 🔒 **Reliable** - Battle-tested, used by millions of apps
- 📦 **Portable** - Copy the file, move the database
- 🎯 **Perfect for Single-User Apps** - Great for personal projects

#### 3. Zod - Validation and Type Safety

**What is Zod?**

[Zod](https://zod.dev/) is a TypeScript-first schema validation library. It lets you define the "shape" of data and validate it at runtime.

**Why Zod?**
- ✅ **Runtime Safety** - Catch invalid data before it breaks your app
- 🎯 **TypeScript Integration** - Automatic type inference
- 🪶 **Zero Dependencies** - Tiny bundle size
- 🔧 **Composable** - Build complex schemas from simple ones
- 📝 **Great Errors** - Helpful error messages for debugging

**Example:**
```typescript
import { z } from 'zod'

// Define a schema
const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

// TypeScript now knows the type!
type User = z.infer<typeof UserSchema>
// User = { name: string; email: string; age: number }

// Validate incoming data
const result = UserSchema.safeParse(req.body)
if (!result.success) {
  // Data is invalid, show errors
  return c.json({ errors: result.error }, 400)
}
// Data is valid and TypeScript knows it!
const user = result.data
```

**Why This Matters:**

In JavaScript, you might do:
```javascript
if (typeof user.name !== 'string') { ... }
if (user.age < 0 || user.age > 150) { ... }
// This is tedious and error-prone!
```

With Zod:
```typescript
UserSchema.parse(user)
// One line! Validates everything!
```

### Frontend Stack

#### 4. React - UI Framework

**What is React?**

[React](https://react.dev/) is a library for building user interfaces using reusable components.

**Why React?**
- 📚 **Huge Ecosystem** - Millions of libraries and resources
- 🎓 **Transferable Skills** - Used by most companies
- ⚡ **Fast** - Virtual DOM for efficient updates
- 🧩 **Component-Based** - Break UI into reusable pieces
- 🔄 **Declarative** - Describe what you want, React handles how

**Key Concepts:**

1. **Components** - Reusable UI building blocks
```typescript
function BudgetCard({ title, amount }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>${amount}</p>
    </div>
  )
}
```

2. **State** - Data that can change
```typescript
const [total, setTotal] = useState(0)
```

3. **Props** - Pass data to components
```typescript
<BudgetCard title="Rent" amount={1200} />
```

#### 5. Vite - Build Tool

**What is Vite?**

[Vite](https://vitejs.dev/) is a modern build tool that makes development incredibly fast.

**Why Vite?**
- ⚡ **Instant Server Start** - No bundling in development
- 🔥 **Hot Module Replacement** - See changes instantly
- 📦 **Optimized Builds** - Fast production bundles
- 🎯 **Simple Config** - Less complex than Webpack

**What Vite Does:**

```
Development:                Production:
┌──────────────┐          ┌──────────────┐
│   .tsx files │          │   .tsx files │
│   .css files │   Vite   │   .css files │
│   images     │   ──→    │   images     │
└──────────────┘          └──────────────┘
       │                         │
       ▼                         ▼
  Dev Server                  Optimized
  (instant)                   Bundle
```

#### 6. Tailwind CSS - Styling

**What is Tailwind?**

[Tailwind CSS](https://tailwindcss.com/) is a utility-first CSS framework.

**Traditional CSS:**
```css
/* styles.css */
.card {
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```
```html
<div class="card">...</div>
```

**Tailwind CSS:**
```html
<div class="p-4 bg-white rounded-lg shadow-md">...</div>
```

**Why Tailwind?**
- 🚀 **Fast Development** - No context switching between files
- 📦 **Small Bundles** - Only includes used styles
- 🎨 **Consistent Design** - Predefined spacing, colors
- 📱 **Responsive** - Easy mobile-first design

#### 7. PWA (Progressive Web App)

**What is a PWA?**

A PWA is a web app that works like a native mobile app.

**Features:**
- 📱 **Install on Phone** - Add to home screen
- 📡 **Works Offline** - Cache data locally
- 🔔 **Push Notifications** - (Future feature)
- ⚡ **Fast Loading** - Service workers cache assets

**Why PWA for HMS?**
- No app store submission needed
- Works on iOS and Android
- Easy updates (just refresh)
- Smaller download size than native apps

### Build and Development Tools

#### 8. TypeScript - Type Safety

**What is TypeScript?**

TypeScript is JavaScript with **types** - you describe what kind of data variables hold.

**JavaScript:**
```javascript
function add(a, b) {
  return a + b
}
add(5, "10") // "510" - Oops! String concatenation
```

**TypeScript:**
```typescript
function add(a: number, b: number): number {
  return a + b
}
add(5, "10") // ❌ Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

**Why TypeScript?**
- 🐛 **Catch Bugs Early** - Before running code
- 📝 **Better Documentation** - Types are self-documenting
- 🧠 **Better IDE Support** - Autocomplete and refactoring
- 🔒 **Safer Refactoring** - Know what breaks when you change code

**This Project is TypeScript-First:**
- All code is TypeScript (`.ts`, `.tsx` files)
- Strict mode enabled (`strict: true`)
- No `any` types allowed

#### 9. Turbo - Monorepo Build System

**What is Turbo?**

[Turborepo](https://turbo.build/) is a build system for monorepos that makes builds fast.

**How Turbo Helps:**

1. **Parallel Execution** - Build multiple packages at once
2. **Dependency Awareness** - Build in the right order
3. **Caching** - Skip rebuilding unchanged code
4. **Remote Caching** - Share cache across team (optional)

**Example:**
```bash
pnpm turbo build
```

Turbo sees:
1. `packages/validation` has no dependencies → build first
2. `packages/database` depends on nothing → build in parallel
3. `apps/api` depends on database and validation → build after both
4. `apps/web` depends on validation → build after validation

#### 10. pnpm - Package Manager

**What is pnpm?**

[pnpm](https://pnpm.io/) is a faster, more disk-efficient alternative to npm/yarn.

**Why pnpm?**
- 💾 **Saves Disk Space** - Deduplicates packages globally
- ⚡ **Faster Installs** - Uses hard links instead of copying
- 🔒 **Strict** - Prevents phantom dependencies
- 🏢 **Workspace Support** - Perfect for monorepos

**Comparison:**
```
npm install:  📦📦📦 (3 copies of lodash)
yarn install: 📦📦📦 (3 copies of lodash)
pnpm install: 📦 → 🔗 → 🔗 (1 copy, 2 hard links)
```

---

## Design Patterns and Principles

### 1. Test-Driven Development (TDD)

**What is TDD?**

TDD is a development approach where you write tests **before** writing code.

**The TDD Cycle:**

```
1. 🔴 RED: Write a failing test
         ↓
2. 🟢 GREEN: Write minimal code to pass
         ↓
3. 🔵 REFACTOR: Clean up the code
         ↓
    (Repeat)
```

**Example:**

```typescript
// 1. Write the test first (RED)
describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
// Test fails: "add is not defined"

// 2. Write minimal code (GREEN)
function add(a: number, b: number): number {
  return a + b
}
// Test passes!

// 3. Refactor if needed
// (Code is already simple, no refactor needed)
```

**Why TDD?**
- ✅ **Better Design** - Forces you to think about API before implementation
- 🐛 **Fewer Bugs** - Catch issues immediately
- 📝 **Living Documentation** - Tests show how code should be used
- 🔒 **Safe Refactoring** - Know immediately if you break something

**HMS Testing Philosophy:**
- Write tests for all business logic
- Test happy path + edge cases + errors
- Keep tests focused (one concept per test)
- Tests must be deterministic (no flaky tests)

### 2. Domain-Driven Design (Lite)

**What is DDD?**

Domain-Driven Design organizes code around business concepts (the "domain").

**HMS Domains:**
- **Budget Domain** - Expenses, debts, income, scenarios
- **Generator Domain** - Runtime logs, maintenance schedules

**Code Organization:**
```
apps/api/src/
├── routes/
│   ├── budget/        # Budget domain endpoints
│   └── generator/     # Generator domain endpoints
├── middleware/        # Shared cross-cutting concerns
└── index.ts          # Application entry point
```

**Key Principle:** Keep domain logic separate from infrastructure (HTTP, database, etc.)

### 3. Separation of Concerns

**What is SoC?**

Different parts of the application handle different responsibilities.

**Layers in HMS:**

```
┌─────────────────────────────┐
│  Presentation Layer (React) │ ← UI components
├─────────────────────────────┤
│  API Layer (Hono)           │ ← HTTP routes, validation
├─────────────────────────────┤
│  Business Logic             │ ← Domain rules and calculations
├─────────────────────────────┤
│  Data Layer (Drizzle)       │ ← Database queries
└─────────────────────────────┘
```

**Example:**

```typescript
// ❌ Bad: Everything mixed together
app.post('/api/expenses', (c) => {
  const body = c.req.body
  if (!body.amount || body.amount < 0) return c.json({ error: 'Invalid' }, 400)
  db.insert({ amount: body.amount, name: body.name })
  return c.json({ success: true })
})

// ✅ Good: Separated concerns
app.post('/api/expenses', async (c) => {
  // 1. Validation layer
  const result = ExpenseSchema.safeParse(await c.req.json())
  if (!result.success) return c.json({ errors: result.error }, 400)
  
  // 2. Business logic layer
  const expense = createExpense(result.data)
  
  // 3. Data layer
  await expenseRepository.save(expense)
  
  return c.json(expense)
})
```

### 4. Type Safety Everywhere

**What is Type Safety?**

Type safety means using TypeScript's type system to catch errors at compile time.

**HMS Type Safety Strategy:**

1. **Schema Definitions** - Zod schemas are the source of truth
```typescript
// packages/validation/src/expense.ts
export const ExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
})
```

2. **Automatic Type Inference**
```typescript
type Expense = z.infer<typeof ExpenseSchema>
// TypeScript knows: { amount: number; description: string }
```

3. **Database Types Match Schema**
```typescript
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey(),
  amount: real('amount').notNull(),      // ← matches Zod
  description: text('description').notNull(), // ← matches Zod
})
```

4. **Frontend Uses Same Types**
```typescript
import { ExpenseSchema } from '@hms/validation'
// Frontend and backend share the exact same validation!
```

**The Full Type Flow:**

```
Zod Schema (validation package)
      ↓
TypeScript Types (auto-generated)
      ↓
┌─────────────────┬─────────────────┐
│   Frontend      │    Backend      │
│   (uses types)  │    (uses types) │
└─────────────────┴─────────────────┘
      ↓                   ↓
   Database Types    API Routes
```

### 5. Functional Programming Patterns

**What is FP?**

Functional Programming emphasizes pure functions and immutability.

**Key Concepts Used in HMS:**

1. **Pure Functions** - Same input = same output, no side effects
```typescript
// ✅ Pure
function calculateTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0)
}

// ❌ Impure (modifies external state)
let total = 0
function addToTotal(amount: number) {
  total += amount  // Side effect!
}
```

2. **Immutability** - Don't modify data, create new copies
```typescript
// ❌ Mutation
expenses.push(newExpense)

// ✅ Immutability
const updatedExpenses = [...expenses, newExpense]
```

3. **Composition** - Build complex functions from simple ones
```typescript
const activeExpenses = expenses
  .filter(e => e.active)
  .map(e => e.amount)
  .reduce((sum, amount) => sum + amount, 0)
```

**Why FP?**
- 🐛 Easier to test (pure functions)
- 🔍 Easier to reason about (no hidden state)
- 🔄 Easier to parallelize (no shared state)

### 6. Configuration as Code

**What is IaC?**

Infrastructure as Code means defining infrastructure in version-controlled files.

**HMS Examples:**

1. **Docker Compose** - Entire deployment defined
```yaml
version: '3.8'
services:
  hms-api:
    build: ./apps/api
    ports: ["3000:3000"]
    volumes:
      - hms-data:/data
```

2. **Environment Variables** - No hardcoded config
```typescript
const config = {
  port: process.env.PORT ?? 3000,
  dbPath: process.env.DATABASE_URL ?? 'file:./hms.db',
  jwtSecret: process.env.JWT_SECRET,
}
```

3. **TypeScript Config** - Build settings in code
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022"
  }
}
```

**Benefits:**
- ✅ Version controlled (Git tracks changes)
- ✅ Reproducible (same config = same result)
- ✅ Documented (config explains itself)

---

## Project Structure Deep Dive

### Directory Layout

```
HomeManagement/
├── .github/               # GitHub Actions and configs
│   └── copilot-instructions.md  # AI coding assistant rules
├── apps/                  # Applications (deployable units)
│   ├── api/              # Backend REST API
│   │   ├── src/
│   │   │   ├── routes/   # HTTP route handlers
│   │   │   ├── middleware/  # Request/response processors
│   │   │   └── index.ts  # App entry point
│   │   ├── Dockerfile    # Container definition
│   │   └── package.json
│   └── web/              # Frontend PWA
│       ├── src/
│       │   ├── components/  # React UI components
│       │   ├── App.tsx      # Root component
│       │   └── main.tsx     # Entry point
│       └── package.json
├── packages/             # Shared libraries
│   ├── database/         # Drizzle ORM schemas
│   │   ├── src/
│   │   │   ├── schema/   # Table definitions
│   │   │   └── client.ts # Database connection
│   │   └── drizzle.config.ts  # Migration config
│   └── validation/       # Zod schemas
│       ├── src/
│       │   └── schemas/  # Validation rules
│       └── package.json
├── docs/                 # Documentation
│   ├── initial-research.md
│   ├── feasibility-analysis-and-architecture.md
│   ├── security-architecture.md
│   └── project-concepts-and-patterns.md (this file!)
├── docker-compose.yml    # Deployment definition
├── turbo.json           # Build pipeline config
├── pnpm-workspace.yaml  # Monorepo workspace config
├── tsconfig.base.json   # Shared TypeScript config
└── package.json         # Root package (scripts, workspaces)
```

### Key Files Explained

#### 1. `package.json` (Root)

```json
{
  "scripts": {
    "dev": "turbo run dev",      // Start all dev servers
    "build": "turbo run build",  // Build all packages
    "db:generate": "...",        // Generate migrations
    "db:migrate": "..."          // Run migrations
  },
  "engines": {
    "node": ">=24.0.0"          // Require Node 24+
  }
}
```

**What it does:**
- Defines workspace-wide scripts
- Specifies Node.js version requirement
- Manages root-level dependencies (Turbo, TypeScript)

#### 2. `turbo.json`

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],     // Build dependencies first
      "outputs": ["dist/**"]       // Cache these folders
    },
    "dev": {
      "cache": false,              // Don't cache dev mode
      "persistent": true           // Keep running
    }
  }
}
```

**What it does:**
- Defines build task dependencies
- Configures caching strategy
- Optimizes build performance

#### 3. `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'      # All folders in apps/
  - 'packages/*'  # All folders in packages/
```

**What it does:**
- Tells pnpm where to find workspace packages
- Enables `@hms/*` package references
- Links packages together during install

#### 4. `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "strict": true,              // Enable all strict checks
    "target": "ES2022",          // Use modern JavaScript
    "module": "ESNext",          // Use ES modules
    "noUnusedLocals": true       // Error on unused variables
  }
}
```

**What it does:**
- Shared TypeScript configuration
- Extended by all packages
- Enforces strict type checking

#### 5. `docker-compose.yml`

```yaml
services:
  hms-api:
    build: ./apps/api
    ports: ["3000:3000"]
    volumes:
      - hms-data:/data           # Persist database
```

**What it does:**
- Defines production deployment
- Maps ports and volumes
- Sets environment variables

---

## Development Workflow

### Setting Up the Project

**Step 1: Clone and Install**
```bash
git clone https://github.com/rpabonnie/HomeManagement.git
cd HomeManagement
pnpm install  # Install all dependencies
```

**What happens:**
- pnpm reads `pnpm-workspace.yaml`
- Installs dependencies for all packages
- Links workspace packages together

**Step 2: Set Up Environment**
```bash
cp .env.example .env
# Edit .env with your values
```

**Step 3: Generate Database**
```bash
pnpm db:generate  # Creates migration files
pnpm db:migrate   # Runs migrations
```

**What happens:**
- Drizzle reads `packages/database/src/schema/`
- Generates SQL migration files
- Applies migrations to SQLite database

**Step 4: Start Development**
```bash
pnpm dev
```

**What happens:**
- Turbo starts all dev tasks in parallel
- API server runs on `http://localhost:3000`
- Web dev server runs on `http://localhost:5173`
- TypeScript compilers watch for changes

### Making Changes

**Adding a New Feature (TDD Style):**

1. **Write the test first**
```typescript
// apps/api/src/routes/budget/__tests__/expense.test.ts
describe('POST /api/expenses', () => {
  it('should create a new expense', async () => {
    const response = await app.request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({
        amount: 50.00,
        description: 'Groceries',
      }),
    })
    expect(response.status).toBe(201)
  })
})
```

2. **Run the test (it fails)**
```bash
pnpm test
# ❌ Test fails: Route not implemented
```

3. **Implement the feature**
```typescript
// apps/api/src/routes/budget/expense.ts
app.post('/api/expenses', async (c) => {
  const data = await c.req.json()
  const expense = await db.insert(expenses).values(data)
  return c.json(expense, 201)
})
```

4. **Run the test again (it passes)**
```bash
pnpm test
# ✅ Test passes!
```

5. **Refactor**
```typescript
// Add validation
const result = ExpenseSchema.safeParse(data)
if (!result.success) {
  return c.json({ errors: result.error }, 400)
}
```

### Building and Deploying

**Build for Production:**
```bash
pnpm build
```

**What happens:**
1. Turbo builds `packages/validation` first
2. Then builds `packages/database`
3. Then builds `apps/api` (depends on both)
4. Finally builds `apps/web` (depends on validation)

**Deploy with Docker:**
```bash
docker-compose up -d
```

**What happens:**
1. Builds Docker image for API
2. Creates volume for database
3. Starts container with environment variables
4. API is available at `http://localhost:3000`

---

## Learning Resources

### Official Documentation

| Technology | Documentation | Getting Started |
|------------|---------------|-----------------|
| **Hono** | https://hono.dev | [Quickstart](https://hono.dev/getting-started/basic) |
| **Drizzle ORM** | https://orm.drizzle.team | [Tutorial](https://orm.drizzle.team/docs/quick-sqlite/node) |
| **Zod** | https://zod.dev | [Basic Usage](https://zod.dev/?id=basic-usage) |
| **React** | https://react.dev | [Learn React](https://react.dev/learn) |
| **Vite** | https://vitejs.dev | [Guide](https://vitejs.dev/guide/) |
| **Tailwind CSS** | https://tailwindcss.com | [Docs](https://tailwindcss.com/docs) |
| **TypeScript** | https://typescriptlang.org | [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) |
| **pnpm** | https://pnpm.io | [Motivation](https://pnpm.io/motivation) |
| **Turbo** | https://turbo.build | [Handbook](https://turbo.build/repo/docs/handbook) |

### Learning Paths

#### For Beginners

If you're new to web development, learn in this order:

1. **JavaScript Fundamentals** (1-2 weeks)
   - Variables, functions, arrays, objects
   - Promises and async/await
   - ES6+ features (arrow functions, destructuring, spread)

2. **TypeScript Basics** (1 week)
   - Type annotations
   - Interfaces and types
   - Generics (basic)

3. **React Fundamentals** (2 weeks)
   - Components and JSX
   - Props and state
   - Hooks (useState, useEffect)

4. **Backend Basics** (1-2 weeks)
   - HTTP methods (GET, POST, PUT, DELETE)
   - REST API concepts
   - JSON and data formats

5. **Database Basics** (1 week)
   - SQL fundamentals
   - Tables, columns, relationships
   - CRUD operations

#### For Intermediate Developers

If you know JavaScript/TypeScript:

1. **Modern React** (React 19 features)
   - Server Components (not used in HMS, but good to know)
   - New hooks
   - Concurrent features

2. **API Design**
   - RESTful principles
   - Request/response patterns
   - Error handling

3. **Type-Safe Development**
   - End-to-end type safety
   - Schema-driven development
   - Runtime validation

4. **Monorepo Patterns**
   - Workspace management
   - Shared packages
   - Build optimization

#### For Advanced Developers

Explore deeper topics:

1. **Advanced TypeScript**
   - Advanced generics
   - Conditional types
   - Type inference magic

2. **Performance Optimization**
   - Bundle analysis
   - Code splitting
   - Caching strategies

3. **DevOps**
   - Docker multi-stage builds
   - CI/CD pipelines
   - Monitoring and logging

4. **Architecture Patterns**
   - Clean Architecture
   - Hexagonal Architecture
   - Event-driven design

### Books and Courses

**Books:**
- "Learning TypeScript" by Josh Goldberg
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "The Pragmatic Programmer" by Hunt & Thomas

**Courses:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Official, free
- [React.dev Learn](https://react.dev/learn) - Official, free
- [Total TypeScript](https://www.totaltypescript.com/) - Advanced TypeScript

### Hands-On Learning

**Experiment with HMS:**

1. **Add a New Feature**
   - Add a "categories" field to expenses
   - Practice Zod validation and Drizzle migrations

2. **Improve the UI**
   - Add a dark mode toggle
   - Create a chart component for budget visualization

3. **Extend the API**
   - Add pagination to expense lists
   - Implement search and filtering

4. **Optimize Performance**
   - Add caching headers
   - Implement React.memo for expensive components

5. **Add Tests**
   - Write unit tests for utility functions
   - Add integration tests for API endpoints

---

## Key Takeaways

### Architecture Decisions Summary

| Decision | Why |
|----------|-----|
| **Modular Monolith** | Simpler for single developer, easier deployment |
| **Monorepo** | Share code, types, and tools across packages |
| **SQLite** | File-based, portable, perfect for single-user apps |
| **TypeScript** | Catch bugs early, better IDE support |
| **Hono** | Fast, modern, TypeScript-first |
| **Drizzle** | Type-safe, lightweight, SQL-like |
| **Zod** | Runtime validation + type inference |
| **React** | Industry standard, huge ecosystem |
| **Vite** | Fast dev server, optimized builds |
| **Docker** | Portable, consistent deployments |

### Design Patterns Summary

| Pattern | Purpose | Benefit |
|---------|---------|---------|
| **TDD** | Write tests first | Better design, fewer bugs |
| **Type Safety** | Types everywhere | Catch errors at compile time |
| **Separation of Concerns** | Layer architecture | Easier to maintain and test |
| **Functional Programming** | Pure functions | Easier to reason about and test |
| **Configuration as Code** | Version-controlled config | Reproducible, documented |

### The Big Picture

This project demonstrates **modern full-stack development** using:

1. **Type-Safe Development** - From database to UI
2. **Developer Experience** - Fast builds, instant feedback
3. **Production Ready** - Tests, Docker, migrations
4. **Maintainable** - Clear structure, documented decisions
5. **Portable** - Run anywhere Docker runs

The goal is not just to build a household management app, but to showcase **best practices** in:
- Architecture design
- Code organization
- Type safety
- Testing
- Deployment

---

## Conclusion

The Household Management System is more than just a budget tracker - it's a demonstration of modern web development practices applied to a real-world problem.

By choosing a **modular monolith** architecture with a **type-safe** technology stack, we've created an application that is:

- ✅ **Easy to develop** - Great DX with Vite, TypeScript, and pnpm
- ✅ **Easy to deploy** - One Docker container
- ✅ **Easy to maintain** - Tests, types, and clear structure
- ✅ **Easy to extend** - Well-organized, documented code
- ✅ **Easy to move** - Portable between environments

The technologies chosen (Hono, Drizzle, Zod, React, Vite, Tailwind) represent the **modern JavaScript ecosystem** at its best - lightweight, fast, type-safe, and developer-friendly.

Whether you're learning web development or building your next side project, the patterns and practices in HMS provide a solid foundation for creating production-ready applications.

**Happy coding! 🚀**

---

## Appendix: Quick Reference

### Common Commands

```bash
# Development
pnpm dev                # Start all dev servers
pnpm build             # Build all packages
pnpm typecheck         # Check TypeScript types
pnpm lint              # Run linters

# Database
pnpm db:generate       # Generate migrations
pnpm db:migrate        # Run migrations
pnpm db:studio         # Open Drizzle Studio GUI

# Deployment
docker-compose up -d   # Start in production mode
docker-compose logs -f # View logs
docker-compose down    # Stop containers
```

### Project Glossary

- **Monolith** - Single application with all features
- **Monorepo** - Single repository with multiple packages
- **ORM** - Object-Relational Mapping (database abstraction)
- **Schema** - Definition of data structure
- **Migration** - Database schema change script
- **Type Inference** - TypeScript automatically determining types
- **Runtime Validation** - Checking data at execution time
- **PWA** - Progressive Web App (installable web app)
- **Build Tool** - Software that compiles/bundles code
- **Package Manager** - Tool for installing dependencies

### Useful Links

- **Repository**: https://github.com/rpabonnie/HomeManagement
- **Issues**: https://github.com/rpabonnie/HomeManagement/issues
- **License**: MIT

---

*This document is maintained as part of the HMS project documentation. Last updated: December 3, 2025*
