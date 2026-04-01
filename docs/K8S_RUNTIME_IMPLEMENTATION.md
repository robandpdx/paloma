# K8s Runtime Implementation

This repository now includes the first implementation slice of the Amplify-to-Kubernetes migration.

## What was added

- A new NestJS backend under `backend/` that listens on port `5005`
- MongoDB-backed persistence for repository migration records
- REST endpoints that preserve the current GitHub migration/export orchestration logic from the Amplify functions
- Optional backend basic auth via environment variables
- Separate Dockerfiles for the frontend and backend
- A local `docker-compose.yml` stack for frontend, backend, and MongoDB
- A Helm chart under `deploy/helm/paloma/`
- A GitHub Actions workflow to build and publish two images to GHCR

## Backend API surface

The backend currently exposes:

- `GET /api/health`
- `GET /api/github/owner`
- `POST /api/github/migrations`
- `GET /api/github/migrations/:migrationId`
- `DELETE /api/github/target-repositories/:repositoryName`
- `POST /api/github/source-repositories/unlock`
- `POST /api/github/source-organizations/scan`
- `POST /api/github/exports`
- `GET /api/github/exports/:organizationName/:exportId`
- `GET /api/repository-migrations`
- `POST /api/repository-migrations`
- `PATCH /api/repository-migrations/:id`
- `DELETE /api/repository-migrations/:id`

## Backend environment variables

Required for startup:

- `MONGODB_URI`

Used by GitHub-related routes:

- `TARGET_ORGANIZATION`
- `SOURCE_ADMIN_TOKEN`
- `TARGET_ADMIN_TOKEN`
- `MODE` with values `GH` or `GHES`
- `GHES_API_URL` when `MODE=GHES`

Optional security/runtime settings:

- `PORT` default `5005`
- `BASIC_AUTH_ENABLED` default `false`
- `BASIC_AUTH_USERNAME`
- `BASIC_AUTH_PASSWORD`
- `CORS_ORIGIN`

## Deployment artifacts

### Docker Compose

`docker-compose.yml` brings up:

- `mongodb`
- `backend`
- `frontend`

The compose file is set up for local development and expects GitHub PATs to come from your shell environment or an `.env` file.

### Helm

The Helm chart supports two secret modes for the backend PATs and basic auth credentials:

1. Inline values rendered into a chart-managed `Secret`
2. Reference to an existing Kubernetes `Secret`

The chart assumes MongoDB is external in Kubernetes and expects a `mongoUri` value.

### GitHub Actions

`.github/workflows/build-and-publish-images.yml` builds and publishes:

- `ghcr.io/<owner>/paloma-frontend`
- `ghcr.io/<owner>/paloma-backend`

## What is not migrated yet

- The Next.js UI still uses Amplify auth and Amplify data access in `app/page.tsx`
- The frontend is not yet calling the new NestJS backend
- Amplify resources under `amplify/` are still present and still represent the current production path

## Recommended next step

Replace the frontend Amplify client calls with a dedicated API client that talks to the new backend, then remove the layout-level Amplify authentication wrapper and generated Amplify runtime config.