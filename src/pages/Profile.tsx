import React, { useState } from 'react';
import { User, GraduationCap, Sliders, LogOut, Info, BookOpen, HelpCircle, Lock, Database, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProfileProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onLogout: () => void;
  onTriggerAuth?: (tab: 'login' | 'register') => void;
  id?: string;
}

export const Profile: React.FC<ProfileProps> = ({ user, setUser, onLogout, onTriggerAuth, id }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [registerNumber, setRegisterNumber] = useState(user.registerNumber);
  const [targetAttendance, setTargetAttendance] = useState(user.targetAttendance);
  const [tempGuestName, setTempGuestName] = useState(user.name);
  
  const handleSaveGuestName = () => {
    setUser(prev => prev ? {
      ...prev,
      name: tempGuestName || 'Guest Scholar'
    } : null);
  };
  
  // Sync Simulation States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(
    user.lastSynced 
      ? (user.lastSynced.includes('T') ? new Date(user.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : user.lastSynced)
      : 'Never'
  );

  const handleSave = () => {
    setUser(prev => prev ? {
      ...prev,
      registerNumber,
      targetAttendance
    } : null);

    if (user.id && !user.isGuest && isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .update({
          register_number: registerNumber,
          target_attendance: targetAttendance
        })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error updating profile in Supabase:', error);
        });
    }

    setIsEditing(false);
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    
    if (user.id && !user.isGuest && isSupabaseConfigured()) {
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Update profile manual sync timestamp in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            last_synced: now.toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating manual sync in Supabase:', error);
          setSyncStatus('idle');
          return;
        }

        setSyncStatus('synced');
        setLastSyncedTime(timeStr);
        
        setUser(prev => prev ? {
          ...prev,
          lastSynced: now.toISOString()
        } : null);
      } catch (err) {
        console.error('Error during manual sync:', err);
        setSyncStatus('idle');
      }
    } else {
      // Simulate database network handshake and record uploads
      setTimeout(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setSyncStatus('synced');
        setLastSyncedTime(timeStr);
        
        // Update user state to persist the last synced timestamp
        setUser(prev => prev ? {
          ...prev,
          lastSynced: timeStr
        } : null);
      }, 1500);
    }
  };

  const ktuGuidelines = [
    {
      q: "Is 75% attendance strictly mandatory under KTU rules?",
      a: "Yes, KTU (Kerala Technological University) strictly mandates a minimum of 75% attendance in both theory and practical classes to be registered for the end-semester examinations."
    },
    {
      q: "What is 'Condonation' and how does it work?",
      a: "If attendance is between 60% and 74%, students can apply for condonation on medical grounds. This requires submission of authorized medical certificates, approval by the college Principal, and payment of the condonation fee. Condonation can be granted a maximum of twice during an entire B.Tech program."
    },
    {
      q: "What happens if a subject falls below 60% attendance?",
      a: "If your attendance falls below 60% in any course, you will be debarred from writing the exam for that subject and will be required to repeat the course when it is offered next."
    },
    {
      q: "How does KTU database matching work?",
      a: "Your unique KTU Register Number serves as your primary database key. When cloud sync is active, your local attendance records are synced with our secure backend matching your registered academic schema."
    }
  ];

  // 1. GUEST PROTECTED STATE - If user is in Guest Mode, protect the profile page
  if (user.isGuest) {
    return (
      <div 
        id={id || "profile-page-container"}
        className="pb-32 pt-8 px-4 max-w-lg mx-auto space-y-6"
      >
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Protected Area</h2>
          <p className="text-xs text-gray-400">Unlock complete student options</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center space-y-6 relative overflow-hidden">
          {/* Subtle orb background */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <Lock size={30} />
          </div>

          <div className="space-y-2.5">
            <h3 className="text-lg font-display font-bold text-white tracking-tight">Student Profile Locked</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              You are currently viewing BunkSafe as a <strong className="text-emerald-400 font-semibold">Guest Scholar</strong>. Personal profile customization and cloud database sync are protected features reserved for registered students.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-left">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">Guest Name Settings</span>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <User size={13} className="text-emerald-400" />
                Store/Edit Guest Name
              </label>
              <div className="flex gap-2">
                <input
                  id="profile-change-guest-name"
                  type="text"
                  placeholder="Enter custom guest name"
                  value={tempGuestName}
                  onChange={(e) => setTempGuestName(e.target.value)}
                  className="flex-grow px-3 py-2 rounded-xl text-xs font-medium text-white glass-input bg-white/[0.02] focus:outline-none"
                />
                <button
                  id="profile-save-guest-name-btn"
                  onClick={handleSaveGuestName}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Save Name
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 text-left">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">With a registered account, you get:</span>
            <div className="space-y-2">
              <div className="flex gap-2 text-xs text-gray-300">
                <Database size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Centralized Cloud Database Backup & Restore</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-300">
                <Cloud size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Cross-device synchronization using KTU Student ID</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-300">
                <Sliders size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Custom Target Attendance Guard Adjustments</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="guest-unlock-register-btn"
              onClick={() => onTriggerAuth ? onTriggerAuth('login') : onLogout()}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-emerald-500/10 active:scale-98"
            >
              Sign Up or Log In
            </button>
            <p className="text-[10px] text-gray-500 italic">
              * Note: Your current guest attendance logs will be preserved in this browser.
            </p>
          </div>
        </div>

        {/* Guest Syllabus Info Accordion */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-emerald-400" size={16} />
            <h4 className="text-sm font-semibold text-white tracking-tight">KTU Attendance Syllabus Guide</h4>
          </div>

          <div className="space-y-3.5">
            {ktuGuidelines.slice(0, 3).map((item, index) => (
              <div key={index} className="space-y-1">
                <h5 className="text-xs font-semibold text-emerald-400 flex items-start gap-1.5">
                  <span className="font-mono text-[10px] text-emerald-500/80 mt-0.5">0{index + 1}.</span>
                  <span>{item.q}</span>
                </h5>
                <p className="text-[11px] text-gray-400 leading-relaxed pl-5">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. REGISTERED USER VIEW
  return (
    <div 
      id={id || "profile-page-container"}
      className="pb-32 pt-6 space-y-6 px-4 max-w-lg mx-auto"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-white tracking-tight">Student Profile</h2>
        <p className="text-xs text-gray-400">Manage academic metadata & target thresholds</p>
      </div>

      {/* Profile Overview Glass Card */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 p-0.5 overflow-hidden">
            <img 
              src={user.avatarUrl} 
              alt="User Avatar" 
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-lg font-display font-bold text-white tracking-tight">{user.name}</h3>
            <p className="text-xs text-emerald-400 font-medium font-mono">{user.registerNumber}</p>
            <p className="text-[11px] text-gray-400">{user.email}</p>
          </div>
        </div>

        <hr className="border-white/5" />

        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <BookOpen size={13} className="text-emerald-400" />
              Department
            </span>
            <span className="text-white font-medium text-right">
              {user.branch}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Info size={13} className="text-emerald-400" />
              Semester Info
            </span>
            <span className="text-white font-medium">
              {user.semester}
            </span>
          </div>
        </div>
      </div>

      {/* DATABASE CLOUD SYNC SIMULATOR CARD */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="text-emerald-400" size={16} />
            <h4 className="text-sm font-semibold text-white tracking-tight">Database Cloud Sync</h4>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/10">
            KTU Sync Active
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Database Binding Key:</span>
            <span className="font-mono text-emerald-400 font-bold">{user.registerNumber}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Database Engine Schema:</span>
            <span className="text-gray-300">JSON/PostgreSQL Ready</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
            <span className="text-gray-400">Last Database Sync:</span>
            <span className="text-white font-semibold font-mono">{lastSyncedTime}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 leading-normal">
          Designed with an extensible repository pattern. Attendance records and history logs are associated directly with your unique register number, making them fully ready to sync with a secure remote SQL database or Firestore server.
        </p>

        <button
          id="manual-db-sync-btn"
          onClick={handleManualSync}
          disabled={syncStatus === 'syncing'}
          className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
            syncStatus === 'syncing'
              ? 'bg-white/10 text-gray-400'
              : syncStatus === 'synced'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/10'
          }`}
        >
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Syncing to Cloud DB...
            </>
          ) : syncStatus === 'synced' ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-400" />
              Successfully Synced!
            </>
          ) : (
            <>
              <RefreshCw size={13} />
              Sync Attendance to Database
            </>
          )}
        </button>
      </div>

      {/* EDITABLE SETTINGS CARD */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="text-emerald-400" size={16} />
          <h4 className="text-sm font-semibold text-white tracking-tight">Academic Settings</h4>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 uppercase font-semibold">Register Number</label>
              <input
                id="profile-edit-regno"
                type="text"
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium text-white glass-input font-mono"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-gray-400">Target Attendance Threshold</span>
                <span className="font-mono font-semibold text-emerald-400">{targetAttendance}%</span>
              </div>
              <input
                id="profile-edit-target"
                type="range"
                min="70"
                max="90"
                value={targetAttendance}
                onChange={(e) => setTargetAttendance(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                id="btn-save-profile"
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs cursor-pointer transition-colors active:scale-98"
              >
                Save Changes
              </button>
              <button
                id="btn-cancel-profile"
                onClick={() => {
                  setRegisterNumber(user.registerNumber);
                  setTargetAttendance(user.targetAttendance);
                  setIsEditing(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-semibold text-xs cursor-pointer transition-colors active:scale-98"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-400 block">Personal Target Threshold</span>
                <span className="text-lg font-display font-semibold text-white">{user.targetAttendance}%</span>
              </div>
              <button
                id="btn-edit-profile"
                onClick={() => setIsEditing(true)}
                className="py-1.5 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-gray-300 font-medium cursor-pointer transition-colors"
              >
                Modify Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KTU COMPLIANCE AND EDUCATION ACCORDION / GUIDE */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-emerald-400" size={16} />
          <h4 className="text-sm font-semibold text-white tracking-tight">KTU Attendance Syllabus Guide</h4>
        </div>

        <div className="space-y-3.5">
          {ktuGuidelines.map((item, index) => (
            <div key={index} className="space-y-1">
              <h5 className="text-xs font-semibold text-emerald-400 flex items-start gap-1.5">
                <span className="font-mono text-[10px] text-emerald-500/80 mt-0.5">0{index + 1}.</span>
                <span>{item.q}</span>
              </h5>
              <p className="text-[11px] text-gray-400 leading-relaxed pl-5">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Logout Action Button */}
      <button
        id="btn-logout"
        onClick={onLogout}
        className="w-full py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98"
      >
        <LogOut size={14} />
        Log Out of BunkSafe
      </button>
    </div>
  );
};
