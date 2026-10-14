# ReliefRoute

ReliefRoute is a local disaster-relief logistics decision-support prototype. It provides a dashboard for relief centers and warehouses, demand estimates, supply allocation, delivery planning, scenario comparisons, and report exports.

The frontend uses React, TypeScript, Vite, Tailwind CSS, Recharts, and Leaflet. The backend is a FastAPI service with a SQLite database and a custom allocation optimizer. The database is initialized with sample data when the backend starts; sample data is fictional.

## Requirements

- Python 3.10 or newer
- Node.js and npm

## Run locally

Open two terminals from the project folder.

### 1. Start the backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

If PowerShell prevents virtual-environment activation, allow it for the current terminal and activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

The API runs at <http://localhost:8000>. Interactive API documentation is at <http://localhost:8000/docs>.

### 2. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually <http://localhost:5173>. Keep both terminals running while using the app.

## Tests

From the backend folder, with its virtual environment active:

```powershell
pytest
```

To type-check and build the frontend:

```powershell
cd frontend
npm run build
```
