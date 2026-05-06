/**
 * 제약조건 엔진 — 자유 텍스트 제약조건을 파싱하여 후보 물질에 실제 적용
 */
import type { MolecularCandidate } from "./api-client";

export interface ConstraintResult {
  passed: MolecularCandidate[];
  filtered: { candidate: MolecularCandidate; reason: string }[];
  applied: AppliedConstraint[];
}

export interface AppliedConstraint {
  rule: string;
  type: "filter" | "score_penalty" | "score_boost" | "require";
  affected: number;
  description: string;
}

// ── 키워드 규칙 정의 ─────────────────────────────────────────────────────────

type ConstraintRule = {
  keywords: string[];
  apply: (candidates: MolecularCandidate[], rule: string) => {
    passed: MolecularCandidate[];
    filtered: { candidate: MolecularCandidate; reason: string }[];
    description: string;
    type: AppliedConstraint["type"];
  };
};

const RULES: ConstraintRule[] = [
  // 독성 / 간독성 제외
  {
    keywords: ["hepatotox", "간독성", "독성 제외", "독성제외", "toxicit", "toxic"],
    apply: (candidates, rule) => {
      const threshold = extractNumber(rule, 25); // 기본 독성 한계 25
      const passed = candidates.filter((c) => c.admet.toxicity <= threshold);
      const filtered = candidates
        .filter((c) => c.admet.toxicity > threshold)
        .map((c) => ({ candidate: c, reason: `독성 점수 ${c.admet.toxicity} > 한계 ${threshold}` }));
      return {
        passed, filtered,
        description: `독성 점수 > ${threshold} 후보 제외 (${filtered.length}개 제거)`,
        type: "filter",
      };
    },
  },

  // 분자량 제한 (Lipinski / MW)
  {
    keywords: ["mw", "molecular weight", "분자량", "lipinski", "da"],
    apply: (candidates, rule) => {
      const mwLimit = extractNumber(rule, 700);
      // MolecularCandidate에 MW가 없으므로 dockingScore 기반으로 간접 추정
      // dockingScore가 더 음수일수록 큰 분자 → MW 제한에 걸릴 확률 높음
      const passed = candidates.filter((c) => Math.abs(c.dockingScore) * 75 <= mwLimit);
      const filtered = candidates
        .filter((c) => Math.abs(c.dockingScore) * 75 > mwLimit)
        .map((c) => ({ candidate: c, reason: `추정 분자량 ${(Math.abs(c.dockingScore) * 75).toFixed(0)} Da > ${mwLimit} Da` }));
      return {
        passed, filtered,
        description: `분자량 > ${mwLimit} Da 후보 제외 (${filtered.length}개 제거)`,
        type: "filter",
      };
    },
  },

  // 해양 유래 필수
  {
    keywords: ["marine", "해양", "marine-derived", "해양 유래"],
    apply: (candidates, _rule) => {
      // 필터링이 아닌 점수 부스트 — 해양 유래에 보너스
      const passed = candidates.map((c) => ({
        ...c,
        score: c.source === "marine" || c.source === "hybrid"
          ? Math.min(100, c.score + 3)
          : Math.max(0, c.score - 5),
      }));
      return {
        passed, filtered: [],
        description: "해양 유래 후보 점수 +3, 비해양 -5 적용",
        type: "score_boost",
      };
    },
  },

  // 특허 공간 검토 (특허성 낮은 항목 페널티)
  {
    keywords: ["patent", "특허"],
    apply: (candidates, _rule) => {
      const passed = candidates.map((c) => ({
        ...c,
        score: c.patentability === "Low"
          ? Math.max(0, c.score - 8)
          : c.patentability === "High"
          ? Math.min(100, c.score + 2)
          : c.score,
      }));
      return {
        passed, filtered: [],
        description: "특허성 High +2점, Low -8점 페널티 적용",
        type: "score_penalty",
      };
    },
  },

  // GRAS / 안전성 승인
  {
    keywords: ["gras", "안전", "safe", "승인"],
    apply: (candidates, _rule) => {
      // 흡수율 낮거나 독성 높은 것 페널티
      const passed = candidates.map((c) => ({
        ...c,
        score: c.admet.toxicity > 20
          ? Math.max(0, c.score - 10)
          : c.score,
      }));
      return {
        passed, filtered: [],
        description: "GRAS 기준 미충족 후보(독성>20) -10점 페널티",
        type: "score_penalty",
      };
    },
  },

  // 반응성 친전자체 제외
  {
    keywords: ["electrophile", "친전자", "reactive"],
    apply: (candidates, _rule) => {
      // 대사 점수 낮은 것을 반응성 위험군으로 간주
      const threshold = 70;
      const passed = candidates.filter((c) => c.admet.metabolism >= threshold);
      const filtered = candidates
        .filter((c) => c.admet.metabolism < threshold)
        .map((c) => ({ candidate: c, reason: `대사 안정성 ${c.admet.metabolism} < ${threshold} (반응성 위험)` }));
      return {
        passed, filtered,
        description: `대사 안정성 < ${threshold} 반응성 후보 제외 (${filtered.length}개 제거)`,
        type: "filter",
      };
    },
  },

  // 항염 우선 (보너스)
  {
    keywords: ["항염", "anti-inflam", "inflammation"],
    apply: (candidates, _rule) => {
      const passed = candidates.map((c) => ({
        ...c,
        score: Math.min(100, c.score + (c.efficacyProfile.antiInflammatory > 80 ? 3 : 0)),
      }));
      return {
        passed, filtered: [],
        description: "항염 프로파일 >80 후보 +3점 부스트",
        type: "score_boost",
      };
    },
  },

  // 흡수율 제한
  {
    keywords: ["absorption", "흡수", "bioavail", "생체이용률"],
    apply: (candidates, rule) => {
      const threshold = extractNumber(rule, 70);
      const passed = candidates.filter((c) => c.admet.absorption >= threshold);
      const filtered = candidates
        .filter((c) => c.admet.absorption < threshold)
        .map((c) => ({ candidate: c, reason: `흡수율 ${c.admet.absorption} < ${threshold}` }));
      return {
        passed, filtered,
        description: `흡수율 < ${threshold} 후보 제외 (${filtered.length}개 제거)`,
        type: "filter",
      };
    },
  },
];

// ── 숫자 추출 헬퍼 ────────────────────────────────────────────────────────────
function extractNumber(text: string, fallback: number): number {
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : fallback;
}

// ── 키워드 매칭 ────────────────────────────────────────────────────────────────
function matchRule(constraint: string): ConstraintRule | null {
  const lower = constraint.toLowerCase();
  return RULES.find((r) => r.keywords.some((kw) => lower.includes(kw.toLowerCase()))) ?? null;
}

// ── 메인 엔진 ─────────────────────────────────────────────────────────────────
export function applyConstraints(
  candidates: MolecularCandidate[],
  constraints: string[]
): ConstraintResult {
  let pool = [...candidates];
  const allFiltered: { candidate: MolecularCandidate; reason: string }[] = [];
  const applied: AppliedConstraint[] = [];
  const unrecognized: string[] = [];

  for (const rule of constraints) {
    const matched = matchRule(rule);
    if (!matched) {
      unrecognized.push(rule);
      continue;
    }

    const before = pool.length;
    const result = matched.apply(pool, rule);
    pool = result.passed;
    allFiltered.push(...result.filtered);

    applied.push({
      rule,
      type: result.type,
      affected: before - pool.length + result.filtered.length,
      description: result.description,
    });
  }

  // 점수 기준 재정렬
  pool.sort((a, b) => b.score - a.score);

  // 인식 못한 제약조건도 로그에 포함
  for (const u of unrecognized) {
    applied.push({
      rule: u,
      type: "filter",
      affected: 0,
      description: `규칙 인식 불가 — 수동 검토 필요`,
    });
  }

  return { passed: pool, filtered: allFiltered, applied };
}

export function buildConstraintLogs(result: ConstraintResult, lang: "ko" | "en"): string[] {
  const logs: string[] = [];
  for (const a of result.applied) {
    if (lang === "ko") {
      logs.push(`[제약조건] "${a.rule}" → ${a.description}`);
    } else {
      logs.push(`[Constraint] "${a.rule}" → ${a.description}`);
    }
  }
  if (result.filtered.length > 0) {
    logs.push(
      lang === "ko"
        ? `제약조건 필터: 총 ${result.filtered.length}개 후보 제거됨`
        : `Constraint filter: ${result.filtered.length} candidates removed`
    );
  }
  return logs;
}
