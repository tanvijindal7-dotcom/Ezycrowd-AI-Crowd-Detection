# Ezycrowd — AI-Driven Smart Crowd Detection & Management System

## Overview

Full-stack crowd detection system with:
- **React dashboard** (frontend) — upload images/video or use live webcam for real-time crowd counting
- **Express API server** (Node.js backend) — detection with realistic simulation, session history, alerts
- **Python FastAPI service** (standalone) — production-grade detection using YOLOv8 + OpenCV, in `ezycrowd-python/`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (Node backend) / FastAPI (Python backend)
- **AI Detection**: YOLOv8 Nano (ultralytics) + OpenCV (Python service)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Validation**: Zod (zod/v4), Pydantic (Python)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project Structure

```
artifacts/
  api-server/          — Node.js/Express API (detection simulation + session management)
  ezycrowd/            — React dashboard frontend
ezycrowd-python/       — Python FastAPI AI backend (YOLOv8 + OpenCV)
lib/
  api-spec/            — OpenAPI spec (source of truth)
  api-client-react/    — Generated React Query hooks
  api-zod/             — Generated Zod schemas
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/ezycrowd run dev` — run React dashboard

## Python Backend Setup

```bash
cd ezycrowd-python
pip install -r requirements.txt
python run.py
```

API available at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

## Features

- POST /detect — upload image or video, get people count + alert status
- Live webcam detection (captures frame every 3s, sends to API)
- Threshold-based alert system (configurable via Settings page)
- Session history with filter by alert status
- Alert log with recency indicators
- Aggregate stats: total sessions, alert rate, peak count
