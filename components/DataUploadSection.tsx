"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileJson, X, CheckCircle, AlertCircle, Leaf, Waves, Database } from "lucide-react";
import { parseUploadedJSON, type UploadedDataset } from "@/lib/substance-types";
import type { Translations } from "@/lib/i18n";

interface Props {
  onDataLoaded: (dataset: UploadedDataset) => void;
  onDataCleared: () => void;
  dataset: UploadedDataset | null;
  isRunning: boolean;
  tx: Translations;
}

export default function DataUploadSection({ onDataLoaded, onDataCleared, dataset, isRunning, tx }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      setError(tx.uploadErrorFormat);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const dataset = parseUploadedJSON(raw, file.name);
        setError(null);
        onDataLoaded(dataset);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : tx.uploadErrorParse);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (isRunning) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Database size={14} className="text-amber-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400">{tx.uploadSectionTitle}</h3>
      </div>

      <AnimatePresence mode="wait">
        {dataset ? (
          /* ── 업로드 완료 상태 ── */
          <motion.div
            key="loaded"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-400">{tx.uploadLoaded}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">{dataset.fileName}</p>
                </div>
              </div>
              {!isRunning && (
                <button
                  onClick={onDataCleared}
                  className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                  title={tx.uploadClear}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-1.5">
              <StatChip icon={<Database size={10} />} label={tx.uploadTotal} value={dataset.substances.length} color="amber" />
              <StatChip icon={<Leaf size={10} />} label={tx.uploadTerrestrial} value={dataset.terrestrialCount} color="emerald" />
              <StatChip icon={<Waves size={10} />} label={tx.uploadMarine} value={dataset.marineCount} color="cyan" />
            </div>

            {/* 물질 목록 미리보기 */}
            <div className="bg-slate-950/60 rounded-lg border border-slate-800 max-h-28 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
              {dataset.substances.map((s, i) => (
                <div key={s.id} className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] ${i !== dataset.substances.length - 1 ? "border-b border-slate-800/60" : ""}`}>
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                      s.category === "Marine" ? "bg-cyan-400" : s.category === "Terrestrial" ? "bg-emerald-400" : "bg-violet-400"
                    }`}
                  />
                  <span className="font-mono text-slate-500 w-14 shrink-0">{s.id}</span>
                  <span className="text-slate-400 truncate">{s.name}</span>
                  <span className="ml-auto text-emerald-400 font-mono font-bold shrink-0">{s.efficacy_score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── 업로드 대기 상태 ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); if (!isRunning) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isRunning && inputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200 cursor-pointer ${
                isRunning
                  ? "border-slate-800 opacity-50 cursor-not-allowed"
                  : dragging
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5"
              }`}
            >
              <motion.div
                animate={dragging ? { scale: 1.15 } : { scale: 1 }}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700"
              >
                {dragging ? (
                  <FileJson size={18} className="text-amber-400" />
                ) : (
                  <Upload size={18} className="text-slate-500" />
                )}
              </motion.div>
              <div>
                <p className="text-xs font-bold text-slate-300">{tx.uploadDrop}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{tx.uploadHint}</p>
              </div>

              {/* 예시 스키마 */}
              <div className="w-full mt-1 bg-slate-950/80 rounded-lg border border-slate-800 p-2 text-left font-mono text-[9px] text-slate-600 leading-relaxed">
                <span className="text-slate-500">{"{ "}</span>
                <span className="text-cyan-700">"id"</span>: <span className="text-amber-700">"SUB-001"</span>,{" "}
                <span className="text-cyan-700">"category"</span>: <span className="text-amber-700">"Marine"</span>,{" "}
                <span className="text-cyan-700">"efficacy_score"</span>: <span className="text-emerald-700">92</span>
                <span className="text-slate-500">{" }"}</span>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 오류 메시지 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
          >
            <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-red-400 leading-relaxed">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-400 shrink-0">
              <X size={10} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function StatChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    cyan: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
  };
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 ${colorMap[color]}`}>
      <div className="flex items-center gap-1 opacity-70">{icon}<span className="text-[9px] uppercase">{label}</span></div>
      <span className="text-sm font-black font-mono">{value}</span>
    </div>
  );
}
