[PRD]
# PRD: Production Deployment (v1.0)

## Overview
Launch the first production-ready version of Storio 2 on Vercel. This includes configuring the infrastructure, ensuring security, and optimizing for real-world traffic.

## Goals
- Unified deployment on Vercel (Frontend & Backend).
- Secure environment variable management.
- Reliable connection to Supabase Production instance.
- Verified Auth flow on live domain.

## Deployment Checklist

### 1. Backend Adaption (Vercel Serverless)
- [ ] Create `api/index.py` as the Vercel entry point.
- [ ] Move/Refactor `server` logic to be compatible with Vercel Python runtime.
- [ ] Ensure all dependencies are in `requirements.txt`.

### 2. Frontend Configuration
- [ ] Update `.env.production` with live API URL.
- [ ] Configure `next.config.js` for production image optimization.
- [ ] Ensure `useTranslation` and `useSettingsStore` handle hydrate correctly.

### 3. Database & Auth (Supabase)
- [ ] (Optional) Provision a new Supabase Project for Production.
- [ ] Apply current `db_schema.sql` to the production DB.
- [ ] Add the live Vercel URL to Supabase Auth -> Redirect URLs.

### 4. Domain & CORS
- [ ] Configure custom domain (if any).
- [ ] Update FastAPI CORS middleware to only allow requests from the live domain.

## Technical Implementation (Proposed Vercel Layout)
```
storio_2/
├── api/ (Backend entry for Vercel)
│   └── index.py -> points to server.app.main:app
├── client/ (Next.js Frontend)
├── server/ (Core Logic)
└── vercel.json (Deployment Config)
```

## Non-Goals for v1.0
- Dockerizing (Vercel is easier for now).
- Multiple backend instances (Stick to serverless).
- Database migration tools like Alembic (Manual SQL for v1).

## Quality Gates
- `npm run build` passes locally.
- Backend tests (`pytest`) pass against a test DB.
- Manual UAT on Vercel Preview deployment.
[/PRD]
