#!/usr/bin/env bash
set -e

PROJECT_ID="YOUR_GCP_PROJECT_ID"
SERVICE_NAME="civic-resolve"
REGION="us-central1"

echo "Deploying $SERVICE_NAME to Google Cloud Run in project$PROJECT_ID..."

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080

echo "Deployment complete!"