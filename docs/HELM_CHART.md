# Paloma Helm Chart

Deploy the Paloma GitHub repository migration tool to Kubernetes.

Chart location: `deploy/helm/paloma/`

## Prerequisites

- Kubernetes 1.24+
- Helm 3+
- An external MongoDB instance (the chart does not deploy MongoDB)
- Container images published to a registry accessible from the cluster
- Two GitHub Personal Access Tokens (PATs): one for the source organization and one for the target organization

## Architecture

The chart deploys two workloads and their corresponding ClusterIP services:

| Component | Default Port | Description |
|-----------|-------------|-------------|
| **frontend** | 3000 | Next.js standalone server serving the migration UI |
| **backend** | 5005 | NestJS API server handling GitHub migration orchestration and MongoDB persistence |

An optional Ingress resource routes external traffic to both services under a single hostname.

## Installing the Chart

```bash
helm install paloma ./deploy/helm/paloma -f my-values.yaml
```

To upgrade an existing release:

```bash
helm upgrade paloma ./deploy/helm/paloma -f my-values.yaml
```

## Uninstalling the Chart

```bash
helm uninstall paloma
```

## Configuration Reference

### Global

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nameOverride` | Override the chart name used in resource names | `''` |
| `fullnameOverride` | Fully override the release name used in resource names | `''` |

### Frontend

| Parameter | Description | Default |
|-----------|-------------|---------|
| `frontend.replicaCount` | Number of frontend pods | `1` |
| `frontend.image.repository` | Frontend container image | `ghcr.io/robandpdx/paloma-frontend` |
| `frontend.image.tag` | Image tag | `latest` |
| `frontend.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `frontend.service.type` | Kubernetes service type | `ClusterIP` |
| `frontend.service.port` | Service port | `3000` |
| `frontend.env.nextPublicApiBaseUrl` | URL the browser uses to reach the backend API | `/api` |
| `frontend.env.targetOrganization` | Target GitHub organization name shown in the UI | `''` |
| `frontend.env.targetDescription` | Display label for the target environment | `Target GitHub Enterprise Cloud` |
| `frontend.env.sourceDescription` | Display label for the source environment | `Source GitHub Organization` |
| `frontend.env.mode` | Migration mode: `GH` (GitHub.com to GitHub.com) or `GHES` (GHES to GitHub.com) | `GH` |
| `frontend.resources` | CPU/memory resource requests and limits | `{}` |

### Backend

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.replicaCount` | Number of backend pods | `1` |
| `backend.image.repository` | Backend container image | `ghcr.io/robandpdx/paloma-backend` |
| `backend.image.tag` | Image tag | `latest` |
| `backend.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `backend.service.type` | Kubernetes service type | `ClusterIP` |
| `backend.service.port` | Service port | `5005` |
| `backend.env.port` | Port the backend process listens on | `5005` |
| `backend.env.mongoUri` | MongoDB connection string | `mongodb://mongodb.example.com:27017/paloma` |
| `backend.env.targetOrganization` | Target GitHub organization for migrations | `''` |
| `backend.env.mode` | Migration mode: `GH` or `GHES` | `GH` |
| `backend.env.ghesApiUrl` | GHES API base URL (required when mode is `GHES`) | `''` |
| `backend.env.corsOrigin` | Allowed CORS origins (comma-separated or `*`) | `*` |
| `backend.resources` | CPU/memory resource requests and limits | `{}` |

### Secrets

The backend requires two GitHub PATs to operate. The chart supports two modes for providing them.

#### Option A — Let the chart create the Secret (inline)

Set the tokens directly in your values file. The chart renders a Kubernetes `Secret` resource containing them.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.secrets.inline.sourceAdminToken` | PAT for the **source** GitHub organization | `''` |
| `backend.secrets.inline.targetAdminToken` | PAT for the **target** GitHub organization | `''` |

> **Security note:** Avoid committing PAT values to version control. Pass them via `--set` on the command line or use a secrets manager.

#### Option B — Reference an existing Secret

If you pre-create a Kubernetes Secret (manually or through an external secrets operator), point the chart at it:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.secrets.existingSecret` | Name of a pre-existing Kubernetes Secret | `''` |
| `backend.secrets.sourceAdminTokenKey` | Key inside the Secret holding the source PAT | `SOURCE_ADMIN_TOKEN` |
| `backend.secrets.targetAdminTokenKey` | Key inside the Secret holding the target PAT | `TARGET_ADMIN_TOKEN` |

When `backend.secrets.existingSecret` is set, the chart skips creating its own Secret and mounts values from the named Secret instead.

Example of creating the secret manually:

```bash
kubectl create secret generic paloma-github-pats \
  --from-literal=SOURCE_ADMIN_TOKEN=ghp_xxxx \
  --from-literal=TARGET_ADMIN_TOKEN=ghp_yyyy
```

Then reference it:

```yaml
backend:
  secrets:
    existingSecret: paloma-github-pats
```

### Ingress

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Create an Ingress resource | `false` |
| `ingress.className` | Ingress class name | `''` |
| `ingress.annotations` | Annotations added to the Ingress metadata | `{}` |
| `ingress.hosts` | List of host rules (see example below) | see defaults |
| `ingress.tls` | TLS configuration | `[]` |

The Ingress template routes paths to either the frontend or backend service based on the `service` field in each path entry. Use `frontend` or `backend` as the value.

## Deploying to Azure AKS with Web App Routing

Azure AKS [Web App Routing](https://learn.microsoft.com/en-us/azure/aks/app-routing) provides a managed NGINX-based ingress controller. When enabled on your cluster it registers the ingress class `webapprouting.kubernetes.azure.com`.

To use it with this chart:

1. **Enable Web App Routing on your AKS cluster** (if not already enabled):

   ```bash
   az aks approuting enable --resource-group <rg> --name <cluster>
   ```

2. **(Optional) Create a DNS zone and link it** so the ingress controller automatically creates DNS records:

   ```bash
   az aks approuting zone add \
     --resource-group <rg> \
     --name <cluster> \
     --ids <dns-zone-resource-id> \
     --attach-zones
   ```

3. **Install the chart** with the AKS-specific values shown in the example below.

### TLS with a Key Vault certificate

Web App Routing can terminate TLS using a certificate stored in Azure Key Vault. Add the Key Vault certificate URI as an annotation:

```yaml
ingress:
  annotations:
    kubernetes.azure.com/tls-cert-keyvault-uri: https://<vault-name>.vault.azure.net/certificates/<cert-name>
```

The managed ingress controller retrieves the certificate automatically. No `tls` block is needed in that case.

## Example `values.yaml` for AKS

```yaml
frontend:
  replicaCount: 2
  image:
    repository: ghcr.io/robandpdx/paloma-frontend
    tag: latest
  service:
    type: ClusterIP
    port: 3000
  env:
    nextPublicApiBaseUrl: /api
    targetOrganization: contoso-target
    targetDescription: GitHub Enterprise Cloud (EMU)
    sourceDescription: GitHub.com (contoso)
    mode: GH
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

backend:
  replicaCount: 2
  image:
    repository: ghcr.io/robandpdx/paloma-backend
    tag: latest
  service:
    type: ClusterIP
    port: 5005
  env:
    port: 5005
    mongoUri: mongodb://paloma-user:password@my-cosmos-mongo.mongo.cosmos.azure.com:10255/paloma?ssl=true&replicaSet=globaldb&retrywrites=false
    targetOrganization: contoso-target
    mode: GH
    ghesApiUrl: ''
    corsOrigin: 'https://paloma.contoso.com'
  secrets:
    # Option A: inline (tokens passed via --set at install time)
    inline:
      sourceAdminToken: ''   # pass with --set backend.secrets.inline.sourceAdminToken=ghp_xxx
      targetAdminToken: ''   # pass with --set backend.secrets.inline.targetAdminToken=ghp_yyy
    # Option B: use a pre-created secret instead
    # existingSecret: paloma-github-pats
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: '1'
      memory: 512Mi

ingress:
  enabled: true
  className: webapprouting.kubernetes.azure.com
  annotations:
    # Optional: auto-provision TLS from a Key Vault certificate
    # kubernetes.azure.com/tls-cert-keyvault-uri: https://my-vault.vault.azure.net/certificates/paloma-tls
  hosts:
    - host: paloma.contoso.com
      paths:
        - path: /api
          pathType: Prefix
          service: backend
        - path: /
          pathType: Prefix
          service: frontend
  tls: []
  # If using a manually supplied TLS secret instead of Key Vault:
  # tls:
  #   - secretName: paloma-tls
  #     hosts:
  #       - paloma.contoso.com
```

### Install with inline secrets

```bash
helm install paloma ./deploy/helm/paloma \
  -f my-values.yaml \
  --set backend.secrets.inline.sourceAdminToken=ghp_xxxx \
  --set backend.secrets.inline.targetAdminToken=ghp_yyyy
```

### Install with an existing secret

```bash
# Pre-create the secret
kubectl create secret generic paloma-github-pats \
  --from-literal=SOURCE_ADMIN_TOKEN=ghp_xxxx \
  --from-literal=TARGET_ADMIN_TOKEN=ghp_yyyy

# Install referencing it
helm install paloma ./deploy/helm/paloma \
  -f my-values.yaml \
  --set backend.secrets.existingSecret=paloma-github-pats
```

## MongoDB on Azure

The chart expects an external MongoDB instance. On Azure the common choices are:

| Service | Connection string format |
|---------|------------------------|
| **Azure Cosmos DB for MongoDB** | `mongodb://<user>:<key>@<account>.mongo.cosmos.azure.com:10255/<db>?ssl=true&replicaSet=globaldb&retrywrites=false` |
| **MongoDB Atlas on Azure** | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority` |
| **Self-hosted MongoDB** | `mongodb://<host>:27017/<db>` |

Set the connection string in `backend.env.mongoUri`.

## Health Checks

| Service | Readiness | Liveness |
|---------|-----------|----------|
| Backend | `GET /api/health` (10s initial, 10s period) | `GET /api/health` (20s initial, 20s period) |
| Frontend | `GET /` (10s initial, 10s period) | `GET /` (20s initial, 20s period) |

## GHES Mode

To migrate repositories from GitHub Enterprise Server instead of GitHub.com, set `mode: GHES` on both the frontend and backend, and provide the GHES API URL:

```yaml
frontend:
  env:
    mode: GHES

backend:
  env:
    mode: GHES
    ghesApiUrl: https://github.example.com/api/v3
```
