Iraq Internal Customs System (B/C + iPhone PWA)

- backend/: FastAPI API + SQLite (dev) / PostgreSQL-ready pattern
- web/: PWA frontend (works on iPhone)
- docker-compose.yml: run on internal server or cloud

Dev (SQLite):
  cd backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  python seed_db.py --tsc ../data/TSC_2025-10-13.json
  uvicorn main:app --host 0.0.0.0 --port 8000

Docker:
  docker compose up -d --build
  API: http://SERVER:8000
  Web: http://SERVER:8080