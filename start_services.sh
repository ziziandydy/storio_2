#!/bin/bash
lsof -ti :3010 :8010 | xargs kill -9 2>/dev/null || true
cd server
python3 -m uvicorn app.main:app --host 0.0.0.0 --reload --port 8010 > ../backend.log 2>&1 &
cd ../client
npm run dev -- -p 3010 > ../frontend.log 2>&1 &
