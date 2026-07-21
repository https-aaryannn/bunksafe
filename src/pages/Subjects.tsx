import React, { useState } from 'react';
import { BookOpen, Search, Plus, Trash2, Check, X as CloseIcon, Filter, Clock, Edit3, Sparkles, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, AttendanceRecord } from '../types';
import { calculatePercentage, getStatusMessage, getAttendanceStatus } from '../utils/attendance';
import { EditSubjectModal } from '../components/EditSubjectModal';

interface SubjectsProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  id?: string;
}

export const Subjects: React.FC<SubjectsProps> = ({ subjects, setSubjects, id }) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'core' | 'elective' | 'lab'>('all');
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Form states for creating a new subject
  const [isAdding, setIsAdding] = useState(subjects.length === 0);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'core' | 'elective' | 'lab'>('core');
  const [newTarget, setNewTarget] = useState(75);
  const [newAttended, setNewAttended] = useState(0);
  const [newConducted, setNewConducted] = useState(0);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit modal state
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim()) {
      setAddError('Subject name is required.');
      return;
    }

    if (newAttended < 0 || newConducted < 0) {
      setAddError('Hours cannot be negative.');
      return;
    }
    if (newAttended > newConducted) {
      setAddError('Hours Attended cannot be greater than Hours Conducted.');
      return;
    }

    const historyEntry: AttendanceRecord[] = [];
    if (newConducted > 0) {
      historyEntry.push({
        id: `h-init-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        hours: newAttended
      });
    }

    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      hoursAttended: newAttended,
      hoursConducted: newConducted,
      targetPercentage: newTarget,
      lastUpdated: new Date().toISOString(),
      category: newCategory,
      history: historyEntry
    };

    setSubjects(prev => [newSub, ...prev]);
    setNewCode('');
    setNewName('');
    setNewCategory('core');
    setNewTarget(75);
    setNewAttended(0);
    setNewConducted(0);
    setAddError(null);
    setIsAdding(false);
  };

  const handleDeleteSubject = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this subject? All logs will be lost.')) {
      setSubjects(prev => prev.filter(s => s.id !== subId));
    }
  };

  const handleEditClick = (sub: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(sub);
  };

  const handleSaveEdit = (updatedSub: Subject) => {
    setSubjects(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    setEditingSubject(null);
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

  const handleToggleHistoryStatus = (subId: string, recordId: string) => {
    setSubjects(prev => prev.map(sub => {
      if (sub.id !== subId) return sub;

      const history = sub.history.map(rec => {
        if (rec.id !== recordId) return rec;
        
        let nextStatus: 'present' | 'absent' | 'cancelled' = 'present';
        if (rec.status === 'present') nextStatus = 'absent';
        else if (rec.status === 'absent') nextStatus = 'cancelled';

        return { ...rec, status: nextStatus };
      });

      let hoursAttended = 0;
      let hoursConducted = 0;

      history.forEach(rec => {
        if (rec.status === 'present') {
          hoursAttended += rec.hours;
          hoursConducted += rec.hours;
        } else if (rec.status === 'absent') {
          hoursConducted += rec.hours;
        }
      });

      return {
        ...sub,
        hoursAttended,
        hoursConducted,
        history
      };
    }));
  };

  const filteredSubjects = subjects.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) || 
                          (sub.code || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || sub.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div 
      id={id || "subjects-page-container"}
      className="pb-32 pt-6 space-y-6 px-4 max-w-lg mx-auto"
    >
      {/* Top Banner and Add New Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Academic Roster</h2>
          <p className="text-xs text-gray-400">Manage courses and log hourly attendance</p>
        </div>
        
        <button
          id="btn-add-subject-toggle"
          onClick={() => setIsAdding(!isAdding)}
          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          {isAdding ? <CloseIcon size={14} /> : <Plus size={14} />}
          {isAdding ? 'Close' : 'Add Subject'}
        </button>
      </div>

      {subjects.length === 0 && (
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs flex gap-2.5 items-start">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Let's Get Started!</span>
            Please register your first course using the form below. Enter the course name, optional code, and your current hours conducted and attended.
          </div>
        </div>
      )}

      {/* ADD NEW SUBJECT FORM */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddSubject} className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-emerald-400" />
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">New Subject Entry</h4>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 text-xs text-rose-400">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase">Subject Code</label>
                  <input
                    id="new-sub-code"
                    type="text"
                    placeholder="CST 302 (Optional)"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase">Subject Name</label>
                  <input
                    id="new-sub-name"
                    type="text"
                    required
                    placeholder="Compiler Design"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase">Category</label>
                  <select
                    id="new-sub-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input bg-slate-900"
                  >
                    <option value="core">Core Course</option>
                    <option value="elective">Elective</option>
                    <option value="lab">Lab / Practical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 uppercase">
                    <span>Target</span>
                    <span className="text-emerald-400 font-bold">{newTarget}%</span>
                  </div>
                  <input
                    id="new-sub-target"
                    type="range"
                    min="70"
                    max="90"
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value))}
                    className="w-full h-1 mt-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Initial hours configuration */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Attendance Setup</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase">Hours Attended</label>
                    <input
                      id="new-sub-hours-attended"
                      type="number"
                      min="0"
                      value={newAttended}
                      onChange={(e) => setNewAttended(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-2 rounded-lg text-xs font-semibold text-white font-mono glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase">Hours Conducted</label>
                    <input
                      id="new-sub-hours-conducted"
                      type="number"
                      min="0"
                      value={newConducted}
                      onChange={(e) => setNewConducted(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-2 rounded-lg text-xs font-semibold text-white font-mono glass-input"
                    />
                  </div>
                </div>
              </div>

              <button
                id="btn-submit-new-subject"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-xs text-black transition-colors cursor-pointer text-center"
              >
                Register Course
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER & SEARCH ROW */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            id="subject-search-input"
            type="text"
            placeholder="Search by subject code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium text-white glass-input transition-all duration-200"
          />
        </div>

        {/* Horizontal Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'core', 'elective', 'lab'] as const).map(cat => (
            <button
              key={cat}
              id={`filter-cat-${cat}`}
              onClick={() => setFilterCategory(cat)}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-medium capitalize select-none cursor-pointer border transition-all duration-300 ${
                filterCategory === cat 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-white/5 text-gray-400 border-white/5 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* DETAILED ROSTER LIST */}
      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/5">
            <BookOpen size={36} className="mx-auto text-gray-500 mb-3" />
            <p className="text-sm font-medium text-gray-400">No subjects matched your criteria.</p>
            <p className="text-xs text-gray-500 mt-1">Try resetting the filters or add a new subject.</p>
          </div>
        ) : (
          filteredSubjects.map((sub) => {
            const pct = calculatePercentage(sub.hoursAttended, sub.hoursConducted);
            const status = getAttendanceStatus(pct, sub.targetPercentage);
            const statusMsg = getStatusMessage(sub);
            const isExpanded = expandedSubId === sub.id;

            return (
              <div
                key={sub.id}
                id={`subject-item-${sub.id}`}
                onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                className={`glass-panel rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                  isExpanded ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-white/5 hover:border-white/15'
                }`}
              >
                {/* Subject Primary Metadata Card */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-1.5">
                        {sub.code && (
                          <span className="text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 py-0.5 px-2 rounded border border-emerald-500/25">
                            {sub.code}
                          </span>
                        )}
                        <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">{sub.category}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white tracking-tight leading-tight truncate">
                        {sub.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-mono">
                        Current: {sub.hoursAttended}/{sub.hoursConducted} Hours Attended
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xl font-display font-bold block ${
                        status === 'safe' ? 'text-emerald-400' : status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {pct}%
                      </span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold block">Attd</span>
                    </div>
                  </div>

                  {/* Plus/Minus Hours Adjusters */}
                  <div 
                    className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Hours Attended adjusters */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Attended:</span>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                          id={`subjects-btn-decrement-attended-${sub.id}`}
                          onClick={(e) => handleAdjustHours(sub.id, 'attended', 'decrement', e)}
                          className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-2 min-w-[24px] text-center select-none">
                          {sub.hoursAttended}
                        </span>
                        <button
                          id={`subjects-btn-increment-attended-${sub.id}`}
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
                          id={`subjects-btn-decrement-conducted-${sub.id}`}
                          onClick={(e) => handleAdjustHours(sub.id, 'conducted', 'decrement', e)}
                          className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold text-white px-2 min-w-[24px] text-center select-none">
                          {sub.hoursConducted}
                        </span>
                        <button
                          id={`subjects-btn-increment-conducted-${sub.id}`}
                          onClick={(e) => handleAdjustHours(sub.id, 'conducted', 'increment', e)}
                          className="w-6 h-6 rounded-md hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all active:scale-90 select-none cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Log & Timeline History */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/5 bg-black/20"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-4 space-y-4">
                        {/* Subtext and delete/edit actions */}
                        <div className="flex items-center justify-between">
                          <div className={`py-1 px-2.5 rounded-lg text-[10px] font-semibold border ${statusMsg.color}`}>
                            {statusMsg.message}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              id={`edit-subject-btn-${sub.id}`}
                              onClick={(e) => handleEditClick(sub, e)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                            >
                              <Edit3 size={12} />
                              Edit Subject
                            </button>
                            <button
                              id={`delete-subject-btn-${sub.id}`}
                              onClick={(e) => handleDeleteSubject(sub.id, e)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                            >
                              <Trash2 size={12} />
                              Remove Subject
                            </button>
                          </div>
                        </div>

                        {/* Logs Timeline */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-widest font-semibold font-mono">
                            <Clock size={11} />
                            <span>Attendance History logs</span>
                          </div>

                          {sub.history.length === 0 ? (
                            <p className="text-[11px] text-gray-500 py-2 italic">
                              No history recorded. Adjust hours above to update totals.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {sub.history.map((record) => (
                                <div
                                  key={record.id}
                                  onClick={() => handleToggleHistoryStatus(sub.id, record.id)}
                                  className="p-2.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between transition-colors cursor-pointer group"
                                  title="Click to cycle status: Present ➔ Absent ➔ Cancelled"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      record.status === 'present' ? 'bg-emerald-400' : record.status === 'absent' ? 'bg-rose-400' : 'bg-gray-500'
                                    }`} />
                                    <span className="text-xs text-gray-300 font-mono">{record.date}</span>
                                    <span className="text-[10px] text-gray-500">({record.hours} hr)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                                      record.status === 'present' 
                                        ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10' 
                                        : record.status === 'absent'
                                        ? 'text-rose-400 bg-rose-500/5 border border-rose-500/10'
                                        : 'text-gray-400 bg-gray-500/5 border border-gray-500/10'
                                    }`}>
                                      {record.status}
                                    </span>
                                    <span className="text-[9px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      Cycle status
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Subject Modal */}
      <EditSubjectModal
        isOpen={editingSubject !== null}
        onClose={() => setEditingSubject(null)}
        subject={editingSubject}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
