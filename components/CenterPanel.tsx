"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Play, Square, Zap, Activity } from "lucide-react";
import type { Translations } from "@/lib/i18n";

interface Props {
  isRunning: boolean;
  iteration: number;
  logs: string[];
  progress: number;
  onStart: () => void;
  onStop: () => void;
  tx: Translations;
}

function OrbitRing({
  radius, duration, color, delay = 0, reverse = false, isRunning,
}: {
  radius: number; duration: number; color: string; delay?: number; reverse?: boolean; isRunning: boolean;
}) {
  const speed = isRunning ? duration * 0.35 : duration;
  return (
    <motion.g
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: speed, ease: "linear", repeat: Infinity, delay }}
      style={{ originX: "50%", originY: "50%", transformOrigin: "200px 200px" }}
    >
      <circle cx={200} cy={200} r={radius} fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 8" opacity={0.35} />
      <motion.circle
        cx={200 + radius} cy={200} r={isRunning ? 6 : 5} fill={color}
        animate={{ r: isRunning ? [5, 8, 5] : 5, opacity: isRunning ? [0.9, 1, 0.9] : 0.7 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        filter="url(#glow)"
      />
    </motion.g>
  );
}

function CorePulse({ isRunning }: { isRunning: boolean }) {
  return (
    <g>
      {isRunning && [0, 0.5, 1].map((delay) => (
        <motion.circle
          key={delay} cx={200} cy={200} r={30} fill="none" stroke="#10b981" strokeWidth="1.5"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: [1, 2.8, 3.5], opacity: [0.8, 0.3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay, ease: "easeOut" }}
          style={{ transformOrigin: "200px 200px" }}
        />
      ))}
      <motion.polygon
        points="200,172 224,186 224,214 200,228 176,214 176,186"
        fill="url(#coreGrad)" stroke="#10b981" strokeWidth="1.5"
        animate={isRunning ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={{ duration: isRunning ? 4 : 0, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "200px 200px" }}
        filter="url(#glow)"
      />
      <motion.circle
        cx={200} cy={200} r={8} fill="#10b981"
        animate={isRunning ? { r: [7, 10, 7], opacity: [1, 0.7, 1] } : { r: 7 }}
        transition={{ duration: 0.8, repeat: Infinity }}
        filter="url(#glow)"
      />
    </g>
  );
}

function FloatingParticles({ isRunning }: { isRunning: boolean }) {
  const particles = Array.from({ length: 18 }, (_, i) => i);
  return (
    <>
      {particles.map((i) => {
        const angle = (i / particles.length) * 360;
        const r = 50 + (i % 3) * 30;
        const x = 200 + r * Math.cos((angle * Math.PI) / 180);
        const y = 200 + r * Math.sin((angle * Math.PI) / 180);
        return (
          <motion.circle
            key={i} cx={x} cy={y} r={isRunning ? 2.5 : 1.5}
            fill={i % 3 === 0 ? "#10b981" : i % 3 === 1 ? "#06b6d4" : "#8b5cf6"}
            opacity={0.6}
            animate={isRunning ? {
              cx: [x, 200 + r * Math.cos(((angle + 30) * Math.PI) / 180), x],
              cy: [y, 200 + r * Math.sin(((angle + 30) * Math.PI) / 180), y],
              opacity: [0.4, 1, 0.4], r: [2, 4, 2],
            } : {}}
            transition={{ duration: 2 + (i % 4) * 0.5, repeat: Infinity, delay: i * 0.12 }}
          />
        );
      })}
    </>
  );
}

function HelixArcs({ isRunning }: { isRunning: boolean }) {
  const arcs = [
    "M 80,200 Q 140,150 200,200 Q 260,250 320,200",
    "M 80,200 Q 140,250 200,200 Q 260,150 320,200",
  ];
  return (
    <>
      {arcs.map((d, i) => (
        <motion.path
          key={i} d={d} fill="none"
          stroke={i === 0 ? "#10b981" : "#06b6d4"}
          strokeWidth={isRunning ? 1.5 : 1}
          opacity={isRunning ? 0.5 : 0.2}
          strokeDasharray="6 6"
          animate={isRunning ? { strokeDashoffset: [0, -24] } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </>
  );
}

export default function CenterPanel({ isRunning, iteration, logs, progress, onStart, onStop, tx }: Props) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full items-center">
      {/* Header */}
      <div className="w-full px-6 pt-5 pb-3 text-center">
        <motion.h2
          className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400"
          animate={isRunning ? { opacity: [0.8, 1, 0.8] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {tx.engineTitle}
        </motion.h2>
        <p className="text-xs text-slate-500 mt-0.5 tracking-widest uppercase">{tx.engineSubtitle}</p>
      </div>

      {/* SVG Engine */}
      <div className="relative flex-shrink-0">
        <svg width={400} height={400} viewBox="0 0 400 400">
          <defs>
            <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.4" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <motion.g opacity={isRunning ? 0.15 : 0.07}>
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 50} x2={400} y2={i * 50} stroke="#10b981" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={400} stroke="#10b981" strokeWidth="0.5" />
            ))}
          </motion.g>

          <HelixArcs isRunning={isRunning} />
          <FloatingParticles isRunning={isRunning} />
          <OrbitRing radius={140} duration={12} color="#06b6d4" isRunning={isRunning} />
          <OrbitRing radius={105} duration={9} color="#10b981" delay={0.3} isRunning={isRunning} />
          <OrbitRing radius={72} duration={6} color="#8b5cf6" reverse isRunning={isRunning} />
          <OrbitRing radius={48} duration={4} color="#f59e0b" delay={0.2} reverse isRunning={isRunning} />
          <CorePulse isRunning={isRunning} />

          <text x={200} y={24} textAnchor="middle" fill="#06b6d4" fontSize="9" opacity={0.6} fontFamily="monospace">{tx.layerMarine}</text>
          <text x={200} y={390} textAnchor="middle" fill="#10b981" fontSize="9" opacity={0.6} fontFamily="monospace">{tx.layerTerrestrial}</text>
          <text x={12} y={205} fill="#8b5cf6" fontSize="9" opacity={0.6} fontFamily="monospace">{tx.layerSynergy}</text>
          <text x={340} y={205} fill="#f59e0b" fontSize="9" opacity={0.6} fontFamily="monospace">{tx.layerAdmet}</text>
        </svg>

        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full px-3 py-1"
            >
              <motion.div className="w-2 h-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
              <span className="text-xs text-emerald-400 font-mono font-bold">{tx.badgeRunning}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="w-full px-6 -mt-2 mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity size={11} />
            <span className="font-mono">{iteration.toLocaleString()} {tx.iterationsLabel}</span>
          </div>
          <span className="text-emerald-400 font-mono font-bold">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-cyan-500 to-violet-500"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Control Button */}
      <div className="px-6 mb-4">
        <motion.button
          onClick={isRunning ? onStop : onStart}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className={`flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm tracking-widest uppercase shadow-lg transition-all duration-300 ${
            isRunning
              ? "bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30"
              : "bg-gradient-to-r from-emerald-600 to-cyan-600 border border-emerald-400/30 text-white hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-500/20"
          }`}
        >
          {isRunning ? <><Square size={16} /> {tx.btnStop}</> : <><Zap size={16} /> {tx.btnStart}</>}
        </motion.button>
      </div>

      {/* Log Stream */}
      <div className="flex-1 w-full min-h-0 px-6 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <Play size={11} className="text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{tx.logLabel}</span>
        </div>
        <div className="h-full max-h-44 bg-slate-950/80 border border-slate-800 rounded-lg overflow-y-auto p-3 font-mono space-y-1">
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <p className="text-slate-600 text-xs">{tx.logAwaiting}</p>
            ) : (
              logs.map((log, i) => (
                <motion.div
                  key={`${i}-${log}`}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
                  className={`text-xs leading-relaxed ${i === logs.length - 1 ? "text-emerald-400" : "text-slate-500"}`}
                >
                  <span className="text-slate-600 mr-2">›</span>{log}
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
