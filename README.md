# CivicResolve — AI-Powered Citizen Grievance Management & Resolution

CivicResolve is an intelligent smart-city citizen grievance portal and municipal dispatch command center. Citizens report civic issues in plain language, and the built-in NLP triage engine classifies hazard severity (`P1`–`P3`), routes the ticket to the responsible municipal department, assigns an SLA window, and generates actionable field crew instructions.

## Key Features
- **Real-Time AI Triage Co-Pilot**: Instant entity extraction, department routing, priority scoring, and SLA estimation as citizens type.
- **Municipal Command Center**: Live operational queue sorted by risk severity with one-click crew dispatch and resolution tracking.
- **Citizen Ticket Tracker**: Instant public status lookup via unique tracking IDs (`CR-2026-XXXX`).
- **Cloud-Native Container**: Packaged on `nginx:alpine` listening on `$PORT` (`8080`) for zero-downtime serverless scaling on Google Cloud Run.

## Project Structure
```text
civic-resolve/
├── index.html   # Complete frontend application & AI triage engine
├── Dockerfile   # Lightweight Nginx Alpine container build
├── nginx.conf   # Cloud Run dynamic $PORT web server config
├── deploy.sh    # Automated gcloud Cloud Run deployment script
└── README.md    # Documentation
