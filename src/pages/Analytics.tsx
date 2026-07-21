import React, { useState } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  BookOpen, 
  Target, 
  Activity, 
  HelpCircle, 
  Sparkles,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { Subject, UserProfile } from '../types';
import { calculatePercentage, calculateSafeBunks, calculateClassesToAttend } from '../utils/attendance';

interface AnalyticsProps {
  user: UserProfile;
  subjects: Subject[];
  id?: string;
}

interface HistoryPoint {
  date: string;
  percentage: number;
  attended: number;
  conducted: number;
}

export const Analytics: React.FC<AnalyticsProps> = ({ user, subjects, id }) => {
  const [simulationDays, setSimulationDays] = useState<number>(5);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  const targetThreshold = user?.targetAttendance || 75;

  if (!subjects || subjects.length === 0) {
    return (
      <div 
        id={id || "analytics-empty-state"}
        className="pb-32 pt-12 px-4 max-w-lg mx-auto text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
          <BookOpen size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">No Academic Roster Found</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
            Please register your semester courses or import KTU sample subjects from the main page to generate comprehensive analytics.
          </p>
        </div>
      </div>
    );
  }

  // 1. Core Calculations
  const totalAttended = subjects.reduce((sum, s) => sum + s.hoursAttended, 0);
  const totalConducted = subjects.reduce((sum, s) => sum + s.hoursConducted, 0);
  const overallPercentage = calculatePercentage(totalAttended, totalConducted);

  const subjectPercentages = subjects.map(s => calculatePercentage(s.hoursAttended, s.hoursConducted));
  const averagePercentage = subjectPercentages.length > 0 
    ? Number((subjectPercentages.reduce((sum, p) => sum + p, 0) / subjectPercentages.length).toFixed(1)) 
    : 100;

  // Highest and Lowest Attendance Subjects
  let highestSubject = subjects[0];
  let highestPct = -1;
  let lowestSubject = subjects[0];
  let lowestPct = 101;

  subjects.forEach(s => {
    const pct = calculatePercentage(s.hoursAttended, s.hoursConducted);
    if (pct > highestPct) {
      highestPct = pct;
      highestSubject = s;
    }
    if (pct < lowestPct) {
      lowestPct = pct;
      lowestSubject = s;
    }
  });

  const totalSafeBunks = subjects.reduce((sum, s) => sum + calculateSafeBunks(s.hoursAttended, s.hoursConducted, s.targetPercentage || targetThreshold), 0);
  const criticalCount = subjects.filter(s => {
    const pct = calculatePercentage(s.hoursAttended, s.hoursConducted);
    return pct < (s.targetPercentage || targetThreshold);
  }).length;

  // 2. Trend Calculations: Rewind history logs chronologically
  const getTrendPoints = (): HistoryPoint[] => {
    let rollingAttended = totalAttended;
    let rollingConducted = totalConducted;

    interface FlatHistoryRecord {
      date: string;
      status: 'present' | 'absent' | 'cancelled';
      hours: number;
      subjectId: string;
    }

    const allHistory: FlatHistoryRecord[] = [];
    subjects.forEach(sub => {
      if (sub.history) {
        sub.history.forEach(h => {
          allHistory.push({
            date: h.date,
            status: h.status,
            hours: h.hours,
            subjectId: sub.id
          });
        });
      }
    });

    if (allHistory.length === 0) {
      // Fallback: draw a beautiful 5-day steady line
      const today = new Date();
      const points: HistoryPoint[] = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        points.push({
          date: dateStr,
          percentage: overallPercentage,
          attended: totalAttended,
          conducted: totalConducted
        });
      }
      return points;
    }

    // Group history entries by date (descending, so we can rewind from today backwards)
    const groupedByDate: { [date: string]: FlatHistoryRecord[] } = {};
    allHistory.forEach(record => {
      if (!groupedByDate[record.date]) {
        groupedByDate[record.date] = [];
      }
      groupedByDate[record.date].push(record);
    });

    // Sort unique dates descending
    const sortedDatesDesc = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    const rawPoints: HistoryPoint[] = [];

    // Capture states
    let curAttended = rollingAttended;
    let curConducted = rollingConducted;

    for (let i = 0; i < sortedDatesDesc.length; i++) {
      const dateStr = sortedDatesDesc[i];
      const recordsOnDate = groupedByDate[dateStr];

      // Store point status at the end of this day
      rawPoints.push({
        date: dateStr,
        percentage: calculatePercentage(curAttended, curConducted),
        attended: curAttended,
        conducted: curConducted
      });

      // Rewind this day's actions
      recordsOnDate.forEach(record => {
        if (record.status === 'present') {
          curAttended = Math.max(0, curAttended - record.hours);
          curConducted = Math.max(0, curConducted - record.hours);
        } else if (record.status === 'absent') {
          curConducted = Math.max(0, curConducted - record.hours);
        }
      });
    }

    // Append one starting baseline point
    if (sortedDatesDesc.length > 0) {
      const earliestDate = new Date(sortedDatesDesc[sortedDatesDesc.length - 1]);
      earliestDate.setDate(earliestDate.getDate() - 1);
      const prevDateStr = earliestDate.toISOString().split('T')[0];
      rawPoints.push({
        date: prevDateStr,
        percentage: calculatePercentage(curAttended, curConducted),
        attended: curAttended,
        conducted: curConducted
      });
    }

    // Reverse to chronological (oldest to newest)
    return rawPoints.reverse();
  };

  const trendPoints = getTrendPoints();

  // SVG Coordinates mapping
  const svgWidth = 420;
  const svgHeight = 160;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const percentagesList = trendPoints.map(p => p.percentage);
  let minPct = Math.min(...percentagesList);
  let maxPct = Math.max(...percentagesList);

  let minYVal = Math.max(0, Math.floor(minPct - 3));
  let maxYVal = Math.min(100, Math.ceil(maxPct + 3));

  if (maxYVal - minYVal < 6) {
    minYVal = Math.max(0, minYVal - 8);
    maxYVal = Math.min(100, maxYVal + 8);
  }

  // Generate SVG coordinates for trend points
  const pointsCoords = trendPoints.map((p, idx) => {
    const x = paddingLeft + (idx / (trendPoints.length - 1)) * chartWidth;
    const y = paddingTop + (1 - (p.percentage - minYVal) / (maxYVal - minYVal)) * chartHeight;
    return { x, y, point: p };
  });

  // Construct Line Path
  let linePathString = "";
  pointsCoords.forEach((coord, idx) => {
    if (idx === 0) {
      linePathString += `M ${coord.x} ${coord.y}`;
    } else {
      linePathString += ` L ${coord.x} ${coord.y}`;
    }
  });

  // Construct Area Gradient Path
  const firstX = paddingLeft;
  const lastX = paddingLeft + chartWidth;
  const bottomY = paddingTop + chartHeight;
  const areaPathString = linePathString 
    ? `${linePathString} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
    : "";

  const gridLines = [minYVal, (minYVal + maxYVal) / 2, maxYVal];

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Predictive Simulators
  const totalSubCount = subjects.length;
  const pessimisticPct = calculatePercentage(totalAttended, totalConducted + (totalSubCount * simulationDays));
  const optimisticPct = calculatePercentage(totalAttended + (totalSubCount * simulationDays), totalConducted + (totalSubCount * simulationDays));

  // Circular gauge layout values
  const gaugeRadius = 42;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const strokeDashoffset = gaugeCircumference * (1 - Math.min(100, overallPercentage) / 100);

  return (
    <div 
      id={id || "analytics-page-root"}
      className="pb-32 pt-6 space-y-6 px-4 max-w-lg mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-white tracking-tight">Academic Analytics</h2>
        <p className="text-xs text-gray-400">Deep performance diagnostics & trajectory models</p>
      </div>

      {/* OVERALL ATTENDANCE CARD - HIGHEST VISUAL HIERARCHY */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-5">
          {/* Circular SVG Gauge Progress Indicator */}
          <div className="relative shrink-0 w-[100px] h-[100px] flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={gaugeRadius}
                fill="transparent"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r={gaugeRadius}
                fill="transparent"
                stroke={overallPercentage >= targetThreshold ? "#10b981" : "#f43f5e"}
                strokeWidth="7"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-mono font-bold text-white">{overallPercentage}%</span>
              <span className="text-[8px] text-gray-400 uppercase tracking-wider font-semibold">Overall</span>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-emerald-400" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Aggregate Status</span>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-gray-300 leading-normal">
                You attended <strong className="text-white font-mono">{totalAttended}</strong> out of <strong className="text-white font-mono">{totalConducted}</strong> total conducted hours.
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  overallPercentage >= targetThreshold
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                }`}>
                  {overallPercentage >= targetThreshold ? 'Target Met ✓' : 'Below Target ⚠'}
                </span>
                <span className="text-[10px] text-gray-500">
                  Target: {targetThreshold}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregate Mini diagnostics */}
        <div className="grid grid-cols-2 gap-2 mt-5 border-t border-white/5 pt-4">
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-center space-y-0.5">
            <span className="text-[9px] text-gray-400 uppercase font-semibold">Total Safe Cushion</span>
            <span className="text-base font-display font-bold font-mono text-emerald-400 block">{totalSafeBunks} hrs</span>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-center space-y-0.5">
            <span className="text-[9px] text-gray-400 uppercase font-semibold">Critical Deficits</span>
            <span className={`text-base font-display font-bold font-mono block ${criticalCount > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
              {criticalCount} subject{criticalCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* STATISTICS HUD GRID - AVERAGE, HIGHEST, LOWEST CARD SYSTEM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Card 1: Average Subject Attendance */}
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Average Attendance</span>
            <Target size={12} className="text-emerald-400" />
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-semibold text-white font-mono">{averagePercentage}%</span>
              <span className="text-[10px] text-gray-500 font-medium">Unweighted</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal">
              Arithmetic average of all courses, evaluating each subject independently.
            </p>
          </div>
        </div>

        {/* Card 2: Highest Subject Performer */}
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-14 h-14 bg-emerald-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Top Subject</span>
            <div className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold font-mono">
              <ArrowUpRight size={12} />
              <span>Max</span>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-display font-bold text-emerald-400 font-mono">{highestPct}%</span>
                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[80px]">{highestSubject?.code}</span>
              </div>
              <p className="text-[10px] text-white font-medium truncate mt-0.5">{highestSubject?.name}</p>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: `${highestPct}%` }} />
            </div>
          </div>
        </div>

        {/* Card 3: Lowest Subject Performer */}
        <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between sm:col-span-2 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-14 h-14 bg-rose-500/5 rounded-full blur-lg" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Weakest Subject</span>
            <div className="flex items-center gap-0.5 text-[10px] text-rose-400 font-bold font-mono">
              <ArrowDownRight size={12} />
              <span>Min</span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-display font-bold font-mono ${lowestPct < targetThreshold ? 'text-rose-400' : 'text-amber-400'}`}>
                  {lowestPct}%
                </span>
                <span className="text-[10px] text-gray-400 font-mono truncate">{lowestSubject?.code}</span>
              </div>
              <p className="text-[10px] text-white font-medium truncate">{lowestSubject?.name}</p>
            </div>
            
            {lowestPct < targetThreshold ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg py-1 px-2.5 text-right">
                <span className="text-[9px] text-rose-400 uppercase font-semibold block">Target Deficit</span>
                <span className="text-[10px] font-mono text-white font-bold">-{(targetThreshold - lowestPct).toFixed(1)}%</span>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg py-1 px-2.5 text-right">
                <span className="text-[9px] text-emerald-400 uppercase font-semibold block">Target Buffer</span>
                <span className="text-[10px] font-mono text-white font-bold">+{(lowestPct - targetThreshold).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ATTENDANCE TRENDS VISUAL LINE CHART */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-widest block">CHRONOLOGY TIMELINE</span>
            <h3 className="text-sm font-semibold text-white tracking-tight">Cumulative Attendance Trend</h3>
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 py-1 px-2.5 rounded-lg text-[10px] font-mono text-gray-400">
            <TrendingUp size={11} className="text-emerald-400 animate-pulse" />
            <span>Interactive</span>
          </div>
        </div>

        {/* SVG Custom Line Chart Area */}
        <div className="relative pt-2">
          
          {/* Active Hover Floating Tooltip HUD */}
          {hoveredTrendIdx !== null && (
            <div className="absolute top-2 right-2 bg-slate-900/90 border border-white/10 px-2.5 py-1.5 rounded-lg text-right shadow-xl pointer-events-none z-10 transition-all">
              <p className="text-[9px] text-gray-400 font-mono font-semibold">
                {formatDateLabel(trendPoints[hoveredTrendIdx].date)}
              </p>
              <p className="text-xs font-bold font-mono">
                <span className={trendPoints[hoveredTrendIdx].percentage >= targetThreshold ? 'text-emerald-400' : 'text-rose-400'}>
                  {trendPoints[hoveredTrendIdx].percentage}%
                </span>
                <span className="text-[10px] text-gray-500 font-normal ml-1">
                  ({trendPoints[hoveredTrendIdx].attended}/{trendPoints[hoveredTrendIdx].conducted} hrs)
                </span>
              </p>
            </div>
          )}

          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-auto overflow-visible"
          >
            <defs>
              <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Left Labels */}
            {gridLines.map((gl, idx) => {
              const y = paddingTop + (1 - (gl - minYVal) / (maxYVal - minYVal)) * chartHeight;
              return (
                <g key={idx}>
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={svgWidth - paddingRight} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeDasharray="3,3" 
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 3} 
                    fill="rgba(255,255,255,0.35)" 
                    fontSize="9" 
                    textAnchor="end" 
                    fontFamily="monospace"
                  >
                    {gl.toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* Target Baseline Reference line */}
            {targetThreshold >= minYVal && targetThreshold <= maxYVal && (
              <line
                x1={paddingLeft}
                y1={paddingTop + (1 - (targetThreshold - minYVal) / (maxYVal - minYVal)) * chartHeight}
                x2={svgWidth - paddingRight}
                y2={paddingTop + (1 - (targetThreshold - minYVal) / (maxYVal - minYVal)) * chartHeight}
                stroke="rgba(245,158,11,0.25)"
                strokeWidth="1.5"
                strokeDasharray="4,2"
              />
            )}

            {/* Area under the curve */}
            {areaPathString && (
              <path 
                d={areaPathString} 
                fill="url(#trendAreaGradient)" 
              />
            )}

            {/* Main Trend Line path */}
            {linePathString && (
              <path 
                d={linePathString} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Nodes */}
            {pointsCoords.map((coord, idx) => {
              const isHovered = hoveredTrendIdx === idx;
              return (
                <g key={idx}>
                  {/* Transparent hover anchor */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="10"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTrendIdx(idx)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                  />
                  {/* Visual Node */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isHovered ? "5.5" : "3.5"}
                    fill={coord.point.percentage >= targetThreshold ? "#10b981" : "#f43f5e"}
                    stroke="#020617"
                    strokeWidth={isHovered ? "2" : "1.5"}
                    className="transition-all duration-150 pointer-events-none"
                  />
                </g>
              );
            })}

            {/* X-axis chronological ticks (first, middle, last to avoid clutter) */}
            {trendPoints.length > 0 && [0, Math.floor((trendPoints.length - 1) / 2), trendPoints.length - 1].map((pIdx) => {
              if (pIdx < 0 || pIdx >= trendPoints.length) return null;
              const coord = pointsCoords[pIdx];
              return (
                <text
                  key={pIdx}
                  x={coord.x}
                  y={svgHeight - 10}
                  fill="rgba(255,255,255,0.4)"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {formatDateLabel(trendPoints[pIdx].date)}
                </text>
              );
            })}
          </svg>
        </div>

        <p className="text-[11px] text-gray-400 text-center italic leading-tight">
          * Hover nodes above to inspect historical attendance percentages and total conducted periods.
        </p>
      </div>

      {/* INTERACTIVE PREDICTIVE TRAJECTORY PANEL */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-emerald-400" size={16} />
          <h4 className="text-sm font-semibold text-white tracking-tight">Predictive Trajectory Forecaster</h4>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Simulate how upcoming consecutive class sessions will affect your cumulative attendance.
        </p>

        {/* Interval range controls */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium">Upcoming Lectures Per Course</span>
            <span className="font-mono font-semibold text-emerald-400">{simulationDays} lectures</span>
          </div>
          <input
            id="analytics-simulation-range"
            type="range"
            min="1"
            max="15"
            value={simulationDays}
            onChange={(e) => setSimulationDays(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Prediction Results Visual comparison cards */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Optimistic Scenario */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Perfect Attendance</span>
            </div>
            <span className="text-lg font-display font-bold text-white block">
              {optimisticPct}%
            </span>
            <p className="text-[9px] text-gray-400 leading-tight">
              If you attend the next {simulationDays} consecutive lectures in all classes.
            </p>
          </div>

          {/* Pessimistic Scenario */}
          <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Perfect Bunking</span>
            </div>
            <span className="text-lg font-display font-bold text-white block">
              {pessimisticPct}%
            </span>
            <p className="text-[9px] text-gray-400 leading-tight">
              If you bunk/skip the next {simulationDays} consecutive lectures in all classes.
            </p>
          </div>
        </div>

        {/* Contextual warning block */}
        <div className={`p-3 rounded-xl border flex gap-2.5 items-start text-[11px] ${
          pessimisticPct >= targetThreshold 
            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
            : 'bg-rose-500/5 border-rose-500/10 text-rose-400'
        }`}>
          <Info className="shrink-0 mt-0.5" size={14} />
          <div>
            {pessimisticPct >= targetThreshold ? (
              <span>Your academic cushion is exceptionally robust. You can bunk all {simulationDays} upcoming lectures in every course and still stay above your {targetThreshold}% target!</span>
            ) : (
              <span>CRITICAL WARNING: If you bunk the next {simulationDays} consecutive lectures in all classes, your cumulative attendance will plummet to {pessimisticPct}%, breaching your selected {targetThreshold}% threshold.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
