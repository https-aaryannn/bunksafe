import React from 'react';
import { Home, BookOpen, BarChart3, User, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: 'home' | 'subjects' | 'analytics' | 'profile' | 'notes';
  setActiveTab: (tab: 'home' | 'subjects' | 'analytics' | 'profile' | 'notes') => void;
  id?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, id }) => {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'subjects' as const, label: 'Subjects', icon: BookOpen },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'notes' as const, label: 'Notes', icon: ClipboardList },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <div 
      id={id || "bottom-nav-container"}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40"
    >
      <div className="glass-panel py-3 px-4 rounded-3xl flex items-center justify-around shadow-2xl shadow-black/60 relative overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="relative py-2 px-3 flex flex-col items-center gap-1 cursor-pointer select-none outline-none group"
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/20 rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon 
                size={20} 
                className={`transition-colors duration-300 ${
                  isActive 
                    ? 'text-emerald-400' 
                    : 'text-gray-400 group-hover:text-gray-200'
                }`}
              />
              
              <span 
                className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${
                  isActive 
                    ? 'text-emerald-400' 
                    : 'text-gray-400 group-hover:text-gray-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
