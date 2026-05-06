"""
RDKit 서비스 — SMILES 검증 및 분자 특성 실제 계산
"""
from typing import Optional
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors, Crippen, QED
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D
import base64


def validate_smiles(smiles: str) -> dict:
    """SMILES 유효성 검증"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"valid": False, "error": "유효하지 않은 SMILES 구조입니다."}
    return {"valid": True, "error": None}


def calculate_properties(smiles: str) -> Optional[dict]:
    """
    RDKit 기반 실제 분자 특성 계산
    - 분자량, LogP, HBD/HBA, TPSA, Lipinski 규칙 등
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None

    mw = Descriptors.ExactMolWt(mol)
    logp = Crippen.MolLogP(mol)
    hbd = rdMolDescriptors.CalcNumHBD(mol)   # 수소결합 공여체
    hba = rdMolDescriptors.CalcNumHBA(mol)   # 수소결합 수용체
    tpsa = Descriptors.TPSA(mol)             # 극성 표면적
    rot_bonds = rdMolDescriptors.CalcNumRotatableBonds(mol)
    rings = rdMolDescriptors.CalcNumRings(mol)
    aromatic_rings = rdMolDescriptors.CalcNumAromaticRings(mol)
    heavy_atoms = mol.GetNumHeavyAtoms()
    qed = QED.qed(mol)                       # Drug-likeness 점수 (0~1)

    # Lipinski Rule of Five 체크
    lipinski_violations = sum([
        mw > 500,
        logp > 5,
        hbd > 5,
        hba > 10,
    ])

    # Veber 규칙 (경구 생체이용률)
    veber_ok = tpsa <= 140 and rot_bonds <= 10

    return {
        "molecular_weight": round(mw, 2),
        "logP": round(logp, 2),
        "hbd": hbd,
        "hba": hba,
        "tpsa": round(tpsa, 2),
        "rotatable_bonds": rot_bonds,
        "num_rings": rings,
        "aromatic_rings": aromatic_rings,
        "heavy_atoms": heavy_atoms,
        "qed_score": round(qed, 3),
        "lipinski_violations": lipinski_violations,
        "lipinski_pass": lipinski_violations <= 1,
        "veber_pass": veber_ok,
        "drug_like": lipinski_violations <= 1 and veber_ok,
    }


def smiles_to_svg(smiles: str, width: int = 300, height: int = 200) -> Optional[str]:
    """SMILES → SVG 분자 구조 이미지 (Base64)"""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None

    rdDepictor.Compute2DCoords(mol)
    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    drawer.drawOptions().addStereoAnnotation = True
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()
    return base64.b64encode(svg.encode()).decode()


def screen_lipinski(smiles: str) -> dict:
    """Lipinski Rule of Five 스크리닝"""
    props = calculate_properties(smiles)
    if not props:
        return {"pass": False, "reason": "SMILES 파싱 실패"}

    violations = []
    if props["molecular_weight"] > 500:
        violations.append(f"MW {props['molecular_weight']} > 500")
    if props["logP"] > 5:
        violations.append(f"LogP {props['logP']} > 5")
    if props["hbd"] > 5:
        violations.append(f"HBD {props['hbd']} > 5")
    if props["hba"] > 10:
        violations.append(f"HBA {props['hba']} > 10")

    return {
        "pass": len(violations) <= 1,
        "violations": violations,
        "qed": props["qed_score"],
    }
