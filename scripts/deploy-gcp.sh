#!/bin/bash

# Agent Swarm Matrix - Google Cloud Deployment Script
# This script automates the deployment of ASM to Google Cloud Run with VPC connectivity

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Agent Swarm Matrix - GCP Deployment${NC}"
echo "======================================"

# Configuration
PROJECT_ID="agent-matrix-swarm-asm-1"
REGION="us-central1"
SERVICE_NAME="asm-swarm-host"
IMAGE_NAME="gcr.io/${PROJECT_ID}/asm-core"

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install it from https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

# Set active project
echo -e "\n${YELLOW}🔧 Setting active project: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "\n${YELLOW}🔌 Enabling required APIs...${NC}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  vpcaccess.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Build Docker image
echo -e "\n${YELLOW}🐳 Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:latest .

echo -e "${GREEN}✅ Image built${NC}"

# Push to Google Container Registry
echo -e "\n${YELLOW}📦 Pushing image to GCR...${NC}"
gcloud auth configure-docker
docker push ${IMAGE_NAME}:latest

echo -e "${GREEN}✅ Image pushed${NC}"

# Check if secrets exist
echo -e "\n${YELLOW}🔐 Checking secrets...${NC}"

if ! gcloud secrets describe notion-api-key --project=${PROJECT_ID} &> /dev/null; then
    echo -e "${RED}❌ Secret 'notion-api-key' not found.${NC}"
    echo "Create it with: gcloud secrets create notion-api-key --data-file=-"
    exit 1
fi

if ! gcloud secrets describe notion-agent-db-id --project=${PROJECT_ID} &> /dev/null; then
    echo -e "${RED}❌ Secret 'notion-agent-db-id' not found.${NC}"
    echo "Create it with: gcloud secrets create notion-agent-db-id --data-file=-"
    exit 1
fi

echo -e "${GREEN}✅ Secrets verified${NC}"

# Deploy to Cloud Run
echo -e "\n${YELLOW}🚢 Deploying to Cloud Run...${NC}"

gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME}:latest \
  --region=${REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_PROJECT_ID=${PROJECT_ID},GOOGLE_LOCATION=${REGION}" \
  --set-secrets="NOTION_API_KEY=notion-api-key:latest,NOTION_AGENT_DB_ID=notion-agent-db-id:latest" \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --max-instances=10

echo -e "${GREEN}✅ Deployment complete!${NC}"

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo -e "\n${GREEN}🎉 Success! Your ASM Swarm Host is deployed.${NC}"
echo -e "${GREEN}🔗 Service URL: ${SERVICE_URL}${NC}"
echo -e "\n${YELLOW}📊 Monitor logs with:${NC}"
echo "gcloud run logs read ${SERVICE_NAME} --region=${REGION} --limit=50"
echo -e "\n${YELLOW}🔍 Test the service:${NC}"
echo "curl ${SERVICE_URL}/health"
