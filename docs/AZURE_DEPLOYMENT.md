# Cleo Azure Deployment Guide

This guide covers deploying Cleo to Azure with Production Small tier (~£130-170/month).

## Architecture Overview

```
rg-cleoagent-prod/                    (Resource Group - UK South)
├── cleoagent-db-prod                 (PostgreSQL Flexible Server + pgvector)
├── cleoagent-api-prod                (App Service - Flask/Gunicorn)
├── cleoagent-plan-prod               (App Service Plan - B2 Linux)
├── cleoagent-web-prod                (Static Web Apps - React)
├── cleoagentstorageprod              (Blob Storage - documents)
├── cleoagent-kv-prod                 (Key Vault - secrets)
├── cleoagentacrprod                  (Container Registry)
└── cleoagent-insights-prod           (Application Insights)
```

## Prerequisites

- Azure CLI installed (`az --version`)
- Azure subscription with Owner or Contributor access
- GitHub repository: https://github.com/Studio55-London/Cleo.git
- Anthropic API key

## Step 1: Create Azure Infrastructure

### Option A: Automated Setup (Recommended)

Run the setup script in PowerShell:

```powershell
# Login to Azure
az login

# Run setup script
.\scripts\azure-setup.ps1
```

The script will:
1. Create all Azure resources
2. Configure Key Vault secrets
3. Set up App Service with Key Vault references
4. Output credentials for GitHub Actions

### Option B: Manual Setup

If you prefer manual control, run these Azure CLI commands:

```bash
# Variables
RESOURCE_GROUP="rg-cleoagent-prod"
LOCATION="uksouth"

# 1. Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Create Key Vault
az keyvault create \
  --name cleoagent-kv-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# 3. Create Storage Account
az storage account create \
  --name cleoagentstorageprod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

az storage container create \
  --name documents \
  --account-name cleoagentstorageprod

# 4. Create PostgreSQL with pgvector
az postgres flexible-server create \
  --name cleoagent-db-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --admin-user cleoagentadmin \
  --admin-password <SECURE_PASSWORD>

az postgres flexible-server parameter set \
  --name azure.extensions \
  --value vector \
  --resource-group $RESOURCE_GROUP \
  --server-name cleoagent-db-prod

# 5. Create Container Registry
az acr create \
  --name cleoagentacrprod \
  --resource-group $RESOURCE_GROUP \
  --sku Basic \
  --admin-enabled true

# 6. Create App Service
az appservice plan create \
  --name cleoagent-plan-prod \
  --resource-group $RESOURCE_GROUP \
  --sku B2 \
  --is-linux

az webapp create \
  --name cleoagent-api-prod \
  --resource-group $RESOURCE_GROUP \
  --plan cleoagent-plan-prod \
  --deployment-container-image-name cleoagentacrprod.azurecr.io/cleoagent-api:latest

# 7. Create Static Web App
az staticwebapp create \
  --name cleoagent-web-prod \
  --resource-group $RESOURCE_GROUP \
  --location westeurope \
  --sku Standard
```

## Step 2: Store Secrets in Key Vault

```bash
# Store Anthropic API key (REQUIRED)
az keyvault secret set \
  --vault-name cleoagent-kv-prod \
  --name anthropic-api-key \
  --value "<YOUR_ANTHROPIC_API_KEY>"

# Store database URL
az keyvault secret set \
  --vault-name cleoagent-kv-prod \
  --name database-url \
  --value "postgresql://cleoagentadmin:<PASSWORD>@cleoagent-db-prod.postgres.database.azure.com:5432/cleo?sslmode=require"

# Store Flask secret key
az keyvault secret set \
  --vault-name cleoagent-kv-prod \
  --name flask-secret-key \
  --value "<RANDOM_32_CHAR_STRING>"

# Store Storage connection string
STORAGE_CONN=$(az storage account show-connection-string \
  --name cleoagentstorageprod \
  --resource-group rg-cleoagent-prod \
  --query connectionString -o tsv)

az keyvault secret set \
  --vault-name cleoagent-kv-prod \
  --name storage-connection-string \
  --value "$STORAGE_CONN"
```

## Step 3: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **Repository Secrets**:

| Secret Name | How to Get Value |
|-------------|------------------|
| `AZURE_CREDENTIALS` | See below |
| `ACR_USERNAME` | `az acr credential show --name cleoagentacrprod --query username -o tsv` |
| `ACR_PASSWORD` | `az acr credential show --name cleoagentacrprod --query "passwords[0].value" -o tsv` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `az staticwebapp secrets list --name cleoagent-web-prod --resource-group rg-cleoagent-prod --query "properties.apiKey" -o tsv` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

### Generate AZURE_CREDENTIALS

```bash
# Get your subscription ID
az account show --query id -o tsv

# Create service principal (replace <subscription-id>)
az ad sp create-for-rbac \
  --name "cleo-github-actions" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/rg-cleoagent-prod \
  --sdk-auth
```

Copy the entire JSON output as the `AZURE_CREDENTIALS` secret.

### Add Repository Variables

Go to Settings → Secrets and variables → Actions → Variables tab

| Variable Name | Value |
|---------------|-------|
| `PRODUCTION_API_URL` | `https://cleoagent-api-prod.azurewebsites.net` |

## Step 4: Migrate Database

### Export SQLite Data (Local Machine)

```bash
# From project root
python scripts/export_sqlite.py --output data/export/
```

### Import to PostgreSQL

```bash
# Set database URL
export DATABASE_URL="postgresql://cleoagentadmin:<PASSWORD>@cleoagent-db-prod.postgres.database.azure.com:5432/cleo?sslmode=require"

# Run migrations
alembic upgrade head

# Import data
python scripts/import_postgres.py --input data/export/

# Regenerate embeddings with pgvector
export USE_PGVECTOR=true
python scripts/regenerate_embeddings.py
```

## Step 5: Deploy

### Push to GitHub

```bash
git add .
git commit -m "Add Azure deployment configuration"
git push origin main
```

This will trigger:
1. **Backend workflow**: Build Docker image → Push to ACR → Deploy to App Service
2. **Frontend workflow**: Build React app → Deploy to Static Web Apps

### Monitor Deployment

- GitHub Actions: https://github.com/Studio55-London/Cleo/actions
- Backend logs: Azure Portal → App Service → Log stream
- Frontend: Azure Portal → Static Web Apps → Overview

## Step 6: Verify Deployment

### Health Check

```bash
curl https://cleoagent-api-prod.azurewebsites.net/api/status
```

Expected response:
```json
{
  "success": true,
  "status": "online",
  "environment": {
    "is_azure": true,
    "is_production": true,
    "database": "postgresql",
    "database_status": "connected",
    "vector_store": "pgvector",
    "blob_storage": "azure_blob"
  }
}
```

### Frontend

Visit: https://cleoagent-web-prod.azurestaticapps.net

## Troubleshooting

### Container Won't Start

Check App Service logs:
```bash
az webapp log tail --name cleoagent-api-prod --resource-group rg-cleoagent-prod
```

### Key Vault Access Denied

Ensure managed identity has access:
```bash
PRINCIPAL_ID=$(az webapp identity show --name cleoagent-api-prod --resource-group rg-cleoagent-prod --query principalId -o tsv)

az keyvault set-policy \
  --name cleoagent-kv-prod \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

### Database Connection Failed

1. Check firewall rules allow Azure services
2. Verify connection string in Key Vault
3. Test connection:
```bash
psql "postgresql://cleoagentadmin:<PASSWORD>@cleoagent-db-prod.postgres.database.azure.com:5432/cleo?sslmode=require"
```

### pgvector Not Working

Verify extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

If not, enable it:
```sql
CREATE EXTENSION vector;
```

## Cost Optimization

### Development/Staging

For lower environments, use:
- PostgreSQL: Standard_B1ms (~£25/month)
- App Service: B1 (~£12/month)
- Static Web Apps: Free tier

### Scale Down After Hours

```bash
# Stop App Service (saves ~70% cost)
az webapp stop --name cleoagent-api-prod --resource-group rg-cleoagent-prod

# Start when needed
az webapp start --name cleoagent-api-prod --resource-group rg-cleoagent-prod
```

## Security Checklist

- [ ] Anthropic API key stored in Key Vault (not in code)
- [ ] Database password is strong (24+ characters)
- [ ] App Service uses managed identity
- [ ] CORS configured for frontend domain only
- [ ] SSL/TLS enabled on all endpoints
- [ ] GitHub secrets are repository secrets (not environment)

## Useful Commands

```bash
# View App Service settings
az webapp config appsettings list --name cleoagent-api-prod --resource-group rg-cleoagent-prod

# Restart App Service
az webapp restart --name cleoagent-api-prod --resource-group rg-cleoagent-prod

# View Key Vault secrets (names only)
az keyvault secret list --vault-name cleoagent-kv-prod --query "[].name" -o tsv

# Check container registry images
az acr repository list --name cleoagentacrprod

# View deployment logs
az webapp log download --name cleoagent-api-prod --resource-group rg-cleoagent-prod --log-file logs.zip
```
