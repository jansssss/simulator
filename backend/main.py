"""
Bio-R&D Orchestration — Python FastAPI 백엔드
실제 분자 시뮬레이션 엔진 (RDKit + AutoDock Vina + ADMET)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import molecules, docking

app = FastAPI(
    title="Bio-R&D Simulation Engine",
    description="실제 분자 도킹 및 ADMET 예측 API (RDKit + AutoDock Vina)",
    version="1.0.0",
)

# Next.js (localhost:3000) 에서의 요청 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(molecules.router)
app.include_router(docking.router)


@app.get("/")
async def root():
    return {
        "service": "Bio-R&D Simulation Engine",
        "version": "1.0.0",
        "endpoints": {
            "molecules": "/molecules",
            "docking": "/docking",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health():
    from services.vina_service import is_vina_installed
    from services.pdb_service import list_downloaded_pdbs
    return {
        "status": "ok",
        "vina_installed": is_vina_installed(),
        "downloaded_pdbs": list_downloaded_pdbs(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
