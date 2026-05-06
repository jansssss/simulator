"""
AutoDock Vina 서비스 — 실제 분자 도킹 계산
"""
import subprocess
import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional
from rdkit import Chem
from rdkit.Chem import AllChem

VINA_EXECUTABLE = shutil.which("vina") or shutil.which("autodock_vina") or "vina"
WORK_DIR = Path(__file__).parent.parent / "data" / "docking_jobs"
WORK_DIR.mkdir(parents=True, exist_ok=True)


def is_vina_installed() -> bool:
    """AutoDock Vina 설치 여부 확인"""
    try:
        result = subprocess.run(
            [VINA_EXECUTABLE, "--version"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def smiles_to_pdbqt(smiles: str, job_id: str) -> Optional[Path]:
    """
    SMILES → PDBQT 변환 (AutoDock Vina 입력 형식)
    RDKit으로 3D 구조 생성 후 PDBQT 변환
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None

    mol = Chem.AddHs(mol)
    result = AllChem.EmbedMolecule(mol, AllChem.ETKDGv3())
    if result == -1:
        # ETKDGv3 실패 시 fallback
        AllChem.EmbedMolecule(mol)
    AllChem.MMFFOptimizeMolecule(mol)

    # 임시 SDF 저장
    job_dir = WORK_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    sdf_path = job_dir / "ligand.sdf"
    pdbqt_path = job_dir / "ligand.pdbqt"

    writer = Chem.SDWriter(str(sdf_path))
    writer.write(mol)
    writer.close()

    # Open Babel로 PDBQT 변환 (설치되어 있으면)
    babel = shutil.which("obabel") or shutil.which("babel")
    if babel:
        subprocess.run(
            [babel, str(sdf_path), "-O", str(pdbqt_path), "--gen3d"],
            capture_output=True, timeout=30
        )
    else:
        # Open Babel 없을 때: 간단한 PDB → PDBQT 직접 작성
        _write_simple_pdbqt(mol, pdbqt_path)

    return pdbqt_path if pdbqt_path.exists() else None


def _write_simple_pdbqt(mol, path: Path):
    """Open Babel 없을 때 기본 PDBQT 생성"""
    conf = mol.GetConformer()
    lines = ["REMARK  Ligand prepared by RDKit\n"]
    for i, atom in enumerate(mol.GetAtoms()):
        if atom.GetAtomicNum() == 1:
            continue
        pos = conf.GetAtomPosition(i)
        symbol = atom.GetSymbol()
        lines.append(
            f"ATOM  {i+1:5d}  {symbol:<3s} LIG A   1    "
            f"{pos.x:8.3f}{pos.y:8.3f}{pos.z:8.3f}  1.00  0.00          {symbol:>2s}  \n"
        )
    lines.append("TORSDOF 0\n")
    path.write_text("".join(lines))


def prepare_receptor_pdbqt(pdb_path: Path, job_id: str) -> Optional[Path]:
    """
    수용체 PDB → PDBQT 변환
    (MGLTools 또는 Open Babel 사용)
    """
    job_dir = WORK_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    receptor_pdbqt = job_dir / "receptor.pdbqt"

    babel = shutil.which("obabel") or shutil.which("babel")
    if babel:
        subprocess.run(
            [babel, str(pdb_path), "-O", str(receptor_pdbqt),
             "-xr",  # receptor 모드
             "--partialcharge", "gasteiger"],
            capture_output=True, timeout=60
        )

    if not receptor_pdbqt.exists():
        # 간단 처리: PDB에서 ATOM 줄만 추출 + PDBQT 헤더
        lines = ["REMARK  Receptor prepared\n"]
        for line in pdb_path.read_text().splitlines():
            if line.startswith(("ATOM", "HETATM")):
                # PDBQT 포맷에 맞게 부분 전하 추가
                lines.append(line[:66].ljust(66) + "  0.00  XX\n")
        receptor_pdbqt.write_text("".join(lines))

    return receptor_pdbqt


def run_docking(
    ligand_pdbqt: Path,
    receptor_pdbqt: Path,
    binding_site: dict,
    job_id: str,
    exhaustiveness: int = 8,
    num_modes: int = 9,
) -> dict:
    """
    AutoDock Vina 실제 도킹 실행

    binding_site: {"center_x", "center_y", "center_z", "size_x", "size_y", "size_z"}
    exhaustiveness: 탐색 강도 (높을수록 정확, 느림) — 로컬 PC: 8 권장
    """
    if not is_vina_installed():
        return {
            "success": False,
            "error": "AutoDock Vina가 설치되어 있지 않습니다.",
            "install_guide": "https://vina.scripps.edu/downloads/"
        }

    job_dir = WORK_DIR / job_id
    output_pdbqt = job_dir / "output.pdbqt"
    log_file = job_dir / "vina.log"

    cmd = [
        VINA_EXECUTABLE,
        "--receptor", str(receptor_pdbqt),
        "--ligand", str(ligand_pdbqt),
        "--out", str(output_pdbqt),
        "--log", str(log_file),
        "--center_x", str(binding_site["center_x"]),
        "--center_y", str(binding_site["center_y"]),
        "--center_z", str(binding_site["center_z"]),
        "--size_x", str(binding_site.get("size_x", 20)),
        "--size_y", str(binding_site.get("size_y", 20)),
        "--size_z", str(binding_site.get("size_z", 20)),
        "--exhaustiveness", str(exhaustiveness),
        "--num_modes", str(num_modes),
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        scores = _parse_vina_output(log_file)

        return {
            "success": True,
            "best_affinity_kcal_mol": scores[0] if scores else None,
            "all_modes": scores,
            "stdout": proc.stdout,
            "output_file": str(output_pdbqt),
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "도킹 계산 시간 초과 (5분)"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _parse_vina_output(log_file: Path) -> list[float]:
    """Vina 로그에서 결합 에너지(kcal/mol) 파싱"""
    scores = []
    if not log_file.exists():
        return scores
    in_table = False
    for line in log_file.read_text().splitlines():
        if "-----+" in line:
            in_table = True
            continue
        if in_table:
            parts = line.strip().split()
            if parts and parts[0].isdigit():
                try:
                    scores.append(float(parts[1]))
                except (ValueError, IndexError):
                    pass
    return scores
