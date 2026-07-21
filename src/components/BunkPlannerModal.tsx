import React, { useState, useEffect } from 'react';
import { X, Play, ShieldAlert, Plus, Minus, ArrowRight, RotateCcw, Target, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject } from '../types';
import { calculatePercentage, calculateSafeBunks, calculateClassesToAttend } from '../utils/attendance';

interface BunkPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: string;
  id?: string;
}

type TargetPreset = 75 | 80 | 85 | 90 | 'custom';

export const BunkPlannerModal: React.FC<BunkPlannerModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  id
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  
  // Target percentage states
  const [targetPreset, setTargetPreset] = useState<TargetPreset>(75);
  const [customTarget, setCustomTarget] = useState<number>(78);

  // Sandbox simulation states
  const [bunksToSimulate, setBunksToSimulate] = useState<number>(0);
  const [attendsToSimulate, setAttendsToSimulate] = useState<number>(0);

  // Initialize selected subject
  useEffect(() => {
    if (isOpen) {
      if (initialSubjectId && subjects.some(s => s.id === initialSubjectId)) {
        setSelectedSubId(initialSubjectId);
      } else if (subjects.length > 0) {
        setSelectedSubId(subjects[0].id);
      }
    }
  }, [initialSubjectId, isOpen, subjects]);

  // Set initial preset from chosen subject's target when subject or modal changes
  useEffect(() => {
    if (selectedSubId) {
      const sub = subjects.find(s => s.id === selectedSubId);
      if (sub) {
        const subTarget = sub.targetPercentage || 75;
        if ([75, 80, 85, 90].includes(subTarget)) {
          setTargetPreset(subTarget as TargetPreset);
        } else {
          setTargetPreset('custom');
          setCustomTarget(subTarget);
        }
      }
    }
  }, [selectedSubId, subjects]);

  if (!isOpen) return null;

  const currentSubject = subjects.find(s => s.id === selectedSubId) || subjects[0];
  if (!currentSubject) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="absolute inset-0" onClick={onClose} />
          <div className="relative w-full max-w-md glass-panel p-6 rounded-3xl text-center space-y-4 z-10 border border-white/10">
            <ShieldAlert size={40} className="text-amber-400 mx-auto" />
            <h3 className="text-lg font-display font-semibold text-white">No Subjects Found</h3>
            <p className="text-xs text-gray-400">Please register or import subjects first from the course roster page.</p>
            <button onClick={onClose} className="py-2.5 px-5 bg-emerald-500 text-black text-xs font-bold rounded-xl">Close</button>
          </div>
        </div>
      </AnimatePresence>
    );
  }

  // Target calculation base
  const effectiveTarget = targetPreset === 'custom' ? customTarget : targetPreset;

  // Real-time metrics based on chosen target percentage
  const currentAttended = currentSubject.hoursAttended;
  const currentConducted = currentSubject.hoursConducted;
  const currentPct = calculatePercentage(currentAttended, currentConducted);

  // Instant real-time results for current state under selected target
  const baseSafeBunks = calculateSafeBunks(currentAttended, currentConducted, effectiveTarget);
  const baseClassesToAttend = calculateClassesToAttend(currentAttended, currentConducted, effectiveTarget);

  // Simulated Trajectory Trailing State
  const simAttended = currentAttended + attendsToSimulate;
  const simConducted = currentConducted + attendsToSimulate + bunksToSimulate;
  const simPct = calculatePercentage(simAttended, simConducted);

  // Simulated metrics based on chosen target percentage
  const simSafeBunks = calculateSafeBunks(simAttended, simConducted, effectiveTarget);
  const simClassesToAttend = calculateClassesToAttend(simAttended, simConducted, effectiveTarget);

  const handleReset = () => {
    setBunksToSimulate(0);
    setAttendsToSimulate(0);
  };

  const presetOptions: { value: TargetPreset; label: string }[] = [
    { value: 75, label: '75% (KTU)' },
    { value: 80, label: '80% (Safe)' },
    { value: 85, label: '85%' },
    { value: 90, label: '90%' },
    { value: 'custom', label: 'Custom' }
  ];

  return (
    <AnimatePresence>
      <div 
        id={id || "smart-bunk-planner-overlay"}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        {/* Backdrop close gesture */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0 bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Target size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  Smart Bunk Planner
                </h3>
                <p className="text-[10px] text-gray-400">Optimize target boundaries and attendance safety</p>
              </div>
            </div>
            <button
              id="close-planner-modal"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Main Scroll Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            
            {/* SUBJECT & TARGET DOCK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subject Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Course Assessment</label>
                <select
                  id="planner-subject-select"
                  value={selectedSubId}
                  onChange={(e) => {
                    setSelectedSubId(e.target.value);
                    handleReset();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500/40"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-950 text-white text-xs">
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Attendance Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Attendance Threshold</label>
                <div className="grid grid-cols-5 gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-0.5">
                  {presetOptions.map((opt) => (
                    <button
                      key={opt.value}
                      id={`preset-btn-${opt.value}`}
                      type="button"
                      onClick={() => setTargetPreset(opt.value)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        targetPreset === opt.value
                          ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.value === 'custom' ? 'Custom' : `${opt.value}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom slider if "custom" target chosen */}
            {targetPreset === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 overflow-hidden"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Configure Custom Target Threshold</span>
                  <span className="font-mono font-bold text-emerald-400">{customTarget}%</span>
                </div>
                <input
                  id="custom-target-slider"
                  type="range"
                  min="50"
                  max="95"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </motion.div>
            )}

            {/* Realtime Attendance Metric Dial HUD */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-semibold uppercase tracking-wider">Attendance Status HUD</span>
                <span className="font-mono text-gray-400">
                  Current: <strong className="text-white">{currentPct}%</strong> ({currentAttended}/{currentConducted} hrs)
                </span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden relative">
                {/* Target marker line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                  style={{ left: `${effectiveTarget}%` }}
                />
                {/* Real progress */}
                <div 
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${
                    currentPct >= effectiveTarget ? 'from-emerald-500 to-cyan-400' : 'from-rose-500 to-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, currentPct)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                <span>0%</span>
                <span className="text-amber-400 font-bold">{effectiveTarget}% Target Threshold</span>
                <span>100%</span>
              </div>
            </div>

            {/* SMART DUAL RESULTS DOCK (ANIMATED CARDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* CARD A: SAFE BUNKS ALLOWANCE */}
              <motion.div
                layout
                id="safe-bunks-card"
                className={`p-4.5 rounded-2xl border transition-all ${
                  baseSafeBunks > 0
                    ? 'bg-emerald-950/15 border-emerald-500/25 text-emerald-300 shadow-lg shadow-emerald-500/5'
                    : 'bg-white/[0.01] border-white/5 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 size={13} className={baseSafeBunks > 0 ? 'text-emerald-400' : 'text-gray-500'} />
                  <span>Bunk Allowance</span>
                </div>
                
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className={`text-4xl font-display font-bold font-mono ${baseSafeBunks > 0 ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {baseSafeBunks}
                  </span>
                  <span className="text-xs font-semibold">class{baseSafeBunks !== 1 ? 'es' : ''}</span>
                </div>

                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  {baseSafeBunks > 0
                    ? `You can safely skip ${baseSafeBunks} upcoming class${baseSafeBunks > 1 ? 'es' : ''} without dropping below your target.`
                    : `No buffer available. Any additional skip will place your attendance below the selected ${effectiveTarget}% target.`}
                </p>
              </motion.div>

              {/* CARD B: ATTENDANCE RECOVERY */}
              <motion.div
                layout
                id="consecutive-attends-card"
                className={`p-4.5 rounded-2xl border transition-all ${
                  baseClassesToAttend > 0
                    ? 'bg-rose-950/10 border-rose-500/25 text-rose-300 shadow-lg shadow-rose-500/5'
                    : 'bg-white/[0.01] border-white/5 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider">
                  <AlertTriangle size={13} className={baseClassesToAttend > 0 ? 'text-rose-400' : 'text-gray-500'} />
                  <span>Deficit Recovery</span>
                </div>

                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className={`text-4xl font-display font-bold font-mono ${baseClassesToAttend > 0 ? 'text-rose-400' : 'text-gray-300'}`}>
                    {baseClassesToAttend}
                  </span>
                  <span className="text-xs font-semibold">class{baseClassesToAttend !== 1 ? 'es' : ''}</span>
                </div>

                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  {baseClassesToAttend > 0
                    ? `To restore your record, you must attend the next ${baseClassesToAttend} consecutive class sessions.`
                    : `You are currently meeting your target! No recovery classes are necessary right now.`}
                </p>
              </motion.div>
            </div>

            {/* CONTEXTUAL ADVICE WARNING BANNER */}
            <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex gap-2.5 ${
              currentPct >= effectiveTarget 
                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/5 border-rose-500/10 text-rose-400'
            }`}>
              {currentPct >= effectiveTarget ? (
                <>
                  <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Target Secure</span>
                    <p className="text-[10px] text-gray-400">
                      Your current eligibility of <strong className="text-white">{currentPct}%</strong> is safe under your selected target of <strong className="text-white">{effectiveTarget}%</strong>. Use the sandbox below to model future bunc scenarios.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Attendance Deficit Warning</span>
                    <p className="text-[10px] text-gray-400">
                      You are short of your target by <strong className="text-rose-400">{(effectiveTarget - currentPct).toFixed(1)}%</strong>. You must prioritize attending all sessions to prevent debarment or condonation fines.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* INTERACTIVE TRAJECTORY SANDBOX */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Play className="text-emerald-400 fill-emerald-400" size={13} />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Predictive Sandbox Forecast</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-[9px] text-gray-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw size={10} />
                  Reset Sandbox
                </button>
              </div>

              {/* Slider A: Bunks to simulate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Bunks to Simulate: <strong className="font-mono text-rose-400">{bunksToSimulate} hrs</strong></span>
                  <span className="text-[10px] text-gray-500">Adds missed conducted periods</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="sandbox-bunks-slider"
                    type="range"
                    min="0"
                    max="15"
                    value={bunksToSimulate}
                    onChange={(e) => setBunksToSimulate(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
              </div>

              {/* Slider B: Attends to simulate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Attending to Simulate: <strong className="font-mono text-emerald-400">{attendsToSimulate} hrs</strong></span>
                  <span className="text-[10px] text-gray-500">Adds present periods</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="sandbox-attends-slider"
                    type="range"
                    min="0"
                    max="15"
                    value={attendsToSimulate}
                    onChange={(e) => setAttendsToSimulate(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Simulation Result HUD */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Forecast Percentage</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className={`text-xl font-display font-bold ${
                      simPct >= effectiveTarget ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {simPct}%
                    </span>
                    <span className="text-[10px] text-gray-500">({simAttended}/{simConducted} hrs)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-center">
                  <span className="text-[9px] text-gray-400 uppercase font-semibold block">Forecast Status</span>
                  <span className={`text-xs font-bold mt-1 ${
                    simPct >= effectiveTarget ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {simPct >= effectiveTarget ? '✓ TARGET SAFE' : '⚠ TARGET BREACHED'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-5 bg-white/[0.02] border-t border-white/5 flex gap-3 shrink-0">
            <button
              id="reset-planner-btn"
              onClick={handleReset}
              className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-xs text-gray-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-98"
            >
              <RotateCcw size={12} />
              Reset Forecast
            </button>
            <button
              id="close-planner-btn"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
            >
              Done Planning
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
