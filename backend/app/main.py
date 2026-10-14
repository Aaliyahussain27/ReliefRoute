"""
ReliefRoute FastAPI Application Main Entry Point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="ReliefRoute API",
    description="Disaster Relief Supply Allocation, Demand Forecasting, and Multi-Modal Logistics Decision Support System.",
    version="1.0.0",
    lifespan=lifespan
)

# Ensure DB initialized on module import as well
init_db()

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "application": "ReliefRoute",
        "tagline": "Smarter allocation. Faster relief. Fairer recovery.",
        "project": "CEP 8: Disaster Relief Supply Allocation and Logistics",
        "sdgs": ["SDG 2: Zero Hunger", "SDG 3: Good Health and Well-Being", "SDG 11: Sustainable Cities and Communities"],
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
