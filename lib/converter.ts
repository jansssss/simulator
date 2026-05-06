import type { SubstanceData } from "./substance-types";

export type SupportedCategory = "Terrestrial" | "Marine" | "Hybrid";
export type SupportedSafety = "Safe" | "Low Risk" | "Moderate Risk" | "High Risk";

// 스키마 필드 목록 (매핑 대상)
export const SCHEMA_FIELDS = [
  { key: "id",               label: "ID",                    required: true,  type: "string" },
  { key: "name",             label: "물질명 (Name)",          required: true,  type: "string" },
  { key: "category",         label: "출처 구분 (Category)",   required: true,  type: "category" },
  { key: "source_origin",    label: "기원 (Source Origin)",   required: false, type: "string" },
  { key: "smiles",           label: "SMILES",                required: false, type: "string" },
  { key: "molecular_weight", label: "분자량 (MW)",            required: false, type: "number" },
  { key: "active_compounds", label: "지표성분 (Active Compounds)", required: false, type: "array" },
  { key: "primary_efficacy", label: "주요 효능 (Efficacy)",   required: true,  type: "string" },
  { key: "efficacy_score",   label: "효능 점수 (0~100)",      required: true,  type: "number" },
  { key: "target_receptors", label: "타겟 수용체",            required: false, type: "array" },
  { key: "research_summary", label: "연구 요약",              required: false, type: "string" },
  { key: "patent_id",        label: "특허 번호",              required: false, type: "string" },
  { key: "safety_level",     label: "안전성 등급",            required: false, type: "safety" },
] as const;

export type SchemaKey = (typeof SCHEMA_FIELDS)[number]["key"];

// 열 매핑: 원본 컬럼명 → 스키마 키
export type ColumnMapping = Record<string, SchemaKey | "__skip__">;

// ── CSV 파싱 ────────────────────────────────────────────────────────────────
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV에 데이터가 없습니다.");

  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Excel 파싱 (xlsx 라이브러리) ────────────────────────────────────────────
export async function parseExcel(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rawRows.length < 2) throw new Error("Excel 파일에 데이터가 없습니다.");

  const headers = rawRows[0].map(String);
  const rows = rawRows.slice(1).map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, String(row[i] ?? "")]))
  );
  return { headers, rows };
}

// ── 자동 매핑 추론 ──────────────────────────────────────────────────────────
const AUTO_MAP_HINTS: Record<SchemaKey, string[]> = {
  id:               ["id", "번호", "no", "code", "코드"],
  name:             ["name", "물질명", "명칭", "성분명", "compound", "물질"],
  category:         ["category", "출처", "구분", "type", "종류"],
  source_origin:    ["origin", "기원", "산지", "출처지", "source"],
  smiles:           ["smiles", "smile", "구조"],
  molecular_weight: ["mw", "molecular_weight", "분자량", "weight"],
  active_compounds: ["active", "지표성분", "성분", "compounds", "active_compounds"],
  primary_efficacy: ["efficacy", "효능", "primary", "주요효능", "기능"],
  efficacy_score:   ["score", "점수", "efficacy_score", "효능점수"],
  target_receptors: ["receptor", "수용체", "target", "타겟"],
  research_summary: ["summary", "요약", "research", "연구요약", "description", "설명"],
  patent_id:        ["patent", "특허", "patent_id", "특허번호"],
  safety_level:     ["safety", "안전성", "독성", "toxicity", "safety_level"],
};

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<SchemaKey>();

  for (const header of headers) {
    const lower = header.toLowerCase().replace(/[\s_-]/g, "");
    let matched: SchemaKey | null = null;

    for (const [key, hints] of Object.entries(AUTO_MAP_HINTS) as [SchemaKey, string[]][]) {
      if (used.has(key)) continue;
      if (hints.some((h) => lower.includes(h.toLowerCase().replace(/[\s_-]/g, "")))) {
        matched = key;
        break;
      }
    }

    mapping[header] = matched ?? "__skip__";
    if (matched) used.add(matched);
  }
  return mapping;
}

// ── 행 → SubstanceData 변환 ─────────────────────────────────────────────────
export function convertRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): { data: SubstanceData[]; errors: string[] } {
  const data: SubstanceData[] = [];
  const errors: string[] = [];

  const invertedMap: Partial<Record<SchemaKey, string>> = {};
  for (const [col, key] of Object.entries(mapping)) {
    if (key !== "__skip__") invertedMap[key] = col;
  }

  const getCol = (row: Record<string, string>, key: SchemaKey): string =>
    (invertedMap[key] ? row[invertedMap[key]!] : "") ?? "";

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 헤더 포함 행 번호
    try {
      const id = getCol(row, "id").trim();
      const name = getCol(row, "name").trim();
      const categoryRaw = getCol(row, "category").trim();
      const efficacyRaw = getCol(row, "primary_efficacy").trim();
      const scoreRaw = getCol(row, "efficacy_score").trim();

      if (!id) { errors.push(`행 ${rowNum}: id가 비어 있습니다.`); return; }
      if (!name) { errors.push(`행 ${rowNum}: name이 비어 있습니다.`); return; }
      if (!efficacyRaw) { errors.push(`행 ${rowNum}: primary_efficacy가 비어 있습니다.`); return; }

      const score = parseFloat(scoreRaw);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push(`행 ${rowNum} (${id}): efficacy_score가 0~100 사이의 숫자여야 합니다. 현재값: "${scoreRaw}"`);
        return;
      }

      const category = normalizeCategory(categoryRaw);
      const safetyRaw = getCol(row, "safety_level").trim();
      const activeRaw = getCol(row, "active_compounds").trim();
      const receptorRaw = getCol(row, "target_receptors").trim();

      data.push({
        id,
        name,
        category,
        source_origin: getCol(row, "source_origin").trim() || undefined,
        smiles: getCol(row, "smiles").trim() || undefined,
        molecular_weight: parseFloat(getCol(row, "molecular_weight")) || undefined,
        active_compounds: activeRaw ? activeRaw.split(/[,;|]+/).map((s) => s.trim()).filter(Boolean) : undefined,
        primary_efficacy: efficacyRaw,
        efficacy_score: score,
        target_receptors: receptorRaw ? receptorRaw.split(/[,;|]+/).map((s) => s.trim()).filter(Boolean) : undefined,
        research_summary: getCol(row, "research_summary").trim() || undefined,
        patent_id: getCol(row, "patent_id").trim() || undefined,
        safety_level: normalizeSafety(safetyRaw),
      } satisfies SubstanceData);
    } catch (e) {
      errors.push(`행 ${rowNum}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    }
  });

  return { data, errors };
}

function normalizeCategory(raw: string): SupportedCategory {
  const lower = raw.toLowerCase();
  if (lower.includes("marine") || lower.includes("해양")) return "Marine";
  if (lower.includes("hybrid") || lower.includes("하이브리드") || lower.includes("융합")) return "Hybrid";
  return "Terrestrial";
}

function normalizeSafety(raw: string): SupportedSafety | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.includes("safe") || lower.includes("안전")) return "Safe";
  if (lower.includes("low") || lower.includes("낮")) return "Low Risk";
  if (lower.includes("moderate") || lower.includes("중간") || lower.includes("보통")) return "Moderate Risk";
  if (lower.includes("high") || lower.includes("높")) return "High Risk";
  return undefined;
}
