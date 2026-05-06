"""
도킹 라우터 — 타겟 단백질 선택, PDB 다운로드, AutoDock Vina 실행
"""
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from services.pdb_service import (
    get_targets_for_efficacy, download_pdb, list_downloaded_pdbs, TARGET_CATALOG
)
from services.vina_service import (
    is_vina_installed, smiles_to_pdbqt,
    prepare_receptor_pdbqt, run_docking
)
from services.rdkit_service import validate_smiles

router = APIRouter(prefix="/docking", tags=["Docking"])

# 진행 중인 도킹 작업 상태 저장
_jobs: dict[str, dict] = {}


@router.get("/status")
async def docking_status():
    """AutoDock Vina 설치 여부 + 환경 상태"""
    return {
        "vina_installed": is_vina_installed(),
        "downloaded_pdbs": list_downloaded_pdbs(),
        "install_guide": "https://vina.scripps.edu/downloads/" if not is_vina_installed() else None,
    }


@router.get("/targets")
async def get_all_targets():
    """전체 타겟 단백질 카탈로그"""
    return TARGET_CATALOG


@router.get("/targets/{efficacy}")
async def get_targets(efficacy: str):
    """효능별 추천 타겟 단백질 목록"""
    targets = get_targets_for_efficacy(efficacy)
    if not targets:
        return {
            "efficacy": efficacy,
            "targets": [],
            "message": "해당 효능에 대한 사전 등록 타겟이 없습니다. PDB ID를 직접 입력하세요.",
        }
    return {"efficacy": efficacy, "targets": targets}


class DownloadPDBRequest(BaseModel):
    pdb_id: str


@router.post("/download-pdb")
async def download_pdb_endpoint(req: DownloadPDBRequest):
    """RCSB PDB에서 단백질 구조 파일 다운로드"""
    try:
        path = download_pdb(req.pdb_id)
        return {
            "success": True,
            "pdb_id": req.pdb_id.upper(),
            "path": str(path),
            "size_kb": round(path.stat().st_size / 1024, 1),
        }
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


class DockingRequest(BaseModel):
    smiles: str
    substance_id: str
    substance_name: str
    pdb_id: str
    binding_site: Optional[dict] = None   # 미입력 시 카탈로그 기본값 사용
    exhaustiveness: int = 8               # 로컬 PC 권장값


class BatchDockingRequest(BaseModel):
    substances: list[dict]   # [{id, name, smiles}, ...]
    pdb_id: str
    binding_site: Optional[dict] = None
    exhaustiveness: int = 8


@router.post("/run")
async def run_single_docking(req: DockingRequest, background_tasks: BackgroundTasks):
    """단일 물질 도킹 실행 (비동기)"""
    v = validate_smiles(req.smiles)
    if not v["valid"]:
        raise HTTPException(400, f"유효하지 않은 SMILES: {v['error']}")

    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {
        "status": "queued",
        "substance_id": req.substance_id,
        "substance_name": req.substance_name,
        "pdb_id": req.pdb_id,
        "progress": 0,
    }

    background_tasks.add_task(_execute_docking, job_id, req)
    return {"job_id": job_id, "status": "queued"}


@router.post("/run-batch")
async def run_batch_docking(req: BatchDockingRequest, background_tasks: BackgroundTasks):
    """복수 물질 배치 도킹 (Top 10 등)"""
    batch_id = str(uuid.uuid4())[:8]
    job_ids = []

    for substance in req.substances:
        smiles = substance.get("smiles", "")
        if not smiles:
            continue
        job_id = f"{batch_id}_{substance.get('id', 'unk')}"
        _jobs[job_id] = {
            "status": "queued",
            "substance_id": substance.get("id"),
            "substance_name": substance.get("name"),
            "pdb_id": req.pdb_id,
            "progress": 0,
            "batch_id": batch_id,
        }
        single_req = DockingRequest(
            smiles=smiles,
            substance_id=substance.get("id", ""),
            substance_name=substance.get("name", ""),
            pdb_id=req.pdb_id,
            binding_site=req.binding_site,
            exhaustiveness=req.exhaustiveness,
        )
        background_tasks.add_task(_execute_docking, job_id, single_req)
        job_ids.append(job_id)

    return {
        "batch_id": batch_id,
        "job_ids": job_ids,
        "total": len(job_ids),
        "status": "queued",
    }


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """도킹 작업 상태 조회"""
    if job_id not in _jobs:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    return _jobs[job_id]


@router.get("/jobs")
async def list_jobs():
    """전체 도킹 작업 목록"""
    return list(_jobs.values())


async def _execute_docking(job_id: str, req: DockingRequest):
    """실제 도킹 실행 (백그라운드)"""
    from services.pdb_service import download_pdb, get_targets_for_efficacy, PDB_DIR
    from pathlib import Path

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["progress"] = 10

    try:
        # 1. PDB 파일 확보
        pdb_path = PDB_DIR / f"{req.pdb_id.upper()}.pdb"
        if not pdb_path.exists():
            pdb_path = download_pdb(req.pdb_id)
        _jobs[job_id]["progress"] = 25

        # 2. 결합 부위 정보
        binding_site = req.binding_site
        if not binding_site:
            # 카탈로그에서 찾기
            for targets in TARGET_CATALOG.values():
                for t in targets:
                    if t["pdb_id"] == req.pdb_id.upper():
                        binding_site = t["binding_site"]
                        break
            if not binding_site:
                binding_site = {"center_x": 0, "center_y": 0, "center_z": 0,
                                "size_x": 25, "size_y": 25, "size_z": 25}

        # 3. 리간드 PDBQT 생성
        ligand_pdbqt = smiles_to_pdbqt(req.smiles, job_id)
        if not ligand_pdbqt:
            raise Exception("리간드 PDBQT 변환 실패")
        _jobs[job_id]["progress"] = 40

        # 4. 수용체 PDBQT 생성
        receptor_pdbqt = prepare_receptor_pdbqt(pdb_path, job_id)
        _jobs[job_id]["progress"] = 55

        # 5. Vina 도킹 실행
        result = run_docking(
            ligand_pdbqt=ligand_pdbqt,
            receptor_pdbqt=receptor_pdbqt,
            binding_site=binding_site,
            job_id=job_id,
            exhaustiveness=req.exhaustiveness,
        )
        _jobs[job_id]["progress"] = 100
        _jobs[job_id]["status"] = "completed" if result["success"] else "failed"
        _jobs[job_id]["result"] = result

    except Exception as e:
        _jobs[job_id]["status"] = "failed"
        _jobs[job_id]["error"] = str(e)
