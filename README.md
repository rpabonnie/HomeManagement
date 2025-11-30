# Household Management System (HMS)

A personal household management application featuring budget planning and generator maintenance tracking.

## Features

### 📊 Budget Planner
- "What-If" scenario planning based on bi-weekly salary
- Toggle expenses on/off to visualize budget impact
- Categories: Expenses, Debts, Subscriptions
- Savings projections and debt payoff timelines

### ⚡ Generator Usage Log
- Track runtime hours via iOS Shortcuts
- Automated maintenance reminders (oil changes)
- Simple start/stop API for voice activation

## Tech Stack

- **Backend:** Node.js + Hono (TypeScript)
- **Frontend:** React + Vite (PWA)
- **Database:** SQLite with Drizzle ORM
- **Validation:** Zod
- **Deployment:** Docker / Azure Container Apps

## Project Structure

```
├── apps/
│   ├── api/          # Backend REST API
│   └── web/          # Frontend PWA
├── packages/
│   ├── database/     # Drizzle ORM schemas
│   └── validation/   # Shared Zod schemas
└── docs/             # Architecture documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/HomeManagement.git
cd HomeManagement

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate database
npm run db:generate
npm run db:migrate

# Start development servers
npm run dev
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

## Documentation

See the `/docs` folder for detailed documentation:

- [Initial Research](docs/initial-research.md)
- [Research Summary & Analysis](docs/research-summary-and-analysis.md)
- [Feasibility Analysis & Architecture](docs/feasibility-analysis-and-architecture.md)
- [Security Architecture](docs/security-architecture.md)

## iOS Shortcuts Integration

The Generator module is designed to work with iOS Shortcuts:

1. Create a "Start Generator" shortcut with HTTP POST to `/api/generator/start`
2. Create a "Stop Generator" shortcut with HTTP POST to `/api/generator/stop`
3. Use API keys for authentication (see Security docs)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

This is a personal project, but suggestions and feedback are welcome via issues.
