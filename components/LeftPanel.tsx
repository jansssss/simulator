"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Waves, BookOpen, Target, Sliders, CheckSquare, Plus, X } from "lucide-react";
import type { Translations } from "@/lib/i18n";
import type { UploadedDataset } from "@/lib/substance-types";
import DataUploadSection from "./DataUploadSection";

export interface SimSettings {
  dataSources: { terrestrial: boolean; marine: boolean; regulatoryDB: boolean };
  targetEfficacy: string;
  priorities: { bioactivity: number; stability: number; synergy: number; toxicity: number };
  constraints: string[];
}

interface Props {
  settings: SimSettings;
  onChange: (s: SimSettings) => void;
  isRunning: boolean;
  tx: Translations;
  dataset: UploadedDataset | null;
  onDataLoaded: (d: UploadedDataset) => void;
  onDataCleared: () => void;
}

function Toggle({
  label,
  icon: Icon,
  active,
  color,
  onToggle,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-all duration-300 ${
        active
          ? `border-${color}-500 bg-${color}-500/10 text-${color}-400`
          : "border-slate-700 bg-slate-800/50 text-slate-500"
      }`}
    >
      <Icon size={16} />
      <span className="text-sm font-medium">{label}</span>
      <div className="ml-auto">
        <div
          className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
            active ? `bg-${color}-500` : "bg-slate-700"
          }`}
        >
          <motion.div
            animate={{ x: active ? 20 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
          />
        </div>
      </div>
    </motion.button>
  );
}

function PrioritySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-emerald-400 font-mono font-bold">{value}</span>
      </div>
      <div className="relative h-2 bg-slate-700 rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-400 transition-all"
          style={{ width: `${value}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

export default function LeftPanel({ settings, onChange, isRunning, tx, dataset, onDataLoaded, onDataCleared }: Props) {
  const [newConstraint, setNewConstraint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSource = (key: keyof SimSettings["dataSources"]) => {
    if (isRunning) return;
    onChange({ ...settings, dataSources: { ...settings.dataSources, [key]: !settings.dataSources[key] } });
  };

  const addConstraint = () => {
    const text = newConstraint.trim();
    if (!text || settings.constraints.includes(text)) return;
    onChange({ ...settings, constraints: [...settings.constraints, text] });
    setNewConstraint("");
    inputRef.current?.focus();
  };

  const removeConstraint = (c: string) => {
    if (isRunning) return;
    onChange({ ...settings, constraints: settings.constraints.filter((x) => x !== c) });
  };

  const setPriority = (key: keyof SimSettings["priorities"], v: number) => {
    onChange({ ...settings, priorities: { ...settings.priorities, [key]: v } });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700 p-5 space-y-6">
      {/* Data Upload */}
      <DataUploadSection
        onDataLoaded={onDataLoaded}
        onDataCleared={onDataCleared}
        dataset={dataset}
        isRunning={isRunning}
        tx={tx}
      />

      <div className="border-t border-slate-800" />

      {/* Data Sources */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={14} className="text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400">{tx.sectionDataSources}</h3>
        </div>
        <div className="space-y-2">
          <Toggle label={tx.srcTerrestrial} icon={BookOpen} active={settings.dataSources.terrestrial} color="emerald" onToggle={() => toggleSource("terrestrial")} />
          <Toggle label={tx.srcMarine} icon={Waves} active={settings.dataSources.marine} color="cyan" onToggle={() => toggleSource("marine")} />
          <Toggle label={tx.srcRegulatory} icon={BookOpen} active={settings.dataSources.regulatoryDB} color="violet" onToggle={() => toggleSource("regulatoryDB")} />
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* Simulation Persona */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">{tx.sectionPersona}</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">{tx.targetEfficacyLabel}</label>
            <select
              disabled={isRunning}
              value={settings.targetEfficacy}
              onChange={(e) => onChange({ ...settings, targetEfficacy: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {tx.efficacyOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sliders size={12} className="text-slate-400" />
              <span className="text-xs text-slate-400">{tx.priorityWeights}</span>
            </div>
            <PrioritySlider label={tx.priorityBioactivity} value={settings.priorities.bioactivity} onChange={(v) => setPriority("bioactivity", v)} />
            <PrioritySlider label={tx.priorityStability} value={settings.priorities.stability} onChange={(v) => setPriority("stability", v)} />
            <PrioritySlider label={tx.prioritySynergy} value={settings.priorities.synergy} onChange={(v) => setPriority("synergy", v)} />
            <PrioritySlider label={tx.priorityToxicity} value={settings.priorities.toxicity} onChange={(v) => setPriority("toxicity", v)} />
          </div>
        </div>
      </section>

      <div className="border-t border-slate-800" />

      {/* PhD Constraints */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={14} className="text-violet-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400">{tx.sectionConstraints}</h3>
          <span className="ml-auto text-[10px] font-mono text-slate-600 border border-slate-800 rounded px-1.5 py-0.5">
            {settings.constraints.length}
          </span>
        </div>

        {/* 제약조건 목록 */}
        <div className="space-y-1.5 mb-3">
          <AnimatePresence initial={false}>
            {settings.constraints.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-slate-600 italic px-1"
              >
                {tx.constraintsEmpty}
              </motion.p>
            )}
            {settings.constraints.map((c) => (
              <motion.div
                key={c}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 6 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-violet-500/40 bg-violet-500/8 group"
              >
                <CheckSquare size={13} className="text-violet-400 mt-0.5 shrink-0" />
                <span className="text-xs text-violet-300 leading-relaxed flex-1">{c}</span>
                {!isRunning && (
                  <motion.button
                    onClick={() => removeConstraint(c)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                    title={tx.constraintRemove}
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 새 제약조건 추가 입력 */}
        {!isRunning && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={newConstraint}
              onChange={(e) => setNewConstraint(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addConstraint(); }}
              placeholder={tx.constraintPlaceholder}
              className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 placeholder-slate-600 transition-colors"
            />
            <motion.button
              onClick={addConstraint}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              disabled={!newConstraint.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
              title={tx.constraintAdd}
            >
              <Plus size={14} />
            </motion.button>
          </div>
        )}
      </section>
    </div>
  );
}
