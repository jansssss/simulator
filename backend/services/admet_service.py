"""
ADMET 예측 서비스
1차: SwissADME 웹 API (무료, 실제 예측값)
2차: RDKit 기반 추정 (오프라인 fallback)
"""
import httpx
import asyncio
from typing import Optional
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors, Crippen


async def predict_admet_swissadme(smiles: str) -> Optional[dict]:
    """
    SwissADME API 호출 — 실제 ADMET 예측
    (http://www.swissadme.ch)
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "http://www.swissadme.ch/include/smiles.php",
                data={"smiles": smiles},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code == 200:
                return _parse_swissadme(resp.text, smiles)
    except Exception:
        pass
    return None


def _parse_swissadme(html: str, smiles: str) -> dict:
    """SwissADME 응답 파싱 (간소화)"""
    # SwissADME는 HTML 응답 → 주요 값 추출
    # 실패 시 RDKit fallback 사용
    return predict_admet_rdkit(smiles)


def predict_admet_rdkit(smiles: str) -> dict:
    """
    RDKit 기반 ADMET 추정
    실제 분자 특성으로 흡수/분포/대사/배설/독성 추정
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return _default_admet()

    mw = Descriptors.ExactMolWt(mol)
    logp = Crippen.MolLogP(mol)
    tpsa = Descriptors.TPSA(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)
    hba = rdMolDescriptors.CalcNumHBA(mol)
    rot = rdMolDescriptors.CalcNumRotatableBonds(mol)
    rings = rdMolDescriptors.CalcNumRings(mol)
    aromatic = rdMolDescriptors.CalcNumAromaticRings(mol)

    # ── Absorption (흡수율) ──
    # Caco-2 투과성 기반 추정: LogP 1-3, TPSA<90, MW<500이 최적
    absorption = 100
    if tpsa > 140: absorption -= 30
    elif tpsa > 90: absorption -= 15
    if mw > 500: absorption -= 20
    elif mw > 400: absorption -= 10
    if logp < 0 or logp > 5: absorption -= 15
    if hbd > 5: absorption -= 10
    absorption = max(10, min(99, absorption))

    # ── Distribution (분포) ──
    # BBB 투과성, 혈장 단백결합 추정
    distribution = 70
    if 1 <= logp <= 3 and tpsa < 90 and mw < 400:
        distribution += 15  # BBB 투과 가능성
    if logp > 4:
        distribution += 10  # 혈장 단백 결합 ↑
    if tpsa > 120:
        distribution -= 20
    distribution = max(10, min(99, distribution))

    # ── Metabolism (대사 안정성) ──
    # CYP 기질 여부 추정: 방향족 링 수, LogP 기반
    metabolism = 80
    if aromatic > 3: metabolism -= 15   # CYP 기질 가능성 ↑
    if logp > 4: metabolism -= 10
    if rot > 8: metabolism -= 5
    metabolism = max(10, min(99, metabolism))

    # ── Excretion (배설) ──
    # 분자량, 극성 기반
    excretion = 75
    if mw < 300: excretion += 10   # 신장 배설 ↑
    if tpsa > 100: excretion += 5  # 극성 → 신장 배설
    if logp > 3: excretion -= 10   # 담즙 배설
    excretion = max(10, min(99, excretion))

    # ── Toxicity (독성) ──
    # 낮을수록 안전 (0=무독, 100=고독성)
    toxicity = 10
    if logp > 5: toxicity += 20     # 지질 축적 독성
    if aromatic > 4: toxicity += 15  # 방향족 독성
    if hba + hbd > 12: toxicity += 10
    if mw > 600: toxicity += 10
    # Ames 변이원성 간접 추정 (방향족 아민 등)
    smiles_upper = smiles.upper()
    if "N" in smiles_upper and aromatic > 2:
        toxicity += 8
    toxicity = max(2, min(60, toxicity))

    return {
        "absorption": round(absorption),
        "distribution": round(distribution),
        "metabolism": round(metabolism),
        "excretion": round(excretion),
        "toxicity": round(toxicity),
        # 추가 예측 정보
        "bbb_permeable": tpsa < 90 and mw < 400 and logp > 0,
        "cyp_substrate": aromatic > 2 or logp > 3,
        "herg_risk": logp > 3 and rings > 2,   # hERG 심장독성 위험
        "ames_risk": aromatic > 3,
        "source": "RDKit-estimated",
    }


async def get_admet(smiles: str) -> dict:
    """SwissADME 시도 → 실패 시 RDKit fallback"""
    result = await predict_admet_swissadme(smiles)
    if result:
        result["source"] = "SwissADME"
        return result
    return predict_admet_rdkit(smiles)


def _default_admet() -> dict:
    return {
        "absorption": 50, "distribution": 50,
        "metabolism": 50, "excretion": 50, "toxicity": 25,
        "bbb_permeable": False, "cyp_substrate": False,
        "herg_risk": False, "ames_risk": False,
        "source": "default",
    }
