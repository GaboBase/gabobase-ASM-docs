# 🔐 Secrets Configuration Guide

This guide walks you through configuring all required secrets for the Agent Swarm Matrix (ASM) deployment.

## 📋 Prerequisites

- GitHub account with repository access
- Google Cloud Platform project: `agent-matrix-swarm-asm-1`
- Notion workspace with integration access
- Notion Agent Registry database ID: `7eb331e9-f7b2-458d-8729-5bfed6471aa0`

---

## 🔧 Part 1: GitHub Secrets Configuration

### Step 1: Navigate to Repository Settings

1. Go to your repository: [gabobase-ASM-docs](https://github.com/GaboBase/gabobase-ASM-docs)
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Required Secrets

Click **New repository secret** for each of the following:

#### Secret 1: NOTION_API_KEY

- **Name**: `NOTION_API_KEY`
- **Value**: Your Notion Internal Integration Token
- **How to get it**:
  1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
  2. Click **+ New integration**
  3. Name it "ASM Swarm Integration"
  4. Select your workspace
  5. Copy the **Internal Integration Token**
  6. **IMPORTANT**: Share the "Agent Registry - Complete Swarm" database with this integration:
     - Open the database in Notion
     - Click **⋯** (top right) → **Connections** → Add your integration

#### Secret 2: NOTION_AGENT_DB_ID

- **Name**: `NOTION_AGENT_DB_ID`
- **Value**: `7eb331e9-f7b2-458d-8729-5bfed6471aa0`
- **Note**: This is the data source ID for your Agent Registry database

#### Secret 3: GOOGLE_PROJECT_ID

- **Name**: `GOOGLE_PROJECT_ID`
- **Value**: `agent-matrix-swarm-asm-1`
- **Console**: [Google Cloud Console](https://console.cloud.google.com/welcome?project=agent-matrix-swarm-asm-1)

#### Secret 4: GCP_SA_KEY (for GitHub Actions deployment)

- **Name**: `GCP_SA_KEY`
- **Value**: Service Account JSON key
- **How to get it**:
  1. Go to [IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=agent-matrix-swarm-asm-1)
  2. Click **+ CREATE SERVICE ACCOUNT**
  3. Name: `asm-deployer`
  4. Grant roles:
     - Cloud Run Admin
     - Service Account User
     - Storage Admin (for GCR)
  5. Click **Keys** tab → **Add Key** → **JSON**
  6. Copy the entire JSON content and paste it as the secret value

---

## ☁️ Part 2: Google Cloud Secret Manager Configuration

These secrets are needed for Cloud Run to access Notion at runtime.

### Step 1: Enable Secret Manager API

```bash
gcloud services enable secretmanager.googleapis.com --project=agent-matrix-swarm-asm-1
```

### Step 2: Create Secrets

#### Create notion-api-key

```bash
# Replace YOUR_NOTION_API_KEY with your actual token
echo -n "YOUR_NOTION_API_KEY" | gcloud secrets create notion-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=agent-matrix-swarm-asm-1
```

#### Create notion-agent-db-id

```bash
echo -n "7eb331e9-f7b2-458d-8729-5bfed6471aa0" | gcloud secrets create notion-agent-db-id \
  --data-file=- \
  --replication-policy="automatic" \
  --project=agent-matrix-swarm-asm-1
```

### Step 3: Grant Cloud Run Access to Secrets

Find your Cloud Run service account:

```bash
gcloud iam service-accounts list --project=agent-matrix-swarm-asm-1
```

Grant access:

```bash
# Replace SERVICE_ACCOUNT_EMAIL with actual email
gcloud secrets add-iam-policy-binding notion-api-key \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project=agent-matrix-swarm-asm-1

gcloud secrets add-iam-policy-binding notion-agent-db-id \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project=agent-matrix-swarm-asm-1
```

---

## ✅ Part 3: Verification

### Test GitHub Actions

Trigger the GenOps pipeline:

```bash
gh workflow run genops.yml
```

Check status:

```bash
gh run list --workflow=genops.yml
```

### Test Local Setup

Create `.env` file:

```bash
NOTION_API_KEY=your_key_here
NOTION_AGENT_DB_ID=7eb331e9-f7b2-458d-8729-5bfed6471aa0
GOOGLE_PROJECT_ID=agent-matrix-swarm-asm-1
GOOGLE_LOCATION=us-central1
```

Run validation:

```bash
npm install
npm run genops:validate
```

Expected output:

```
🔍 Starting GenOps Contract Validation...
✅ Valid: AGT-001 (Intent Detector)
✅ Valid: AGT-002 (Site Selector)
...
✨ All Agent Contracts Verified Successfully.
```

---

## 🚀 Part 4: Deploy to Google Cloud

Once secrets are configured, deploy:

```bash
# Run the automated deployment script
./scripts/deploy-gcp.sh
```

Or use Terraform:

```bash
cd infra
terraform init
terraform plan -var="project_id=agent-matrix-swarm-asm-1"
terraform apply -var="project_id=agent-matrix-swarm-asm-1"
```

---

## 🔍 Troubleshooting

### GenOps Pipeline Fails

**Error**: `APIResponseError: validation_error`

**Solution**: Verify the Notion integration has access to the database:

1. Open [Agent Registry](https://notion.so/4f83c29038c74710a9e2b56bd1c35c3c)
2. Click **⋯** → **Connections**
3. Add your integration

### Cloud Run Service Won't Start

**Error**: `Permission denied on secret`

**Solution**: Re-run the IAM binding commands in Part 2, Step 3.

### No Agents Found

**Error**: `⚠️ No active agents found in registry`

**Solution**: Check database filters. Ensure agents have `Status = "Active"`.

---

## 📚 Additional Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vertex AI Setup](https://cloud.google.com/vertex-ai/docs/start/cloud-environment)

---

**Next Steps**: After configuration, proceed to [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions.
