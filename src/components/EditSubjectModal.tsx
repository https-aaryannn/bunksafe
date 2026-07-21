import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Clock, BookOpen, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject } from '../types';

interface EditSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSave: (updatedSubject: Subject) => void;
  id?: string;
}

export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  isOpen,
  onClose,
  subject,
  onSave,
  id
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'core' | 'elective' | 'lab'>('core');
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [hoursAttended, setHoursAttended] = useState(0);
  const [hoursConducted, setHoursConducted] = useState(0);
  
  // Validation errors
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subject) {
      setCode(subject.code);
      setName(subject.name);
      setCategory(subject.category || 'core');
      setTargetPercentage(subject.targetPercentage || 75);
      setHoursAttended(subject.hoursAttended);
      setHoursConducted(subject.hoursConducted);
      setError(null);
    }
  }, [subject, isOpen]);

  if (!isOpen || !subject) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Subject name is required.');
      return;
    }
    if (hoursAttended < 0 || hoursConducted < 0) {
      setError('Hours cannot be negative.');
      return;
    }
    if (hoursAttended > hoursConducted) {
      setError('Hours Attended cannot be greater than Hours Conducted.');
      return;
    }

    // Update the subject
    const updatedSubject: Subject = {
      ...subject,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      targetPercentage,
      hoursAttended,
      hoursConducted,
      lastUpdated: new Date().toISOString()
    };

    // If hours were adjusted directly and differ from history, we can optionally append an adjustment log
    const prevTotal = subject.hoursAttended + subject.hoursConducted;
    const newTotal = hoursAttended + hoursConducted;
    if (prevTotal !== newTotal) {
      const adjustmentRecord = {
        id: `h-adjust-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        status: 'present' as const, // placeholder
        hours: 0, // indicates manual overwrite adjustment
        note: 'Manual adjustment'
      };
      // Keep existing history but note that totals are overridden
      updatedSubject.history = [
        {
          id: `h-manual-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          status: 'present',
          hours: hoursAttended // update with basic manual logs if history gets updated
        }
      ];
    }

    onSave(updatedSubject);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        id={id || "edit-subject-modal-overlay"}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      >
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/20 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <Settings className="text-emerald-400" size={18} />
              <div>
                <h3 className="text-lg font-display font-semibold text-white">
                  Edit Course Details
                </h3>
                <p className="text-xs text-gray-400">Modify metadata and current attendance counts</p>
              </div>
            </div>
            <button
              id="close-edit-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Error Message banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 text-xs text-rose-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Code and Name */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Course Code</label>
                <input
                  id="edit-sub-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold text-white glass-input"
                  placeholder="CST 302 (Optional)"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Course Name</label>
                <input
                  id="edit-sub-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold text-white glass-input"
                  placeholder="Compiler Design"
                />
              </div>
            </div>

            {/* Category and Target Percentage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Category</label>
                <select
                  id="edit-sub-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl text-xs font-semibold text-white glass-input bg-slate-900 focus:outline-none"
                >
                  <option value="core">Core Course</option>
                  <option value="elective">Elective</option>
                  <option value="lab">Lab / Practical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                  <span>Target Percentage</span>
                  <span className="text-emerald-400 font-bold">{targetPercentage}%</span>
                </div>
                <input
                  id="edit-sub-target"
                  type="range"
                  min="70"
                  max="90"
                  value={targetPercentage}
                  onChange={(e) => setTargetPercentage(Number(e.target.value))}
                  className="w-full h-1 mt-4.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Attendance Counts manual adjustment */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold uppercase tracking-wider">
                <Clock size={14} className="text-emerald-400" />
                <span>Attendance Log Counts</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Hours Attended</label>
                  <input
                    id="edit-sub-hours-attended"
                    type="number"
                    min="0"
                    required
                    value={hoursAttended}
                    onChange={(e) => setHoursAttended(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 rounded-xl text-sm font-semibold text-white font-mono glass-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Hours Conducted</label>
                  <input
                    id="edit-sub-hours-conducted"
                    type="number"
                    min="0"
                    required
                    value={hoursConducted}
                    onChange={(e) => setHoursConducted(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 rounded-xl text-sm font-semibold text-white font-mono glass-input"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-500 italic leading-tight">
                * Note: Changing attendance counts directly overrides the current hour-by-hour history logs with a new base count.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                id="cancel-edit-btn"
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 font-semibold text-xs text-gray-300 cursor-pointer transition-colors active:scale-98"
              >
                Cancel
              </button>
              <button
                id="submit-edit-btn"
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
