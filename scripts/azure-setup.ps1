# Cleo Azure Infrastructure Setup Script
# Run this script in Azure Cloud Shell or local PowerShell with Azure CLI installed
#
# Prerequisites:
# - Azure CLI installed and logged in (az login)
# - Sufficient permissions to create resources
#
# Usage:
#   .\scripts\azure-setup.ps1

param(
    [string]$BaseName = "cleoagent",
    [string]$Environment = "prod",
    [string]$Location = "uksouth",
    [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$ResourceGroup = "rg-$BaseName-$Environment"
$KeyVaultName = "$BaseName-kv-$Environment"
$StorageAccountName = "${BaseName}storage${Environment}"
$PostgresServerName = "$BaseName-db-$Environment"
$AcrName = "${BaseName}acr${Environment}"
$AppServicePlanName = "$BaseName-plan-$Environment"
$AppServiceName = "$BaseName-api-$Environment"
$StaticWebAppName = "$BaseName-web-$Environment"
$AppInsightsName = "$BaseName-insights-$Environment"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Cleo Azure Infrastructure Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:"
Write-Host "  Resource Group: $ResourceGroup"
Write-Host "  Location: $Location"
Write-Host "  Base Name: $BaseName"
Write-Host "  Environment: $Environment"
Write-Host ""

# Generate secure password if not provided
if ([string]::IsNullOrEmpty($AdminPassword)) {
    $AdminPassword = -join ((65..90) + (97..122) + (48..57) + (33, 35, 36, 37, 38, 42) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    Write-Host "Generated admin password (save this securely!):" -ForegroundColor Yellow
    Write-Host $AdminPassword -ForegroundColor Green
    Write-Host ""
}

# Confirm before proceeding
$confirm = Read-Host "Proceed with infrastructure creation? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Creating Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location --output table

Write-Host ""
Write-Host "Step 2: Creating Key Vault..." -ForegroundColor Yellow
az keyvault create `
    --name $KeyVaultName `
    --resource-group $ResourceGroup `
    --location $Location `
    --enable-rbac-authorization false `
    --output table

Write-Host ""
Write-Host "Step 3: Creating Storage Account..." -ForegroundColor Yellow
az storage account create `
    --name $StorageAccountName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Standard_LRS `
    --kind StorageV2 `
    --output table

# Create blob container
Write-Host "Creating blob container 'documents'..."
$StorageKey = az storage account keys list --account-name $StorageAccountName --resource-group $ResourceGroup --query "[0].value" -o tsv
az storage container create `
    --name documents `
    --account-name $StorageAccountName `
    --account-key $StorageKey `
    --output table

Write-Host ""
Write-Host "Step 4: Creating PostgreSQL Flexible Server with pgvector..." -ForegroundColor Yellow
az postgres flexible-server create `
    --name $PostgresServerName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku-name Standard_B2s `
    --tier Burstable `
    --storage-size 32 `
    --version 16 `
    --admin-user cleoagentadmin `
    --admin-password $AdminPassword `
    --public-access 0.0.0.0 `
    --output table

# Enable pgvector extension
Write-Host "Enabling pgvector extension..."
az postgres flexible-server parameter set `
    --name azure.extensions `
    --value vector `
    --resource-group $ResourceGroup `
    --server-name $PostgresServerName `
    --output table

# Create database
Write-Host "Creating 'cleo' database..."
az postgres flexible-server db create `
    --resource-group $ResourceGroup `
    --server-name $PostgresServerName `
    --database-name cleo `
    --output table

Write-Host ""
Write-Host "Step 5: Creating Container Registry..." -ForegroundColor Yellow
az acr create `
    --name $AcrName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Basic `
    --admin-enabled true `
    --output table

Write-Host ""
Write-Host "Step 6: Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name $AppServicePlanName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku B2 `
    --is-linux `
    --output table

Write-Host ""
Write-Host "Step 7: Creating App Service (Web App)..." -ForegroundColor Yellow
az webapp create `
    --name $AppServiceName `
    --resource-group $ResourceGroup `
    --plan $AppServicePlanName `
    --deployment-container-image-name mcr.microsoft.com/appsvc/staticsite:latest `
    --output table

# Enable managed identity
Write-Host "Enabling managed identity..."
$PrincipalId = az webapp identity assign `
    --name $AppServiceName `
    --resource-group $ResourceGroup `
    --query principalId -o tsv

Write-Host ""
Write-Host "Step 8: Creating Application Insights..." -ForegroundColor Yellow
az monitor app-insights component create `
    --app $AppInsightsName `
    --location $Location `
    --resource-group $ResourceGroup `
    --output table

$AppInsightsConnString = az monitor app-insights component show `
    --app $AppInsightsName `
    --resource-group $ResourceGroup `
    --query connectionString -o tsv

Write-Host ""
Write-Host "Step 9: Creating Static Web App..." -ForegroundColor Yellow
# Note: Static Web Apps have limited region availability
az staticwebapp create `
    --name $StaticWebAppName `
    --resource-group $ResourceGroup `
    --location "westeurope" `
    --sku Standard `
    --output table

Write-Host ""
Write-Host "Step 10: Storing Secrets in Key Vault..." -ForegroundColor Yellow

# Get storage connection string
$StorageConnString = az storage account show-connection-string `
    --name $StorageAccountName `
    --resource-group $ResourceGroup `
    --query connectionString -o tsv

# Database URL
$DatabaseUrl = "postgresql://cleoagentadmin:$AdminPassword@$PostgresServerName.postgres.database.azure.com:5432/cleo?sslmode=require"

# Generate Flask secret key
$FlaskSecretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

# Store secrets
Write-Host "Storing database-url..."
az keyvault secret set --vault-name $KeyVaultName --name "database-url" --value $DatabaseUrl --output none

Write-Host "Storing flask-secret-key..."
az keyvault secret set --vault-name $KeyVaultName --name "flask-secret-key" --value $FlaskSecretKey --output none

Write-Host "Storing storage-connection-string..."
az keyvault secret set --vault-name $KeyVaultName --name "storage-connection-string" --value $StorageConnString --output none

Write-Host ""
Write-Host "Step 11: Granting Key Vault Access to App Service..." -ForegroundColor Yellow
az keyvault set-policy `
    --name $KeyVaultName `
    --object-id $PrincipalId `
    --secret-permissions get list `
    --output table

Write-Host ""
Write-Host "Step 12: Configuring App Service Settings..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name $AppServiceName `
    --resource-group $ResourceGroup `
    --settings `
        "AZURE_KEY_VAULT_URL=https://$KeyVaultName.vault.azure.net/" `
        "DATABASE_URL=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=database-url)" `
        "SECRET_KEY=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=flask-secret-key)" `
        "AZURE_STORAGE_CONNECTION_STRING=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=storage-connection-string)" `
        "USE_PGVECTOR=true" `
        "ENVIRONMENT=production" `
        "WEBSITES_PORT=8080" `
        "APPLICATIONINSIGHTS_CONNECTION_STRING=$AppInsightsConnString" `
    --output table

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Infrastructure Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Get credentials for GitHub Actions
Write-Host "Getting credentials for GitHub Actions..." -ForegroundColor Yellow
$AcrUsername = az acr credential show --name $AcrName --query username -o tsv
$AcrPassword = az acr credential show --name $AcrName --query "passwords[0].value" -o tsv
$StaticWebAppToken = az staticwebapp secrets list --name $StaticWebAppName --resource-group $ResourceGroup --query "properties.apiKey" -o tsv

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "GitHub Secrets to Configure:" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ACR_USERNAME:" -ForegroundColor Yellow
Write-Host $AcrUsername
Write-Host ""
Write-Host "ACR_PASSWORD:" -ForegroundColor Yellow
Write-Host $AcrPassword
Write-Host ""
Write-Host "AZURE_STATIC_WEB_APPS_API_TOKEN:" -ForegroundColor Yellow
Write-Host $StaticWebAppToken
Write-Host ""
Write-Host "For AZURE_CREDENTIALS, run:" -ForegroundColor Yellow
Write-Host "az ad sp create-for-rbac --name 'cleo-github-actions' --role contributor --scopes /subscriptions/<subscription-id>/resourceGroups/$ResourceGroup --sdk-auth"
Write-Host ""

# Summary URLs
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Resource URLs:" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: https://$AppServiceName.azurewebsites.net" -ForegroundColor Green
Write-Host "Frontend: https://$StaticWebAppName.azurestaticapps.net" -ForegroundColor Green
Write-Host "Key Vault: https://$KeyVaultName.vault.azure.net" -ForegroundColor Green
Write-Host "PostgreSQL: $PostgresServerName.postgres.database.azure.com" -ForegroundColor Green
Write-Host "Container Registry: $AcrName.azurecr.io" -ForegroundColor Green
Write-Host ""

# Save credentials to file
$CredentialsFile = "azure-credentials-$Environment.txt"
@"
Cleo Azure Credentials - $Environment
Generated: $(Get-Date)

IMPORTANT: Store these credentials securely and delete this file after use!

Database Admin Password: $AdminPassword
ACR Username: $AcrUsername
ACR Password: $AcrPassword
Static Web App Token: $StaticWebAppToken

Database URL: $DatabaseUrl
Storage Connection String: $StorageConnString

GitHub Repository Secrets to Set:
- ACR_USERNAME: $AcrUsername
- ACR_PASSWORD: $AcrPassword
- AZURE_STATIC_WEB_APPS_API_TOKEN: $StaticWebAppToken
- AZURE_CREDENTIALS: Run the command below to generate

Generate AZURE_CREDENTIALS:
az ad sp create-for-rbac --name 'cleo-github-actions' --role contributor --scopes /subscriptions/<subscription-id>/resourceGroups/$ResourceGroup --sdk-auth
"@ | Out-File -FilePath $CredentialsFile

Write-Host "Credentials saved to: $CredentialsFile" -ForegroundColor Yellow
Write-Host "IMPORTANT: Store these credentials securely and delete the file!" -ForegroundColor Red
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Add your ANTHROPIC_API_KEY to Key Vault:"
Write-Host "   az keyvault secret set --vault-name $KeyVaultName --name 'anthropic-api-key' --value '<your-api-key>'"
Write-Host ""
Write-Host "2. Configure GitHub repository secrets"
Write-Host ""
Write-Host "3. Push code to trigger CI/CD deployment"
Write-Host ""
