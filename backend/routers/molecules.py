"""
분자 분석 라우터 — SMILES 검증, 분자 특성, 구조 이미지
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.rdkit_service import (
    validate_smiles, calculate_properties, smiles_to_svg, screen_lipinski
)
from services.admet_service import get_admet

router = APIRouter(prefix="/molecules", tags=["Molecules"])


class SMILESRequest(BaseModel):
    smiles: str


@router.post("/validate")
async def validate(req: SMILESRequest):
    """SMILES 유효성 검증"""
    return validate_smiles(req.smiles)


@router.post("/properties")
async def properties(req: SMILESRequest):
    """실제 분자 특성 계산 (RDKit)"""
    result = calculate_properties(req.smiles)
    if not result:
        raise HTTPException(400, "유효하지 않은 SMILES")
    return result


@router.post("/admet")
async def admet(req: SMILESRequest):
    """실제 ADMET 예측"""
    v = validate_smiles(req.smiles)
    if not v["valid"]:
        raise HTTPException(400, v["error"])
    return await get_admet(req.smiles)


@router.post("/structure-image")
async def structure_image(req: SMILESRequest):
    """분자 구조 SVG 이미지 (Base64)"""
    svg = smiles_to_svg(req.smiles)
    if not svg:
        raise HTTPException(400, "구조 이미지 생성 실패")
    return {"svg_base64": svg}


@router.post("/lipinski")
async def lipinski(req: SMILESRequest):
    """Lipinski Rule of Five 스크리닝"""
    return screen_lipinski(req.smiles)


class BatchRequest(BaseModel):
    substances: list[dict]  # SubstanceData 리스트


@router.post("/batch-analyze")
async def batch_analyze(req: BatchRequest):
    """
    업로드된 물질 전체 배치 분석
    - SMILES 유효성 검증
    - 분자 특성 계산
    - ADMET 예측
    """
    results = []
    for substance in req.substances:
        smiles = substance.get("smiles", "")
        if not smiles:
            results.append({
                "id": substance.get("id"),
                "status": "skipped",
                "reason": "SMILES 없음",
            })
            continue

        v = validate_smiles(smiles)
        if not v["valid"]:
            results.append({
                "id": substance.get("id"),
                "status": "invalid_smiles",
                "reason": v["error"],
            })
            continue

        props = calculate_properties(smiles)
        admet = await get_admet(smiles)
        lipinski = screen_lipinski(smiles)

        results.append({
            "id": substance.get("id"),
            "name": substance.get("name"),
            "status": "ok",
            "properties": props,
            "admet": admet,
            "lipinski": lipinski,
            "drug_like": props.get("drug_like", False) if props else False,
        })

    return {
        "total": len(results),
        "ok": sum(1 for r in results if r["status"] == "ok"),
        "invalid": sum(1 for r in results if r["status"] == "invalid_smiles"),
        "skipped": sum(1 for r in results if r["status"] == "skipped"),
        "results": results,
    }
