# DesignPilot

AI Design Brief Assistant for automotive designers. Chat with an AI assistant to explore design direction, materials, and finish options for your projects.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TanStack Router, TanStack Query, Zustand, Tailwind CSS v4, shadcn/ui |
| **Backend** | NestJS 12, Fastify, Prisma ORM, PostgreSQL |
| **AI** | Google Gemini (configurable) |
| **Infrastructure** | Docker Compose, pnpm workspaces |

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker & Docker Compose

## Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd designpilot
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/designpilot_db
JWT_SECRET=your-secure-secret-key
AI_PROVIDER=gemini
AI_API_KEY=your-gemini-api-key

# Optional (defaults shown)
NODE_ENV=local
PORT=3000
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### 3. Get AI API Key

For **Google Gemini** (recommended):
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the key to `AI_API_KEY` in your `.env` file

## Running the App

### Option 1: Docker Compose (Recommended)

Start all services with a single command:

```bash
docker compose up --build
```

Then run migrations and seed:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

Access the app:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- API Docs: http://localhost:3000/api/docs

### Option 2: Local Development

Start PostgreSQL (via Docker or local install):

```bash
docker compose up postgres -d
```

Run migrations and seed:

```bash
pnpm db:migrate
pnpm db:seed
```

Start development servers:

```bash
pnpm dev
```

## Test User

After seeding, login with:

- **Email:** `test@lmesh.eu`
- **Password:** `password`

## Project Structure

```
designpilot/
├── packages/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── common/   # Shared exceptions, guards, interceptors
│   │   │   ├── config/   # Environment configuration
│   │   │   ├── modules/  # Feature modules (auth, projects, chat, ai)
│   │   │   └── prisma/   # Database service
│   │   └── prisma/       # Schema and migrations
│   ├── frontend/         # React SPA
│   └── shared/           # Shared types (future)
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Login with email/password |
| `GET` | `/api/v1/projects` | List user's projects |
| `POST` | `/api/v1/projects` | Create a new project |
| `GET` | `/api/v1/projects/:id` | Get project details |
| `PATCH` | `/api/v1/projects/:id` | Update project |
| `DELETE` | `/api/v1/projects/:id` | Delete project |
| `GET` | `/api/v1/projects/:id/messages` | Get conversation history |
| `POST` | `/api/v1/projects/:id/chat` | Send message (SSE stream) |
| `POST` | `/api/v1/projects/:id/chat/summarize` | Summarize decisions (SSE stream) |
| `DELETE` | `/api/v1/projects/:id/chat` | Reset conversation |

## API Documentation

Interactive API documentation (Swagger) is available at `/api/docs` when the backend is running.

## AI Provider Choice

**Google Gemini** was chosen as the default AI provider for the following reasons:

1. **Free tier available** — No credit card required to get started
2. **Generous limits** — 60 requests/minute on free tier is sufficient for development and demo
3. **Quality responses** — Gemini Flash provides high-quality, contextual responses for design discussions
4. **Streaming support** — Native SSE streaming for progressive response display
5. **Simple API** — Straightforward SDK with good TypeScript support

### Supported Providers

| Provider | `AI_PROVIDER` | `AI_API_KEY` | Use Case |
|----------|---------------|--------------|----------|
| Google Gemini | `gemini` | Required | Default, recommended |
| OpenRouter | `openrouter` | Required | Access multiple models via single API |
| Ollama | `ollama` | Not required | Local development, offline use |

To switch providers, update your `.env`:

```env
# For OpenRouter
AI_PROVIDER=openrouter
AI_API_KEY=your-openrouter-key

# For Ollama (local)
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434  # Optional, this is the default
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all packages in development mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

## License

Private — Technical Assessment
