# Ezycrowd — AI-Driven Smart Crowd Detection & Management System

Ezycrowd uses **YOLOv8** (pretrained on COCO) and **OpenCV** to count people in uploaded images or video files. When the count exceeds a configurable threshold, an alert is triggered. A React dashboard provides upload, live webcam detection, history, and analytics.

---

## Project Structure

```
ezycrowd-python/          ← Python FastAPI backend (AI detection engine)
├── app/
│   ├── main.py           ← FastAPI app factory, CORS, router mounting
│   ├── models/
│   │   └── schemas.py    ← Pydantic request/response models
│   ├── routes/
│   │   ├── detect.py     ← POST /detect, GET/PUT /detect/threshold
│   │   ├── sessions.py   ← GET /sessions, GET /sessions/{id}
│   │   ├── alerts.py     ← GET /alerts
│   │   └── stats.py      ← GET /stats/summary
│   ├── services/
│   │   ├── detection.py  ← YOLOv8 + OpenCV inference logic
│   │   └── storage.py    ← In-memory session/alert store
│   └── utils/
│       └── logging_config.py  ← Structured logging setup
├── tests/
│   └── test_detect.py    ← pytest test suite
├── run.py                ← Uvicorn entry point
├── requirements.txt      ← Python dependencies
└── README.md

artifacts/ezycrowd/       ← React + Vite frontend dashboard
```

---

## Requirements

- Python 3.10+
- pip
- (Optional) virtualenv / conda

---

## Setup & Run

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ezycrowd.git
cd ezycrowd/ezycrowd-python
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `ultralytics` will automatically download the `yolov8n.pt` pretrained weights (~6 MB) on the first run.

### 4. Configure environment variables (optional)

```bash
cp .env.example .env
# Edit .env as needed
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Port to bind the API server |
| `HOST` | `0.0.0.0` | Host to bind |
| `LOG_LEVEL` | `INFO` | Log level (DEBUG, INFO, WARNING, ERROR) |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS allowed origins |
| `RELOAD` | `false` | Enable auto-reload for development |

### 5. Run the server

```bash
python run.py
```

Or with Uvicorn directly:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API is now available at **http://localhost:8000**. Interactive docs at **http://localhost:8000/docs**.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `POST` | `/detect` | Upload image/video → people count + alert |
| `GET` | `/detect/threshold` | Get current alert threshold |
| `PUT` | `/detect/threshold` | Update alert threshold |
| `GET` | `/sessions` | List detection sessions |
| `GET` | `/sessions/{id}` | Get specific session |
| `GET` | `/alerts` | List triggered alerts |
| `GET` | `/stats/summary` | Aggregate statistics |

---

## Sample Test Instructions

### Using curl

**Health check:**
```bash
curl http://localhost:8000/healthz
```

**Detect crowd in an image:**
```bash
curl -X POST http://localhost:8000/detect \
  -F "file=@/path/to/crowd.jpg" \
  -F "threshold=5"
```

**Update alert threshold to 15 people:**
```bash
curl -X PUT http://localhost:8000/detect/threshold \
  -H "Content-Type: application/json" \
  -d '{"threshold": 15}'
```

**List recent sessions:**
```bash
curl "http://localhost:8000/sessions?limit=10"
```

**Get statistics summary:**
```bash
curl http://localhost:8000/stats/summary
```

### Using pytest

```bash
cd ezycrowd-python
pytest tests/ -v
```

---

## Live Webcam Detection (Frontend)

The React dashboard includes a **Live Webcam** mode:

1. Open the dashboard at `http://localhost:PORT`
2. Click **Live Webcam** in the upload panel
3. Grant camera permission
4. The app captures a frame every 3 seconds and POSTs it to `/detect`
5. The people count and alert status update in real time

---

## Architecture Decisions

- **YOLOv8n** — nano model chosen for speed on CPU. Swap to `yolov8m.pt` or `yolov8l.pt` for higher accuracy.
- **In-memory storage** — sessions and alerts are stored in Python dicts for simplicity. For production, replace `app/services/storage.py` with PostgreSQL / Redis.
- **File-type routing** — images go through single-frame inference; videos are sampled every 30 frames, and the peak detection is returned.
- **CORS** — wildcard in development; set `ALLOWED_ORIGINS` to your production frontend URL before deploying.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

## License

MIT
