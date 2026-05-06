/**
 * 연구자가 업로드하는 원본 물질 데이터 스키마
 * (JSON 파일 업로드 → AI 시뮬레이션 입력 형식)
 */
export interface SubstanceData {
  // ① 식별 정보
  id: string;
  name: string;
  category: "Terrestrial" | "Marine" | "Hybrid";
  source_origin?: string;

  // ② 화학적/구조적 정보
  smiles?: string;
  molecular_weight?: number;
  active_compounds?: string[];

  // ③ 생물학적 효능
  primary_efficacy: string;
  efficacy_score: number; // 0~100
  target_receptors?: string[];

  // ④ 연구 맥락
  research_summary?: string;
  patent_id?: string;
  safety_level?: "Safe" | "Low Risk" | "Moderate Risk" | "High Risk";
}

export interface UploadedDataset {
  substances: SubstanceData[];
  uploadedAt: string;
  fileName: string;
  terrestrialCount: number;
  marineCount: number;
}

/**
 * 업로드된 SubstanceData → 시뮬레이션 MolecularCandidate 변환
 * (실제 AI 연동 전까지 efficacy_score 기반으로 프로파일 추정)
 */
export function substanceToCandidate(s: SubstanceData) {
  const base = s.efficacy_score;
  const noise = () => Math.max(10, Math.min(99, base + (Math.random() * 30 - 15)));

  return {
    id: s.id,
    composition: s.name,
    source: s.category.toLowerCase() as "terrestrial" | "marine" | "hybrid",
    score: base,
    patentability: s.patent_id
      ? ("High" as const)
      : base > 80
      ? ("Medium" as const)
      : ("Low" as const),
    dockingScore: -(base / 10 + Math.random() * 2),
    efficacyProfile: {
      antiInflammatory: s.primary_efficacy.toLowerCase().includes("inflam") ? base : noise(),
      antioxidant: s.primary_efficacy.toLowerCase().includes("oxid") ? base : noise(),
      antimicrobial: s.primary_efficacy.toLowerCase().includes("micro") || s.primary_efficacy.toLowerCase().includes("bacter") ? base : noise(),
      antitumor: s.primary_efficacy.toLowerCase().includes("tumor") || s.primary_efficacy.toLowerCase().includes("cancer") ? base : noise(),
      neuroprotection: s.primary_efficacy.toLowerCase().includes("neuro") ? base : noise(),
      immunoModulation: s.primary_efficacy.toLowerCase().includes("immun") ? base : noise(),
    },
    admet: {
      absorption: noise(),
      distribution: noise(),
      metabolism: noise(),
      excretion: noise(),
      toxicity: s.safety_level === "Safe" ? Math.floor(Math.random() * 10 + 5)
        : s.safety_level === "Low Risk" ? Math.floor(Math.random() * 15 + 10)
        : s.safety_level === "Moderate Risk" ? Math.floor(Math.random() * 20 + 20)
        : Math.floor(Math.random() * 30 + 30),
    },
  };
}

export function parseUploadedJSON(raw: string, fileName: string): UploadedDataset {
  const parsed = JSON.parse(raw);
  const substances: SubstanceData[] = Array.isArray(parsed) ? parsed : [parsed];

  // 기본 검증
  for (const s of substances) {
    if (!s.id || !s.name || !s.category || !s.primary_efficacy) {
      throw new Error(`필수 필드 누락: id, name, category, primary_efficacy가 필요합니다. (문제 항목: ${s.id ?? "unknown"})`);
    }
    if (typeof s.efficacy_score !== "number" || s.efficacy_score < 0 || s.efficacy_score > 100) {
      throw new Error(`efficacy_score는 0~100 사이의 숫자여야 합니다. (${s.id})`);
    }
  }

  return {
    substances,
    uploadedAt: new Date().toISOString(),
    fileName,
    terrestrialCount: substances.filter((s) => s.category === "Terrestrial").length,
    marineCount: substances.filter((s) => s.category === "Marine").length,
  };
}
