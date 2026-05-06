"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Trophy, Microscope, FlaskConical, ChevronRight, Star, Send } from "lucide-react";
import type { MolecularCandidate } from "@/lib/api-client";
import type { Translations } from "@/lib/i18n";

interface Props {
  candidates: MolecularCandidate[];
  isRunning: boolean;
  tx: Translations;
}

const SOURCE_BADGE: Record<string, string> = {
  hybrid: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  marine: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  terrestrial: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const PATENT_COLOR: Record<string, string> = {
  High: "text-emerald-400",
  Medium: "text-amber-400",
  Low: "text-red-400",
};

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-emerald-400 w-10 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function EfficacyRadar({ candidate, tx }: { candidate: MolecularCandidate; tx: Translations }) {
  const data = [
    { axis: "Anti-Inflam", value: candidate.efficacyProfile.antiInflammatory },
    { axis: "Antioxidant", value: candidate.efficacyProfile.antioxidant },
    { axis: "Antimicrobial", value: candidate.efficacyProfile.antimicrobial },
    { axis: "Antitumor", value: candidate.efficacyProfile.antitumor },
    { axis: "Neuroprot.", value: candidate.efficacyProfile.neuroprotection },
    { axis: "Immuno.", value: candidate.efficacyProfile.immunoModulation },
  ];

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">{tx.efficacyProfile}</div>
      <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-2">
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }} />
              <Radar name={candidate.id} dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#10b981" }}
                itemStyle={{ color: "#94a3b8" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function FeedbackForm({ candidateId, tx }: { candidateId: string; tx: Translations }) {
  const [form, setForm] = useState({
    observedEfficacy: 50,
    sideEffects: "",
    stabilityInVivo: 50,
    notes: "",
    researcherName: "",
    phDDomain: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 block mb-1">{tx.feedbackResearcher}</label>
          <input
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            placeholder={tx.researcherPlaceholder}
            value={form.researcherName}
            onChange={(e) => setForm({ ...form, researcherName: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">{tx.feedbackDomain}</label>
          <input
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            placeholder={tx.domainPlaceholder}
            value={form.phDDomain}
            onChange={(e) => setForm({ ...form, phDDomain: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-slate-500">{tx.feedbackEfficacy}</label>
          <span className="text-emerald-400 font-mono">{form.observedEfficacy}%</span>
        </div>
        <input type="range" min={0} max={100} value={form.observedEfficacy}
          onChange={(e) => setForm({ ...form, observedEfficacy: Number(e.target.value) })}
          className="w-full accent-emerald-500 cursor-pointer" />
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-slate-500">{tx.feedbackStability}</label>
          <span className="text-cyan-400 font-mono">{form.stabilityInVivo}%</span>
        </div>
        <input type="range" min={0} max={100} value={form.stabilityInVivo}
          onChange={(e) => setForm({ ...form, stabilityInVivo: Number(e.target.value) })}
          className="w-full accent-cyan-500 cursor-pointer" />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">{tx.feedbackSideEffects}</label>
        <input
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          placeholder={tx.feedbackSideEffectsPlaceholder}
          value={form.sideEffects}
          onChange={(e) => setForm({ ...form, sideEffects: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">{tx.feedbackNotes}</label>
        <textarea
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-violet-500 resize-none"
          rows={3}
          placeholder={`${candidateId}...`}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
          submitted
            ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-400"
            : "bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30"
        }`}
      >
        {submitted ? tx.feedbackSubmitted : <><Send size={12} />{tx.feedbackSubmit}</>}
      </motion.button>
    </form>
  );
}

export default function RightPanel({ candidates, isRunning, tx }: Props) {
  const [selected, setSelected] = useState<MolecularCandidate | null>(null);
  const [tab, setTab] = useState<"table" | "detail">("table");

  const getSourceLabel = (source: string) => {
    if (source === "hybrid") return tx.sourceHybrid;
    if (source === "marine") return tx.sourceMarine;
    return tx.sourceTerrestrial;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2 border-b border-slate-800">
        <button
          onClick={() => setTab("table")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            tab === "table" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Trophy size={12} /> {tx.tabCandidates}
        </button>
        <button
          onClick={() => setTab("detail")}
          disabled={!selected}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            tab === "detail" && selected ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "text-slate-500 hover:text-slate-300 disabled:opacity-40"
          }`}
        >
          <Microscope size={12} /> {tx.tabAnalysis}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
        <AnimatePresence mode="wait">
          {tab === "table" ? (
            <motion.div key="table" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="p-4 space-y-2">
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <FlaskConical size={32} className="mb-3 opacity-40" />
                  <p className="text-sm text-center">{tx.noResults}</p>
                </div>
              ) : (
                candidates.map((c, idx) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                    onClick={() => { setSelected(c); setTab("detail"); }}
                    className={`group cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
                      selected?.id === c.id ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-800 hover:border-slate-600 bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {idx < 3 && (
                          <Star size={12}
                            className={idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : "text-amber-700"}
                            fill="currentColor"
                          />
                        )}
                        <span className="text-xs font-mono font-bold text-slate-300">#{idx + 1} {c.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SOURCE_BADGE[c.source]}`}>
                          {getSourceLabel(c.source)}
                        </span>
                        <span className={`text-[10px] font-bold ${PATENT_COLOR[c.patentability]}`}>
                          ★ {c.patentability}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">{c.composition}</p>
                    <ScoreBar value={c.score} />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-600 font-mono">
                        {tx.dockingLabel}: {c.dockingScore.toFixed(2)} kcal/mol
                      </span>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="p-4 space-y-5">
              {selected && (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{selected.id}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{selected.composition}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400 font-mono">{selected.score.toFixed(1)}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{tx.scoreLabel}</div>
                    </div>
                  </div>

                  <EfficacyRadar candidate={selected} tx={tx} />

                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">{tx.admetProfile}</div>
                    <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2.5">
                      {Object.entries(selected.admet).map(([k, v]) => (
                        <div key={k}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400 capitalize">{k}</span>
                            <span className={`font-mono font-bold ${k === "toxicity" ? (v < 20 ? "text-emerald-400" : "text-red-400") : "text-cyan-400"}`}>
                              {v}
                            </span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${k === "toxicity" ? "bg-red-500" : "bg-cyan-500"}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${v}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">{tx.feedbackTitle}</div>
                    <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
                      <FeedbackForm candidateId={selected.id} tx={tx} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
