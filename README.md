# NiveshIQ: AI-Driven Portfolio Intelligence Engine

NiveshIQ is a state-of-the-art, high-fidelity portfolio intelligence platform designed to empower investors with AI-driven analytics, real-time metrics, automated watchlists, and smart portfolio reviews. Built with a robust FastAPI Python backend, a secure serverless Neon PostgreSQL database, and a highly responsive Next.js frontend, it delivers a unified modern experience for managing asset health.

---

## Technical Stack & Architecture

```
                                +---------------------------+
                                |    Vercel: Next.js Web    |
                                |     Frontend (React)      |
                                +-------------+-------------+
                                              |
                                              | HTTPS / JSON
                                              v
                                +-------------+-------------+
                                |    Render: FastAPI Python  |
                                |       API Service         |
                                +------+------+------+------+
                                       |      |      |
                 +---------------------+      |      +---------------------+
                 |                            |                            |
                 v                            v                            v
    +------------+------------+  +------------+------------+  +------------+------------+
    |   Neon Serverless Cloud  |  |    Google Vertex AI     |  |       Resend SMTP       |
    |  PostgreSQL + pgvector  |  |   Intelligence Engine   |  |   Transaction Emails    |
    +-------------------------+  +-------------------------+  +-------------------------+
```

### 1. Frontend Architecture
* **Framework**: Next.js (React) running on Turbopack compiler.
* **Styling**: Tailwind CSS with custom smooth dark-mode accents.
* **State & Authentication**: JWT cookie & localStorage persistence with active route guards.
* **Integrations**: Google One Tap Client SSO for federated Google OAuth logins.

### 2. Backend Service
* **Framework**: FastAPI (Python 3.10+) utilizing asynchronous lifespans.
* **ORM & Database Context**: SQLAlchemy with dynamic thread-safe sessions and connection poolers.
* **AI Intelligence**: Google Vertex AI Platform API integration for natural language portfolio evaluations.
* **Mailing**: Direct HTTP client interface connecting to the Resend REST API.

### 3. Database Layer
* **Provider**: Neon Serverless Postgres.
* **Vector Processor**: Native `pgvector` extension for efficient AI semantic search.
* **Integrations**: Standard cascading deletions for 100% data integrity when profiles are reset or permanently deleted.

---

## Core Features

1. **Advanced Authentication**:
   * Standard Email/Password registration requiring verification.
   * Real-time activation flows utilizing rich HTML transactional email templates.
   * Secure, federated sign-in using Google One Tap SSO.
   * Token-based self-service Password Reset routes.
2. **Onboarding & Profile Hub**:
   * Interactive Profile Activation banner showing custom SEBI risk disclosures.
   * Comprehensive settings panel permitting users to configure Risk Appetites, Time Horizons, Investment Goals, and Sector Preferences.
   * Functional Change Password forms and permanent Account Deletion triggers.
3. **Portfolio Intelligence**:
   * Track current holdings, transaction histories, and asset distributions.
   * Get AI-driven evaluation summaries utilizing Google Vertex AI LLM models.

---

## Local Development Setup

### 1. Backend Service Setup

Navigate to the `backend` directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv .venv
# On Windows PowerShell
.venv\Scripts\Activate.ps1
# On Linux/macOS
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Create a secure `.env` file in the `backend/` directory:
```env
# API Server Configuration
PROJECT_NAME="NiveshIQ"
API_V1_STR="/api/v1"

# Database Configuration (Neon or local Docker)
DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"

# Identity & Security
GOOGLE_CLIENT_ID="[your-google-client-id]"

# SMTP Email Services
RESEND_API_KEY="[your-resend-api-key]"
EMAIL_FROM="onboarding@resend.dev"

# Vertex AI Settings
VERTEX_PROJECT_ID="allokate-497815"
VERTEX_LOCATION="global"
```

Start the FastAPI development server:
```bash
python -m app.main
```
The backend API documentation will be available at `http://localhost:8000/docs`.

---

### 2. Frontend Next.js Setup

Navigate to the `frontend` directory:
```bash
cd ../frontend
```

Install the node modules:
```bash
npm install
```

Create a `.env.local` configuration file:
```env
# Local API Connection
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---


