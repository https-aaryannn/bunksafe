import React, { useState } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  BookOpen, 
  Clock, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  Lock, 
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, UserProfile, BunkNote } from '../types';

interface NotesProps {
  user: UserProfile;
  subjects: Subject[];
  bunkNotes: BunkNote[];
  onAddBunkNote: (note: Omit<BunkNote, 'id'>) => void;
  onDeleteBunkNote: (id: string) => void;
  setActiveTab: (tab: 'home' | 'subjects' | 'analytics' | 'profile' | 'notes') => void;
  id?: string;
}

export const Notes: React.FC<NotesProps> = ({
  user,
  subjects,
  bunkNotes,
  onAddBunkNote,
  onDeleteBunkNote,
  setActiveTab,
  id
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursMissed, setHoursMissed] = useState(1);
  const [reason, setReason] = useState<BunkNote['reason']>('Medical Leave');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const presetReasons: BunkNote['reason'][] = [
    'Medical Leave',
    'Family Function',
    'Placement Drive',
    'Competition',
    'Personal',
    'Other'
  ];

  // Guest Protection View
  if (user.isGuest) {
    return (
      <div 
        id={id || "bunk-notes-guest-view"}
        className="pb-32 pt-12 px-4 max-w-lg mx-auto text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-400">
          <Lock size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Bunk Notes Locked</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
            Bunk Notes is a personalized academic repository. Please log in with your permanent credentials to catalog reasons, link classes, and compile chronological absence summaries.
          </p>
        </div>
        <button
          id="btn-guest-login-redirect"
          onClick={() => setActiveTab('profile')}
          className="mx-auto py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-black flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98"
        >
          <span>Configure Profile to Log In</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSubjectId) {
      setFormError('Please select a course.');
      return;
    }

    if (hoursMissed < 1 || hoursMissed > 10) {
      setFormError('Hours missed must be between 1 and 10.');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) {
      setFormError('Selected course not found.');
      return;
    }

    onAddBunkNote({
      date,
      subjectId: selectedSubjectId,
      subjectCode: subject.code,
      subjectName: subject.name,
      hoursMissed,
      reason,
      details: details.trim() || undefined
    });

    // Reset Form
    setSelectedSubjectId('');
    setDate(new Date().toISOString().split('T')[0]);
    setHoursMissed(1);
    setReason('Medical Leave');
    setDetails('');
    setIsAdding(false);
  };

  // Sort notes chronologically (newest first for standard log timeline)
  const sortedNotes = [...bunkNotes].sort((a, b) => b.date.localeCompare(a.date));

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div 
      id={id || "bunk-notes-page-root"}
      className="pb-32 pt-6 space-y-6 px-4 max-w-lg mx-auto"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Bunk Notes</h2>
          <p className="text-xs text-gray-400">Document and verify your academic absences</p>
        </div>
        
        <button
          id="btn-toggle-add-note"
          onClick={() => setIsAdding(!isAdding)}
          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          {isAdding ? 'Cancel' : 'Log a Bunk'}
          {!isAdding && <Plus size={14} />}
        </button>
      </div>

      {/* ADD BUNK NOTE FORM */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">Catalog New Bunk Note</h4>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex gap-2">
                  <Info size={15} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Subject Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Course / Subject</label>
                <select
                  id="note-subject-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input bg-slate-900 border border-white/10 outline-none"
                  required
                >
                  <option value="" disabled>Select course...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Bunk Date</label>
                  <input
                    id="note-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input border border-white/10 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Hours Missed</label>
                  <input
                    id="note-hours-input"
                    type="number"
                    min="1"
                    max="10"
                    value={hoursMissed}
                    onChange={(e) => setHoursMissed(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input border border-white/10 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Reason Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block">Absence Reason</label>
                <div className="grid grid-cols-3 gap-2">
                  {presetReasons.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-semibold text-center border transition-all truncate ${
                        reason === r
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Details */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Additional Details (Optional)</label>
                <textarea
                  id="note-details-input"
                  placeholder="e.g. Doctor appointment, representing college sports, etc."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl text-xs font-medium text-white glass-input border border-white/10 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                id="btn-save-note"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition-colors active:scale-98 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                Save Bunk & Log Absence
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHRONOLOGICAL BUNK TIMELINE HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">Bunk Log Chronology</h4>
          <span className="text-[10px] text-gray-500">{sortedNotes.length} recorded absence{sortedNotes.length !== 1 ? 's' : ''}</span>
        </div>

        {sortedNotes.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl border border-white/5 space-y-3">
            <ClipboardList className="mx-auto text-gray-500" size={24} />
            <div className="space-y-1">
              <p className="text-xs text-gray-300 font-medium">No Bunks Logged Yet</p>
              <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                Click "Log a Bunk" to document why you missed a class. Recorded absences will synchronize directly with course attendance margins.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative border-l border-white/10 ml-3 pl-5 space-y-6">
            {sortedNotes.map((note) => (
              <div 
                key={note.id} 
                id={`bunk-note-${note.id}`}
                className="relative group"
              >
                {/* Timeline Node Icon */}
                <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center" />

                <div className="glass-panel p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors space-y-2 relative">
                  {/* Delete button */}
                  <button
                    id={`btn-delete-note-${note.id}`}
                    onClick={() => {
                      if (confirm('Delete this bunk note? This will also remove the recorded absence from this course.')) {
                        onDeleteBunkNote(note.id);
                      }
                    }}
                    className="absolute top-3.5 right-3.5 p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Note & Revert Absence"
                  >
                    <Trash2 size={13} />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 py-0.5 px-2 rounded-md border border-emerald-500/15">
                      {note.subjectCode}
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(note.date)}
                    </span>
                  </div>

                  <div className="space-y-1 pr-6">
                    <h5 className="text-xs font-bold text-white leading-snug">{note.subjectName}</h5>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                        {note.reason}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium flex items-center gap-0.5">
                        <Clock size={10} />
                        {note.hoursMissed} period{note.hoursMissed > 1 ? 's' : ''} missed
                      </span>
                    </div>
                  </div>

                  {note.details && (
                    <div className="pt-2 border-t border-white/5 flex gap-1.5 items-start">
                      <FileText size={11} className="text-gray-500 mt-0.5" />
                      <p className="text-[10px] text-gray-400 italic leading-relaxed">{note.details}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
