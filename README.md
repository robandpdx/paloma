## GitHub Repository Migration UI

This application provides a complete solution for managing GitHub repository migrations using the [GitHub Enterprise Importer](https://docs.github.com/en/migrations/using-github-enterprise-importer). It runs as two Docker containers (frontend + backend) backed by MongoDB.

### Features

- **Repository tracking** — add and manage repositories for migration individually, via CSV, or by scanning a source organization
- **Migration orchestration** — start, monitor, and reset migrations from the UI
- **Status monitoring** — real-time polling with color-coded status buttons
- **Target repository visibility** — choose private, internal, or public for each target repository
- **Source repository locking** — optionally lock the source repository during migration
- **Bulk operations** — start, reset, archive, or delete multiple repositories at once
- **GHES support** — two-phase export → migration workflow for GitHub Enterprise Server (3.8+)

### Migration Modes

| Mode | Set `MODE` to | Description |
|------|--------------|-------------|
| **GitHub.com** (default) | `GH` | Single-step migration from GitHub.com to GitHub Enterprise Cloud |
| **GitHub Enterprise Server** | `GHES` | Two-phase: export from GHES, then migrate to GitHub Enterprise Cloud |

### Quick Start

1. **Copy the example environment file and fill in your values:**

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your editor. The required variables are:

   | Variable | Description |
   |----------|-------------|
   | `SOURCE_ADMIN_TOKEN` | GitHub PAT for the **source** organization (needs `repo` and `admin:org` scopes) |
   | `TARGET_ADMIN_TOKEN` | GitHub PAT for the **target** organization (needs `repo` and `admin:org` scopes) |
   | `TARGET_ORGANIZATION` | Name of the target GitHub organization |

   Optional variables with sensible defaults:

   | Variable | Default | Description |
   |----------|---------|-------------|
   | `TARGET_DESCRIPTION` | `Target GitHub Enterprise Cloud` | Label shown in the UI for the target |
   | `SOURCE_DESCRIPTION` | `Source GitHub Organization` | Label shown in the UI for the source |
   | `MODE` | `GH` | Migration mode (`GH` or `GHES`) |
   | `GHES_API_URL` | *(empty)* | Required when `MODE=GHES` — e.g. `https://github.example.com/api/v3` |

   See `env.example` for a complete template.

2. **Start the application:**

   ```bash
   docker compose up
   ```

   This builds and starts three containers:

   | Container | Port | Description |
   |-----------|------|-------------|
   | `paloma-frontend` | [http://localhost:3000](http://localhost:3000) | Next.js UI |
   | `paloma-backend` | [http://localhost:5005](http://localhost:5005) | NestJS API |
   | `paloma-mongodb` | 27017 | MongoDB for migration state |

   Add `--build` to force a rebuild after code changes: `docker compose up --build`

3. **Open the UI** at [http://localhost:3000](http://localhost:3000) and start migrating repositories.

### Using the UI

- Click **Add Repository** to add a repository for migration, or upload a CSV file, or scan an entire source organization
- **GitHub.com mode:** click **Start Migration** to begin
- **GHES mode:** click **Start Export** first, then **Start Migration** after exports complete
- Use the **⚙️** icon to change repository settings (visibility, lock source)
- Use **Reset** to reset a completed or failed migration for retry
- Use the **Archive** view to move finished repositories out of the main list

### Deploying to Kubernetes

See [docs/HELM_CHART.md](docs/HELM_CHART.md) for the Helm chart reference, including an example `values.yaml` for Azure AKS with Web App Routing.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.