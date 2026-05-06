"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dna, Settings2, BarChart3, Cpu, FileSpreadsheet } from "lucide-react";
import LeftPanel, { type SimSettings } from "@/components/LeftPanel";
import CenterPanel from "@/components/CenterPanel";
import RightPanel from "@/components/RightPanel";
import { MOCK_CANDIDATES, getSimulationLogs } from "@/lib/mock-data";
import { t, type Lang } from "@/lib/i18n";
import type { MolecularCandidate } from "@/lib/api-client";
import { substanceToCandidate, type UploadedDataset } from "@/lib/substance-types";
import { applyConstraints, buildConstraintLogs } from "@/lib/constraint-engine";

const TOTAL_ITERATIONS = 30000;
const TICK_MS = 120;
const ITERATIONS_PER_TICK = 180;

const DEFAULT_SETTINGS_EN: SimSettings = {
  dataSources: { terrestrial: true, marine: true, regulatoryDB: false },
  targetEfficacy: "Anti-Inflammatory",
  priorities: { bioactivity: 80, stability: 65, synergy: 75, toxicity: 40 },
  constraints: ["Exclude hepatotoxic scaffolds", "MW < 700 Da (Lipinski)"],
};

const DEFAULT_SETTINGS_KO: SimSettings = {
  dataSources: { terrestrial: true, marine: true, regulatoryDB: false },
  targetEfficacy: "항염증",
  priorities: { bioactivity: 80, stability: 65, synergy: 75, toxicity: 40 },
  constraints: ["간독성 스캐폴드 제외", "분자량 < 700 Da (Lipinski 규칙)"],
};

export default function Dashboard() {
  const [lang, setLang] = useState<Lang>("ko");
  const tx = t[lang];

  const [dataset, setDataset] = useState<UploadedDataset | null>(null);
  const [settings, setSettings] = useState<SimSettings>(DEFAULT_SETTINGS_KO);
  const [isRunning, setIsRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<MolecularCandidate[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logCounterRef = useRef(0);
  const logTemplatesRef = useRef(getSimulationLogs(lang));
  const candidatePoolRef = useRef(MOCK_CANDIDATES);

  // Update log templates and reset constraints when language changes
  useEffect(() => {
    logTemplatesRef.current = getSimulationLogs(lang);
    if (!isRunning) {
      setSettings(lang === "ko" ? DEFAULT_SETTINGS_KO : DEFAULT_SETTINGS_EN);
    }
  }, [lang, isRunning]);

  const addLog = useCallback((iter: number) => {
    const template = logTemplatesRef.current[logCounterRef.current % logTemplatesRef.current.length];
    logCounterRef.current++;
    setLogs((prev) => [...prev, template(iter)].slice(-60));
  }, []);

  // 시뮬레이션에 사용할 후보 pool (제약조건 적용 포함)
  const buildCandidatePool = useCallback(() => {
    const raw = dataset
      ? dataset.substances.map(substanceToCandidate).sort((a, b) => b.score - a.score)
      : MOCK_CANDIDATES;

    if (settings.constraints.length === 0) return { pool: raw, constraintLogs: [] };

    const result = applyConstraints(raw, settings.constraints);
    const constraintLogs = buildConstraintLogs(result, lang);
    return { pool: result.passed, constraintLogs };
  }, [dataset, settings.constraints, lang]);

  const startSimulation = useCallback(() => {
    const { pool, constraintLogs } = buildCandidatePool();
    // pool을 ref에 저장해서 interval 클로저에서 접근
    candidatePoolRef.current = pool;

    setIsRunning(true);
    setIteration(0);
    setProgress(0);
    setCandidates([]);
    // 제약조건 로그를 초기 로그로 세팅
    setLogs(constraintLogs.length > 0 ? constraintLogs : []);
    logCounterRef.current = 0;
    logTemplatesRef.current = getSimulationLogs(lang);
  }, [buildCandidatePool, lang]);

  const stopSimulation = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setIteration((prev) => {
        const next = Math.min(prev + ITERATIONS_PER_TICK, TOTAL_ITERATIONS);
        const pct = (next / TOTAL_ITERATIONS) * 100;
        setProgress(pct);

        if (Math.floor(prev / ITERATIONS_PER_TICK) % 10 === 0) {
          addLog(next);
        }

        const pool = candidatePoolRef.current;
        const candidatesToShow = Math.ceil((pct / 100) * pool.length);
        setCandidates(pool.slice(0, candidatesToShow));

        if (next >= TOTAL_ITERATIONS) {
          setCandidates(pool);
          setIsRunning(false);
          setLogs((l) => [...l, tx.simComplete(pool.length)]);
          clearInterval(intervalRef.current!);
        }

        return next;
      });
    }, TICK_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, addLog, tx]);

  const handleDataLoaded = (d: UploadedDataset) => {
    setDataset(d);
    setIteration(0);
    setProgress(0);
    setLogs([]);
    setCandidates([]);
  };

  const handleDataCleared = () => {
    setDataset(null);
    setIteration(0);
    setProgress(0);
    setLogs([]);
    setCandidates([]);
  };

  const toggleLang = () => {
    if (isRunning) return;
    setLang((prev) => (prev === "ko" ? "en" : "ko"));
    setIteration(0);
    setProgress(0);
    setLogs([]);
    setCandidates([]);
  };

  const statusText = isRunning ? tx.statusRunning : iteration > 0 ? tx.statusComplete : tx.statusIdle;
  const statusColor = isRunning ? "emerald" : iteration > 0 ? "violet" : "slate";

  return (
    <div className="flex flex-col h-full bg-[#020817] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <Dna size={16} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-100 uppercase">{tx.appTitle}</h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">{tx.appSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <StatBadge
              label={tx.statDataSources}
              value={dataset ? `${dataset.substances.length} ${tx.uploadUsingCustom}` : `${Object.values(settings.dataSources).filter(Boolean).length}/3`}
              color={dataset ? "amber" : "cyan"}
            />
            <StatBadge label={tx.statTarget} value={settings.targetEfficacy} color="emerald" />
            <StatBadge label={tx.statStatus} value={statusText} color={statusColor} pulse={isRunning} />
          </div>

          {/* Language Toggle */}
          <motion.button
            onClick={toggleLang}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isRunning}
            title={isRunning ? "시뮬레이션 중에는 언어 변경 불가" : "언어 전환"}
            className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`px-2.5 py-1.5 text-xs font-bold transition-all ${lang === "ko" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500"}`}>
              KO
            </span>
            <span className="text-slate-700 text-xs">|</span>
            <span className={`px-2.5 py-1.5 text-xs font-bold transition-all ${lang === "en" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500"}`}>
              EN
            </span>
          </motion.button>

          <Link href="/converter">
            <motion.span
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet size={12} />
              데이터 변환기
            </motion.span>
          </Link>

          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono border border-slate-800 rounded-lg px-3 py-1.5">
            <Cpu size={10} />
            <span>{tx.engineVersion}</span>
          </div>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <motion.aside
          initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}
          className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-950/50 flex flex-col"
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800/60">
            <Settings2 size={13} className="text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{tx.panelSettings}</span>
          </div>
          <div className="flex-1 min-h-0">
            <LeftPanel
              settings={settings}
              onChange={setSettings}
              isRunning={isRunning}
              tx={tx}
              dataset={dataset}
              onDataLoaded={handleDataLoaded}
              onDataCleared={handleDataCleared}
            />
          </div>
        </motion.aside>

        <motion.main
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 flex flex-col border-r border-slate-800 bg-slate-950/30 min-w-0"
        >
          <CenterPanel
            isRunning={isRunning} iteration={iteration} logs={logs} progress={progress}
            onStart={startSimulation} onStop={stopSimulation} tx={tx}
          />
        </motion.main>

        <motion.aside
          initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="w-96 flex-shrink-0 bg-slate-950/50 flex flex-col"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60">
            <BarChart3 size={13} className="text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{tx.panelResults}</span>
            {candidates.length > 0 && (
              <span className="ml-auto text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {candidates.length} {tx.foundLabel}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <RightPanel candidates={candidates} isRunning={isRunning} tx={tx} />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color, pulse = false }: { label: string; value: string; color: string; pulse?: boolean }) {
  const colorMap: Record<string, string> = {
    cyan: "text-cyan-400", emerald: "text-emerald-400", violet: "text-violet-400", slate: "text-slate-500",
  };
  return (
    <div className="text-center">
      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`flex items-center gap-1.5 text-xs font-bold font-mono ${colorMap[color]}`}>
        {pulse && (
          <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
        )}
        {value}
      </div>
    </div>
  );
}
