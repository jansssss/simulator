"""
PDB 서비스 — 타겟 단백질 구조 파일 관리 및 자동 다운로드
"""
import os
import requests
from pathlib import Path

PDB_DIR = Path(__file__).parent.parent / "data" / "pdb"
PDB_DIR.mkdir(parents=True, exist_ok=True)

# 주요 타겟 단백질 사전 정의
# Ph.D 연구자가 효능별로 선택할 수 있도록 큐레이션
TARGET_CATALOG = {
    # 항염증
    "anti_inflammatory": [
        {
            "pdb_id": "5IKR",
            "name": "COX-2 (Cyclooxygenase-2)",
            "name_ko": "사이클로옥시게나아제-2",
            "organism": "Homo sapiens",
            "resolution": "2.40 Å",
            "description": "비스테로이드성 항염증제(NSAID)의 주요 타겟. 관절염, 염증성 통증 치료.",
            "binding_site": {"center_x": 22.0, "center_y": 5.5, "center_z": 18.5, "size_x": 20, "size_y": 20, "size_z": 20},
        },
        {
            "pdb_id": "2AZ5",
            "name": "TNF-α (Tumor Necrosis Factor)",
            "name_ko": "종양괴사인자-알파",
            "organism": "Homo sapiens",
            "resolution": "2.10 Å",
            "description": "자가면역질환 및 만성 염증의 핵심 사이토카인.",
            "binding_site": {"center_x": 0.0, "center_y": 0.0, "center_z": 0.0, "size_x": 25, "size_y": 25, "size_z": 25},
        },
    ],
    # 항산화
    "antioxidant": [
        {
            "pdb_id": "4IQK",
            "name": "Nrf2-Keap1",
            "name_ko": "핵인자 적혈구 유래 인자 2",
            "organism": "Homo sapiens",
            "resolution": "2.00 Å",
            "description": "산화 스트레스 방어 경로의 마스터 조절자.",
            "binding_site": {"center_x": 10.0, "center_y": -5.0, "center_z": 8.0, "size_x": 22, "size_y": 22, "size_z": 22},
        },
    ],
    # 항종양
    "antitumor": [
        {
            "pdb_id": "1IEP",
            "name": "BCR-ABL Kinase",
            "name_ko": "BCR-ABL 키나아제",
            "organism": "Homo sapiens",
            "resolution": "2.10 Å",
            "description": "만성 골수성 백혈병(CML) 타겟. 이마티닙(글리벡) 타겟.",
            "binding_site": {"center_x": 15.5, "center_y": 38.0, "center_z": 45.5, "size_x": 22, "size_y": 22, "size_z": 22},
        },
        {
            "pdb_id": "2LZM",
            "name": "BCL-2",
            "name_ko": "B세포 림프종 단백질-2",
            "organism": "Homo sapiens",
            "resolution": "1.70 Å",
            "description": "세포 사멸(apoptosis) 억제 단백질. 항암 타겟.",
            "binding_site": {"center_x": 0.0, "center_y": 0.0, "center_z": 0.0, "size_x": 25, "size_y": 25, "size_z": 25},
        },
    ],
    # 항균
    "antimicrobial": [
        {
            "pdb_id": "1KZN",
            "name": "DNA Gyrase B",
            "name_ko": "DNA 자이라아제 B",
            "organism": "Staphylococcus aureus",
            "resolution": "2.30 Å",
            "description": "세균 DNA 복제 필수 효소. 광범위 항균 타겟.",
            "binding_site": {"center_x": -5.0, "center_y": 12.0, "center_z": 3.0, "size_x": 25, "size_y": 25, "size_z": 25},
        },
    ],
    # 신경보호
    "neuroprotection": [
        {
            "pdb_id": "1S9I",
            "name": "Acetylcholinesterase",
            "name_ko": "아세틸콜린에스테라아제",
            "organism": "Homo sapiens",
            "resolution": "2.15 Å",
            "description": "알츠하이머병 치료 타겟. 도네페질, 리바스티그민 타겟.",
            "binding_site": {"center_x": -4.5, "center_y": 14.0, "center_z": 62.0, "size_x": 20, "size_y": 20, "size_z": 20},
        },
    ],
    # 면역조절
    "immunomodulation": [
        {
            "pdb_id": "3QIB",
            "name": "JAK1 Kinase",
            "name_ko": "야누스 키나아제 1",
            "organism": "Homo sapiens",
            "resolution": "2.25 Å",
            "description": "면역 신호전달 핵심 키나아제. 류마티스관절염, 아토피 타겟.",
            "binding_site": {"center_x": 20.0, "center_y": -8.0, "center_z": 35.0, "size_x": 22, "size_y": 22, "size_z": 22},
        },
    ],
}

# 효능명 → 카탈로그 키 매핑 (한/영)
EFFICACY_MAP = {
    "anti-inflammatory": "anti_inflammatory",
    "항염증": "anti_inflammatory",
    "항염": "anti_inflammatory",
    "antioxidant": "antioxidant",
    "항산화": "antioxidant",
    "antitumor": "antitumor",
    "항종양": "antitumor",
    "항암": "antitumor",
    "antimicrobial": "antimicrobial",
    "항균": "antimicrobial",
    "neuroprotection": "neuroprotection",
    "신경보호": "neuroprotection",
    "immunomodulation": "immunomodulation",
    "면역조절": "immunomodulation",
}


def get_targets_for_efficacy(efficacy: str) -> list:
    """효능 이름으로 적합한 타겟 단백질 목록 반환"""
    key = EFFICACY_MAP.get(efficacy.lower(), None)
    if not key:
        # 부분 매칭
        for k, v in EFFICACY_MAP.items():
            if k in efficacy.lower() or efficacy.lower() in k:
                key = v
                break
    return TARGET_CATALOG.get(key, [])


def download_pdb(pdb_id: str) -> Path:
    """RCSB PDB에서 단백질 구조 파일 자동 다운로드"""
    pdb_id = pdb_id.upper()
    local_path = PDB_DIR / f"{pdb_id}.pdb"

    if local_path.exists():
        return local_path

    url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        raise FileNotFoundError(f"PDB {pdb_id}를 다운로드할 수 없습니다. (HTTP {resp.status_code})")

    local_path.write_bytes(resp.content)
    return local_path


def list_downloaded_pdbs() -> list[str]:
    """이미 다운로드된 PDB 파일 목록"""
    return [f.stem for f in PDB_DIR.glob("*.pdb")]
