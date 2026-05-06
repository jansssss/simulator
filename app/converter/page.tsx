"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Upload, FileSpreadsheet, FileJson, ArrowLeft, ArrowRight,
  Download, CheckCircle, AlertCircle, RefreshCw, ChevronDown, X, Dna
} from "lucide-react";
import {
  SCHEMA_FIELDS, parseCSV, parseExcel, autoDetectMapping, convertRows,
  type ColumnMapping, type SchemaKey,
} from "@/lib/converter";
import type { SubstanceData } from "@/lib/substance-types";

type Step = "upload" | "mapping" | "preview" | "done";

export default function ConverterPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [converted, setConverted] = useState<SubstanceData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setParseError(null);
    try {
      let result: { headers: string[]; rows: Record<string, string>[] };

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        result = parseCSV(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        result = await parseExcel(buffer);
      } else {
        throw new Error(".csv, .xlsx, .xls 파일만 지원합니다.");
      }

      setFileName(file.name);
      setHeaders(result.headers);
      setRawRows(result.rows);
      setMapping(autoDetectMapping(result.headers));
      setStep("mapping");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "파일 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConvert = () => {
    const { data, errors: errs } = convertRows(rawRows, mapping);
    setConverted(data);
    setErrors(errs);
    setStep("preview");
  };

  const handleDownload = () => {
    const json = JSON.stringify(converted, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.(xlsx?|csv)$/i, "") + "_converted.json";
    a.click();
    URL.revokeObjectURL(url);
    setStep("done");
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setConverted([]);
    setErrors([]);
    setParseError(null);
  };

  const requiredFields = SCHEMA_FIELDS.filter((f) => f.required).map((f) => f.key);
  const mappedRequiredFields = requiredFields.filter((key) =>
    Object.values(mapping).includes(key as SchemaKey)
  );
  const canConvert = mappedRequiredFields.length === requiredFields.length;

  return (
    <div className="min-h-screen bg-[#020817] text-slate-200 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-4 border-b border-slate-800 bg-slate-950/80">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors text-sm">
          <ArrowLeft size={14} />
          <span>대시보드로 돌아가기</span>
        </Link>
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <FileSpreadsheet size={14} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-100 uppercase">데이터 변환기</h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">Excel / CSV → JSON Converter</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-2">
          {(["upload", "mapping", "preview", "done"] as Step[]).map((s, i) => {
            const labels: Record<Step, string> = { upload: "파일 업로드", mapping: "컬럼 매핑", preview: "검토", done: "완료" };
            const current = ["upload", "mapping", "preview", "done"].indexOf(step);
            const idx = i;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${idx <= current ? "text-emerald-400" : "text-slate-600"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx < current ? "bg-emerald-500 text-white" : idx === current ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400" : "bg-slate-800 border border-slate-700 text-slate-600"}`}>
                    {idx < current ? "✓" : i + 1}
                  </div>
                  <span className="hidden sm:block">{labels[s]}</span>
                </div>
                {i < 3 && <div className={`w-8 h-px ${idx < current ? "bg-emerald-500" : "bg-slate-800"}`} />}
              </div>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-10">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Upload ── */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-100 mb-1">파일 업로드</h2>
                <p className="text-slate-500 text-sm">기존 연구 데이터 파일 (Excel 또는 CSV)을 업로드하세요.</p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-200 ${
                  dragging ? "border-amber-400 bg-amber-500/10" : "border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5"
                }`}
              >
                <motion.div animate={dragging ? { scale: 1.2 } : { scale: 1 }} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700">
                    <FileSpreadsheet size={28} className={dragging ? "text-amber-400" : "text-slate-500"} />
                  </div>
                </motion.div>
                <div>
                  <p className="text-lg font-bold text-slate-200">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-sm text-slate-500 mt-1">지원 형식: <span className="text-amber-400 font-mono">.xlsx</span>, <span className="text-amber-400 font-mono">.xls</span>, <span className="text-amber-400 font-mono">.csv</span></p>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <RefreshCw size={16} />
                    </motion.div>
                    <span>파일 분석 중...</span>
                  </div>
                )}
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
              </div>

              {parseError && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-400">{parseError}</p>
                </div>
              )}

              {/* 예시 표 */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">예상 데이터 구조 예시</p>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {["id", "name", "category", "primary_efficacy", "efficacy_score", "source_origin", "patent_id"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-amber-400 font-bold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["MKB-001", "멀꿀 추출물", "Terrestrial", "Anti-inflammatory", "88", "전남 장흥", "KR10-2021-..."],
                        ["MKB-002", "김 다당체", "Marine", "Immune Boosting", "92", "전남 완도", "KR10-2022-..."],
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-slate-400 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Column Mapping ── */}
          {step === "mapping" && (
            <motion.div key="mapping" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-100 mb-1">컬럼 매핑</h2>
                  <p className="text-slate-500 text-sm">
                    <span className="text-amber-400 font-mono">{fileName}</span> — {rawRows.length}행 발견.
                    파일의 컬럼을 스키마 필드에 연결하세요.
                  </p>
                </div>
                <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={12} /> 다시 업로드
                </button>
              </div>

              {/* 필수 필드 완성도 */}
              <div className="flex flex-wrap gap-2">
                {SCHEMA_FIELDS.filter((f) => f.required).map((f) => {
                  const mapped = Object.values(mapping).includes(f.key);
                  return (
                    <span key={f.key} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-mono ${mapped ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
                      {mapped ? "✓" : "!"} {f.key}
                    </span>
                  );
                })}
              </div>

              {/* 매핑 테이블 */}
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <div className="grid grid-cols-3 gap-0 bg-slate-900 border-b border-slate-800 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span>파일 컬럼</span>
                  <span>미리보기 (1번째 행)</span>
                  <span>매핑할 스키마 필드</span>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {headers.map((header) => (
                    <div key={header} className="grid grid-cols-3 gap-4 items-center px-4 py-3 hover:bg-slate-900/40 transition-colors">
                      <span className="font-mono text-sm text-amber-400">{header}</span>
                      <span className="text-xs text-slate-500 truncate font-mono">{rawRows[0]?.[header] ?? "-"}</span>
                      <div className="relative">
                        <select
                          value={mapping[header] ?? "__skip__"}
                          onChange={(e) => setMapping({ ...mapping, [header]: e.target.value as SchemaKey | "__skip__" })}
                          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                        >
                          <option value="__skip__">— 건너뛰기 —</option>
                          {SCHEMA_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.required ? "* " : ""}{f.key} ({f.label})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-600">* 필수 필드</p>
                <motion.button
                  onClick={handleConvert}
                  disabled={!canConvert}
                  whileHover={canConvert ? { scale: 1.03 } : {}}
                  whileTap={canConvert ? { scale: 0.97 } : {}}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    canConvert
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-cyan-500"
                      : "bg-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  변환 실행 <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Preview ── */}
          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-100 mb-1">변환 결과 검토</h2>
                  <p className="text-slate-500 text-sm">
                    <span className="text-emerald-400 font-bold">{converted.length}개</span> 물질 변환 완료
                    {errors.length > 0 && <>, <span className="text-red-400 font-bold">{errors.length}개</span> 오류</>}
                  </p>
                </div>
                <button onClick={() => setStep("mapping")} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <ArrowLeft size={12} /> 매핑 수정
                </button>
              </div>

              {/* 오류 목록 */}
              {errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-2">
                    <AlertCircle size={12} /> {errors.length}개 행 건너뜀
                  </div>
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400/80 font-mono">{e}</p>
                  ))}
                </div>
              )}

              {/* 데이터 미리보기 테이블 */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900">
                      {["id", "name", "category", "primary_efficacy", "efficacy_score", "source_origin", "patent_id", "safety_level"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-bold text-amber-400 font-mono whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {converted.map((s, i) => (
                      <tr key={s.id} className={`hover:bg-slate-900/40 transition-colors ${i % 2 === 0 ? "" : "bg-slate-900/20"}`}>
                        <td className="px-3 py-2 font-mono text-cyan-400">{s.id}</td>
                        <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate">{s.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.category === "Marine" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                            : s.category === "Hybrid" ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          }`}>
                            {s.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-400">{s.primary_efficacy}</td>
                        <td className="px-3 py-2 font-mono font-bold text-emerald-400">{s.efficacy_score}</td>
                        <td className="px-3 py-2 text-slate-500">{s.source_origin ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{s.patent_id ?? "-"}</td>
                        <td className="px-3 py-2 text-slate-500">{s.safety_level ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* JSON 미리보기 */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">JSON 미리보기 (첫 번째 항목)</p>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                  {JSON.stringify(converted[0], null, 2)}
                </pre>
              </div>

              <div className="flex justify-end gap-3">
                <motion.button
                  onClick={handleDownload}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-cyan-500"
                >
                  <Download size={16} /> JSON 다운로드 ({converted.length}개)
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24 gap-6 text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
              >
                <CheckCircle size={36} className="text-emerald-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-slate-100 mb-2">변환 완료!</h2>
                <p className="text-slate-500">JSON 파일이 다운로드되었습니다.<br />이제 시뮬레이터의 데이터 업로드 섹션에서 이 파일을 사용하세요.</p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={reset}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600"
                >
                  <RefreshCw size={14} /> 다른 파일 변환
                </motion.button>
                <Link href="/">
                  <motion.span
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Dna size={14} /> 시뮬레이터로 이동
                  </motion.span>
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
