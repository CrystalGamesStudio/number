# Production Deployment

## Backend (Render.com)

### Setup

1. Create a new **Web Service** on Render.com
2. Connect your GitHub repository
3. Configure the following:
   - **Build Command**: `pip install uv && uv sync --dev`
   - **Start Command**: `bash start.sh`
   - **Environment Variables** (see below)

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEON_HOST` | Neon database host | `your-project.us-east-2.aws.neon.tech` |
| `NEON_DATABASE` | Database name | `neondb` |
| `NEON_USER` | Database user | `neondb_owner` |
| `NEON_PASSWORD` | Database password | `your-password` |
| `JWT_SECRET` | JWT signing secret | `generate-a-random-secret` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://your-frontend.pages.dev` |

### Auto-Deploy

Backend auto-deploys on push to `main` branch via GitHub Actions (`.github/workflows/deploy-backend.yml`).

You need to configure these secrets in your GitHub repository:
- `RENDER_SERVICE_ID` — Your Render service ID
- `RENDER_API_KEY` — Your Render API key

### Migrations

Database migrations run automatically on startup via `start.sh`.

## Frontend (Cloudflare Pages)

### Setup

1. Create a new project on Cloudflare Pages
2. Connect your GitHub repository
3. Configure the following:
   - **Build command**: `cd frontend && pnpm install && pnpm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`

### Environment Variables

Cloudflare Pages doesn't use environment variables at build time by default. Configure production API URLs in your build settings if needed.

### Auto-Deploy

Frontend auto-deploys on push to `main` branch via GitHub Actions (`.github/workflows/deploy-frontend.yml`).

You need to configure these secrets in your GitHub repository:
- `CLOUDFLARE_API_TOKEN` — Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

## Health Checks

- Backend health check: `https://your-backend.onrender.com/health`
- Expected response: `{"status": "ok", "database": "connected"}`
