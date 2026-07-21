import React from 'react';
import { Calendar, ShieldAlert, Sparkles, BookOpen, Clock, Calculator, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, Plus, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { GlassCard } from '../components/GlassCard';
import { Subject, UserProfile } from '../types';
import { calculatePercentage, calculateSafeBunks, calculateClassesToAttend, getAttendanceStatus, getStatusMessage } from '../utils/attendance';

interface HomeProps {
  user: UserProfile;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setActiveTab: (tab: 'home' | 'subjects' | 'analytics' | 'profile' | 'notes') => void;
  onOpenSimulator: (subjectId?: string) => void;
  onOpenProfileDrawer?: () => void;
  id?: string;
}

export const Home: React.FC<HomeProps> = ({
  user,
  subjects,
  setSubjects,
  setActiveTab,
  onOpenSimulator,
  onOpenProfileDrawer,
  id
}) => {
  // Aggregate stats
  const totalSubjects = subjects.length;
  const totalAttended = subjects.reduce((sum, s) => sum + s.hoursAttended, 0);
  const totalConducted = subjects.reduce((sum, s) => sum + s.hoursConducted, 0);
  const overallPct = calculatePercentage(totalAttended, totalConducted);

  // Calculate total safe bunks across all subjects
  const overallSafeBunks = subjects.reduce((sum, s) => {
    return sum + calculateSafeBunks(s.hoursAttended, s.hoursConducted, s.targetPercentage);
  }, 0);

  // Is overall attendance in danger zone (< 75)
  const isOverallSafe = overallPct >= user.targetAttendance;

  const currentStatus = getAttendanceStatus(overallPct, user.targetAttendance);

  const getStatusIcon = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'safe': return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-400" />;
      case 'danger': return <AlertCircle size={18} className="text-rose-400" />;
    }
  };

  const handleAdjustHours = (
    subId: string,
    type: 'conducted' | 'attended',
    operation: 'increment' | 'decrement',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSubjects(prev =>
      prev.map(sub => {
        if (sub.id !== subId) return sub;

        let hoursAttended = sub.hoursAttended;
        let hoursConducted = sub.hoursConducted;

        if (type === 'conducted') {
          if (operation === 'increment') {
            hoursConducted += 1;
          } else if (operation === 'decrement') {
            hoursConducted = Math.max(0, hoursConducted - 1);
            if (hoursConducted < hoursAttended) {
              hoursAttended = hoursConducted;
            }
          }
        } else {
          if (operation === 'increment') {
            hoursAttended += 1;
            if (hoursAttended > hoursConducted) {
              hoursConducted = hoursAttended;
            }
          } else if (operation === 'decrement') {
            hoursAttended = Math.max(0, hoursAttended - 1);
          }
        }

        return {
          ...sub,
          hoursAttended,
          hoursConducted,
          lastUpdated: new Date().toISOString()
        };
      })
    );
  };

  return (
    <div 
      id={id || "home-page-container"}
      className="pb-32 pt-6 space-y-6 px-4 max-w-lg mx-auto"
    >
      {/* Header Welcome Card */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400 fill-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">WORKSPACE ACTIVE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">
            {user.isGuest ? "Hi there" : `Hi, ${user.name.split(' ')[0]}`}
          </h2>
          {!user.isGuest && (
            <p className="text-xs text-gray-400">
              {user.semester} • {user.branch}
            </p>
          )}
        </div>
        
        {/* Simple Minimal Profile Avatar with Status Badge */}
        <div 
          onClick={onOpenProfileDrawer || (() => setActiveTab('profile'))}
          className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-0.5 cursor-pointer active:scale-95 transition-transform shrink-0"
        >
          <img 
            src={user.avatarUrl} 
            alt="Student Avatar" 
            className="w-full h-full object-cover rounded-lg"
            referrerPolicy="no-referrer"
          />
          {/* Status Badge */}
          <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-slate-950 shadow-md ${
            user.isGuest ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
          }`} />
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="glass-panel p-8 text-center rounded-3xl border border-white/5 space-y-6 my-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-emerald-400">
            <BookOpen size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-white tracking-tight">No subjects added yet</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              Register your semester courses to begin tracking attendance, calculating margins, predicting safe bunks, and generating deep academic analytics.
            </p>
          </div>
          <button
            id="btn-onboarding-add-subject"
            onClick={() => setActiveTab('subjects')}
            className="mx-auto py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-black flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 shadow-lg shadow-emerald-500/10 animate-bounce"
          >
            <Plus size={14} />
            <span>Add Your First Subject</span>
          </button>
        </div>
      ) : (
        <>
          {/* LARGE ATTENDANCE SUMMARY CARD */}
          <GlassCard 
            id="attendance-summary-card" 
            className="relative overflow-hidden border border-white/10"
            hoverEffect={false}
          >
            {/* Abstract background visual */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Overall Tracker</span>
                  <h3 className="text-lg font-display font-semibold text-white">KTU Eligibility</h3>
                </div>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 py-1 px-2.5 rounded-lg">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-[10px] font-mono text-gray-300 font-semibold">{totalAttended}/{totalConducted} Hrs Conducted</span>
                </div>
              </div>

              {/* Large percentage display */}
              <div className="flex items-baseline gap-2 pt-2">
                <span className={`text-5xl font-display font-bold tracking-tight ${
                  isOverallSafe ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {overallPct}%
                </span>
                <span className="text-sm font-medium text-gray-400">
                  attendance
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                  {/* Target Line marker (usually 75%) */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500/60 z-10" 
                    style={{ left: `${user.targetAttendance}%` }}
                    title={`Target Threshold ${user.targetAttendance}%`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, overallPct)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      isOverallSafe ? 'from-emerald-500 to-cyan-400' : 'from-rose-500 to-amber-500'
                    }`}
                  />
                </div>
                
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>0%</span>
                  <span className="text-amber-500 font-semibold">{user.targetAttendance}% Threshold</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Highlight Notification */}
              <div className={`p-3 rounded-xl border flex gap-2 items-start ${
                isOverallSafe ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-400'
              }`}>
                <div className="mt-0.5">{getStatusIcon(currentStatus)}</div>
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold">
                    {isOverallSafe 
                      ? "Eligibility Restored!" 
                      : "Attendance Deficit Detected!"}
                  </span>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    {isOverallSafe 
                      ? `You are currently safe from KTU's condonation fine. You have a cumulative margin of ${overallSafeBunks} bunks remaining.` 
                      : `You are falling below your target of ${user.targetAttendance}%. Plan your schedule immediately to avoid debarment.`}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* QUICK STATS CARDS */}
          <div id="quick-stats-grid" className="grid grid-cols-3 gap-3">
            {/* Card 1: Total Subjects */}
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Subjects</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-display font-semibold text-white">{totalSubjects}</span>
                <BookOpen size={14} className="text-gray-500" />
              </div>
            </div>

            {/* Card 2: Cumulative Percent */}
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Cumulative</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-display font-semibold ${isOverallSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overallPct}%
                </span>
                <CheckCircle2 size={14} className={isOverallSafe ? 'text-emerald-500/60' : 'text-rose-500/60'} />
              </div>
            </div>

            {/* Card 3: Safe Bunks Remaining */}
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Safe Bunks</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-display font-semibold font-mono ${overallSafeBunks > 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {overallSafeBunks}
                </span>
                <ShieldAlert size={14} className={overallSafeBunks > 0 ? 'text-cyan-500/60' : 'text-amber-500/60'} />
              </div>
            </div>
          </div>

          {/* DUAL ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="btn-attendance-details"
              onClick={() => setActiveTab('subjects')}
              className="py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-xs text-gray-200 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98"
            >
              Attendance Details
              <ArrowRight size={13} />
            </button>
            <button
              id="btn-plan-my-bunks"
              onClick={() => onOpenSimulator()}
              className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 transition-colors active:scale-98"
            >
              <Calculator size={14} />
              Plan My Bunks
            </button>
          </div>

          {/* HORIZONTAL SUBJECT CARDS SECTION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">Academic Roster</h4>
              <span className="text-[10px] text-gray-500">{subjects.length} courses loaded</span>
            </div>

            <div className="space-y-3">
              {subjects.map((sub, idx) => {
                const pct = calculatePercentage(sub.hoursAttended, sub.hoursConducted);
                const status = getAttendanceStatus(pct, sub.targetPercentage);
                const statusMsg = getStatusMessage(sub);
                
                return (
                  <motion.div
                    key={sub.id}
                    id={`subject-card-${sub.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    onClick={() => onOpenSimulator(sub.id)}
                    className="glass-panel p-4 rounded-2xl flex flex-col gap-3.5 border border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
                  >
                    {/* Upper row: meta and circle */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 max-w-[70%]">
                        <div className="flex items-center gap-1.5">
                          {sub.code && (
                            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 py-0.5 px-2 rounded-md border border-emerald-500/20">
                              {sub.code}
                            </span>
                          )}
                          <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            {sub.category || 'core'}
                          </span>
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-tight truncate">
                          {sub.name}
                        </h5>
                        {/* Status Pill */}
                        <div className={`mt-1.5 py-0.5 px-2 text-[10px] rounded-md border w-fit font-medium flex items-center gap-1 ${statusMsg.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          <span>{statusMsg.message}</span>
                        </div>
                      </div>

                      {/* Circular Progress */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              className="stroke-white/5"
                              strokeWidth="3.5"
                              fill="transparent"
                            />
                            <motion.circle
                              cx="24"
                              cy="24"
                              r="20"
                              className={
                                status === 'safe' ? 'stroke-emerald-400' : status === 'warning' ? 'stroke-amber-400' : 'stroke-rose-400'
                              }
                              strokeWidth="3.5"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 20}
                              initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                              animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - Math.min(100, pct) / 100) }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-mono font-bold text-white">
                            {Math.round(pct)}%
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-gray-500">
                          {sub.hoursAttended}/{sub.hoursConducted} hrs
                        </span>
                      </div>
                    </div>

                    {/* Lower row: adjustment controls */}
                    <div 
                      className="pt-3 border-t border-white/5 flex items-center justify-between gap-2"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Hours Attended adjusters */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Attended:</span>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                          <button
                            id={`home-btn-decrement-attended-${sub.id}`}
                            onClick={(e) => handleAdjustHours(sub.id, 'attended', 'decrement', e)}
                            className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-2 min-w-[24px] text-center select-none">
                            {sub.hoursAttended}
                          </span>
                          <button
                            id={`home-btn-increment-attended-${sub.id}`}
                            onClick={(e) => handleAdjustHours(sub.id, 'attended', 'increment', e)}
                            className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Hours Conducted adjusters */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Conducted:</span>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                          <button
                            id={`home-btn-decrement-conducted-${sub.id}`}
                            onClick={(e) => handleAdjustHours(sub.id, 'conducted', 'decrement', e)}
                            className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-2 min-w-[24px] text-center select-none">
                            {sub.hoursConducted}
                          </span>
                          <button
                            id={`home-btn-increment-conducted-${sub.id}`}
                            onClick={(e) => handleAdjustHours(sub.id, 'conducted', 'increment', e)}
                            className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
