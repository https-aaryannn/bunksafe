import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, BookOpen, User, HelpCircle, Activity, X, LogOut, Cloud, Database, Sliders, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_USER, INITIAL_SUBJECTS } from './data';
import { UserProfile, Subject, BunkNote } from './types';
import { Login } from './pages/Login';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Home } from './pages/Home';
import { Subjects } from './pages/Subjects';
import { Analytics as AnalyticsPage } from './pages/Analytics';
import { Analytics } from '@vercel/analytics/react';
import { Notes } from './pages/Notes';
import { Profile } from './pages/Profile';
import { BottomNav } from './components/BottomNav';
import { BunkPlannerModal } from './components/BunkPlannerModal';
import { safeStorage } from './utils/storage';

const GUEST_PROFILE: UserProfile = {
  id: "guest-user-id",
  name: "Guest",
  email: "offline.mode@bunksafe.local",
  branch: "",
  semester: "",
  registerNumber: "",
  targetAttendance: 75,
  avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=guest",
  isGuest: true,
  lastSynced: ""
};

export default function App() {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = safeStorage.getItem('bunksafe_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.name.includes('Adithya')) {
          return GUEST_PROFILE; // Invalidate Adithya session
        }
        return parsed;
      }
    } catch {
      // Ignore
    }
    return GUEST_PROFILE;
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'subjects' | 'analytics' | 'profile' | 'notes'>('home');

  // Load user profile and persist session safely
  useEffect(() => {
    if (user) {
      safeStorage.setItem('bunksafe_user', JSON.stringify(user));
    }
  }, [user]);


  // Load correct subjects based on authenticated user or guest
  useEffect(() => {
    if (user) {
      if (user.id && !user.isGuest && isSupabaseConfigured()) {
        supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error loading subjects from Supabase:', error);
            } else if (data) {
              const mapped: Subject[] = data.map(row => ({
                id: row.id,
                code: row.code || '',
                name: row.name,
                hoursAttended: row.hours_attended,
                hoursConducted: row.hours_conducted,
                targetPercentage: row.target_percentage,
                category: row.category as any,
                history: row.history || [],
                lastUpdated: row.last_updated
              }));
              setSubjects(mapped);
            }
          });
      } else {
        const key = user.isGuest ? 'bunksafe_subjects_guest' : `bunksafe_subjects_user_${user.registerNumber}`;
        try {
          let saved = safeStorage.getItem(key);
          // Fallback to legacy key for guest
          if (!saved && user.isGuest) {
            saved = safeStorage.getItem('bunksafe_subjects');
          }
          if (saved) {
            setSubjects(JSON.parse(saved));
          } else {
            setSubjects([]);
          }
        } catch (err) {
          setSubjects([]);
        }
      }
    } else {
      setSubjects([]);
    }
  }, [user?.registerNumber, user?.isGuest, user?.id]);

  // Save subjects to correct key whenever they change
  useEffect(() => {
    if (user && subjects) {
      const key = user.isGuest ? 'bunksafe_subjects_guest' : `bunksafe_subjects_user_${user.registerNumber}`;
      try {
        safeStorage.setItem(key, JSON.stringify(subjects));
        if (user.isGuest) {
          safeStorage.setItem('bunksafe_subjects', JSON.stringify(subjects));
        }
      } catch (e) {
        console.error("Failed to save subjects to local storage:", e);
      }

      if (user.id && !user.isGuest && isSupabaseConfigured()) {
        const syncSubjects = async () => {
          const { data: dbSubjects, error: fetchError } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', user.id);

          if (fetchError) {
            console.error('Error fetching subjects from Supabase:', fetchError);
            return;
          }

          const dbIds = dbSubjects?.map(s => s.id) || [];
          const currentIds = subjects.map(s => s.id);

          // Find IDs to delete
          const idsToDelete = dbIds.filter(id => !currentIds.includes(id));

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('subjects')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) {
              console.error('Error deleting subjects from Supabase:', deleteError);
            }
          }

          // Upsert current subjects
          if (subjects.length > 0) {
            const upsertData = subjects.map(sub => ({
              id: sub.id,
              user_id: user.id,
              code: sub.code || null,
              name: sub.name,
              hours_attended: sub.hoursAttended,
              hours_conducted: sub.hoursConducted,
              target_percentage: sub.targetPercentage,
              category: sub.category || 'core',
              history: sub.history || [],
              last_updated: new Date().toISOString()
            }));

            const { error: upsertError } = await supabase
              .from('subjects')
              .upsert(upsertData);

            if (upsertError) {
              console.error('Error upserting subjects to Supabase:', upsertError);
            }
          }
        };

        syncSubjects();
      }
    }
  }, [subjects, user?.registerNumber, user?.isGuest, user?.id]);

  const [bunkNotes, setBunkNotes] = useState<BunkNote[]>([]);

  // Load bunk notes based on authenticated user or guest
  useEffect(() => {
    if (user) {
      if (user.isGuest) {
        setBunkNotes([]);
      } else if (user.id && isSupabaseConfigured()) {
        supabase
          .from('bunk_notes')
          .select('*')
          .eq('user_id', user.id)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error loading bunk notes from Supabase:', error);
            } else if (data) {
              const mapped: BunkNote[] = data.map(row => ({
                id: row.id,
                date: row.date,
                subjectId: row.subject_id,
                subjectCode: row.subject_code,
                subjectName: row.subject_name,
                hoursMissed: row.hours_missed,
                reason: row.reason as any,
                details: row.details || ''
              }));
              setBunkNotes(mapped);
            }
          });
      } else {
        const key = `bunksafe_bunk_notes_user_${user.registerNumber}`;
        try {
          const saved = safeStorage.getItem(key);
          if (saved) {
            setBunkNotes(JSON.parse(saved));
          } else {
            setBunkNotes([]);
          }
        } catch {
          setBunkNotes([]);
        }
      }
    } else {
      setBunkNotes([]);
    }
  }, [user?.registerNumber, user?.isGuest, user?.id]);

  // Persist bunk notes whenever they change
  useEffect(() => {
    if (user && !user.isGuest) {
      const key = `bunksafe_bunk_notes_user_${user.registerNumber}`;
      try {
        safeStorage.setItem(key, JSON.stringify(bunkNotes));
      } catch (e) {
        console.error("Failed to save bunk notes to local storage:", e);
      }

      if (user.id && isSupabaseConfigured()) {
        const syncBunkNotes = async () => {
          const { data: dbNotes, error: fetchError } = await supabase
            .from('bunk_notes')
            .select('id')
            .eq('user_id', user.id);

          if (fetchError) {
            console.error('Error fetching bunk notes from Supabase:', fetchError);
            return;
          }

          const dbIds = dbNotes?.map(n => n.id) || [];
          const currentIds = bunkNotes.map(n => n.id);

          // Find notes to delete
          const idsToDelete = dbIds.filter(id => !currentIds.includes(id));

          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('bunk_notes')
              .delete()
              .in('id', idsToDelete);
            if (deleteError) {
              console.error('Error deleting bunk notes from Supabase:', deleteError);
            }
          }

          // Upsert current notes
          if (bunkNotes.length > 0) {
            const upsertData = bunkNotes.map(note => ({
              id: note.id,
              user_id: user.id,
              date: note.date,
              subject_id: note.subjectId,
              subject_code: note.subjectCode || '',
              subject_name: note.subjectName,
              hours_missed: note.hoursMissed,
              reason: note.reason,
              details: note.details || null
            }));

            const { error: upsertError } = await supabase
              .from('bunk_notes')
              .upsert(upsertData);

            if (upsertError) {
              console.error('Error upserting bunk notes to Supabase:', upsertError);
            }
          }
        };

        syncBunkNotes();
      }
    }
  }, [bunkNotes, user?.registerNumber, user?.isGuest, user?.id]);

  const handleAddBunkNote = (newNoteData: Omit<BunkNote, 'id'>) => {
    const newNoteId = `note-${Date.now()}`;
    const newNote: BunkNote = {
      ...newNoteData,
      id: newNoteId
    };

    setBunkNotes(prev => [newNote, ...prev]);

    // Also update the subjects state!
    // Add an 'absent' record of size 'hoursMissed' to the subject's history
    setSubjects(prevSubjects => prevSubjects.map(sub => {
      if (sub.id !== newNoteData.subjectId) return sub;

      const record = {
        id: `h-bunk-${newNoteId}`,
        date: newNoteData.date,
        status: 'absent' as const,
        hours: newNoteData.hoursMissed
      };

      const hoursConducted = sub.hoursConducted + newNoteData.hoursMissed;

      return {
        ...sub,
        hoursConducted,
        lastUpdated: new Date().toISOString(),
        history: [record, ...sub.history]
      };
    }));
  };

  const handleDeleteBunkNote = (noteId: string) => {
    const noteToDelete = bunkNotes.find(n => n.id === noteId);
    if (!noteToDelete) return;

    setBunkNotes(prev => prev.filter(n => n.id !== noteId));

    // Also remove the corresponding 'absent' record from the subject's history!
    setSubjects(prevSubjects => prevSubjects.map(sub => {
      if (sub.id !== noteToDelete.subjectId) return sub;

      const historyRecordId = `h-bunk-${noteId}`;
      const recordExists = sub.history.some(rec => rec.id === historyRecordId);
      if (!recordExists) return sub;

      const history = sub.history.filter(rec => rec.id !== historyRecordId);

      // Recalculate totals based on history logs
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
        lastUpdated: new Date().toISOString(),
        history
      };
    }));
  };

  // Simulator modal states
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorSubjectId, setSimulatorSubjectId] = useState<string | undefined>(undefined);

  const handleOpenSimulator = (subjectId?: string) => {
    setSimulatorSubjectId(subjectId);
    setIsSimulatorOpen(true);
  };

  // Drawer & Auth Overlay States
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authScreenMode, setAuthScreenMode] = useState<'login' | 'register'>('login');

  const handleTriggerAuth = (mode: 'login' | 'register') => {
    setAuthScreenMode(mode);
    setIsProfileDrawerOpen(false);
    setShowAuthScreen(true);
  };

  const handleLogin = async (profile: UserProfile) => {
    // Automatically synchronize local guest data with Supabase if appropriate!
    if (profile.id && !profile.isGuest && isSupabaseConfigured()) {
      try {
        const { data: cloudSubjects, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', profile.id);

        if (error) {
          console.error("Error fetching cloud subjects during sync:", error);
        } else if (cloudSubjects && cloudSubjects.length === 0 && subjects.length > 0) {
          console.log("Cloud has no subjects, but guest mode has subjects. Syncing guest subjects to cloud...");
          const upsertData = subjects.map(sub => ({
            id: sub.id,
            user_id: profile.id,
            code: sub.code || '',
            name: sub.name,
            hours_attended: sub.hoursAttended,
            hours_conducted: sub.hoursConducted,
            target_percentage: sub.targetPercentage,
            category: sub.category,
            history: sub.history,
            last_updated: sub.lastUpdated || new Date().toISOString()
          }));

          const { error: uploadError } = await supabase
            .from('subjects')
            .upsert(upsertData);

          if (uploadError) {
            console.error("Error uploading guest subjects to Supabase:", uploadError);
          } else {
            console.log("Guest subjects synchronized successfully!");
          }
        }
      } catch (err) {
        console.error("Error during guest data sync:", err);
      }
    }

    setUser(profile);
    setActiveTab('home');
    setShowAuthScreen(false);
  };

  const handleLogout = () => {
    setUser(GUEST_PROFILE);
    setActiveTab('home');
    setIsProfileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Premium Top Navigation Header */}
      <header className="sticky top-0 z-30 glass-panel border-b border-white/5 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-md shadow-emerald-500/10 flex items-center justify-center">
            <div className="w-full h-full rounded-[6px] bg-slate-950 flex items-center justify-center">
              <ShieldCheck className="text-emerald-400" size={16} />
            </div>
          </div>
          <h1 className="text-lg font-display font-bold text-white tracking-tight">
            Bunk<span className="text-emerald-400">Safe</span>
          </h1>
        </div>

        {/* Global Quick Tracker HUD */}
        <div 
          onClick={() => setActiveTab('analytics')}
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/5 py-1 px-2.5 rounded-lg text-xs font-mono text-gray-300 font-semibold cursor-pointer transition-colors"
        >
          <Activity size={12} className="text-emerald-400 animate-pulse" />
          <span>KTU Guard Active</span>
        </div>
      </header>

      {/* Main Responsive Layout Frame Container */}
      <main className="flex-1 w-full max-w-lg mx-auto relative px-1">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Home 
                user={user} 
                subjects={subjects} 
                setSubjects={setSubjects}
                setActiveTab={setActiveTab} 
                onOpenSimulator={handleOpenSimulator}
                onOpenProfileDrawer={() => setIsProfileDrawerOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'subjects' && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Subjects 
                subjects={subjects} 
                setSubjects={setSubjects} 
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <AnalyticsPage 
                user={user} 
                subjects={subjects} 
              />
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Notes 
                user={user} 
                subjects={subjects} 
                bunkNotes={bunkNotes}
                onAddBunkNote={handleAddBunkNote}
                onDeleteBunkNote={handleDeleteBunkNote}
                setActiveTab={setActiveTab}
              />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Profile 
                user={user} 
                setUser={setUser} 
                onLogout={handleLogout} 
                onTriggerAuth={handleTriggerAuth}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reusable Bottom Floating Nav Tab Dock */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Bunk Planning Simulator Modal Overlay */}
      <BunkPlannerModal 
        isOpen={isSimulatorOpen} 
        onClose={() => setIsSimulatorOpen(false)} 
        subjects={subjects}
        initialSubjectId={simulatorSubjectId}
      />

      {/* Premium Side Drawer Overlay for Account Management */}
      <AnimatePresence>
        {isProfileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-80 max-w-[85%] bg-slate-900 border-l border-white/10 z-50 flex flex-col justify-between shadow-2xl p-6 text-left"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Profile</span>
                  <button 
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {user.isGuest ? (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-400">
                        <User size={28} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Guest Mode Active</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Your attendance files are currently kept in offline local storage. Sync is disabled.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        onClick={() => handleTriggerAuth('login')}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogIn size={14} />
                        <span>Sign In</span>
                      </button>
                      
                      <button
                        onClick={() => handleTriggerAuth('register')}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <UserPlus size={14} />
                        <span>Register Account</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 text-center">
                      <div className="relative w-16 h-16 mx-auto rounded-full border-2 border-emerald-500/20 p-1">
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name} 
                          className="w-full h-full object-cover rounded-full"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{user.name}</h4>
                        <p className="text-xs text-gray-400">{user.email || 'Synchronized'}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">Academic Info</span>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Branch:</span>
                          <span className="text-white font-medium truncate max-w-[160px]" title={user.branch}>{user.branch || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Semester:</span>
                          <span className="text-white font-medium">{user.semester || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Register No:</span>
                          <span className="text-white font-medium font-mono">{user.registerNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2.5 text-xs text-emerald-400">
                      <Cloud size={14} className="animate-pulse" />
                      <span className="font-medium">Cloud Database Synced</span>
                    </div>
                  </div>
                )}
              </div>

              {!user.isGuest && (
                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full-Screen Authentication Overlay */}
      <AnimatePresence>
        {showAuthScreen && (
          <motion.div
            key="auth-overlay"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto"
          >
            <Login 
              onLogin={handleLogin} 
              initialTab={authScreenMode} 
              onClose={() => setShowAuthScreen(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
